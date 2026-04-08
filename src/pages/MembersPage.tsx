import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Users, Plus, Edit2, Trash2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const POSITIONS = ["ゴレイロ", "フィクソ", "右アラ", "左アラ", "ピヴォ"];
const DISPLAY_ROLES = [
  { value: "none", label: "なし" },
  { value: "captain", label: "キャプテン" },
  { value: "vice_captain", label: "副キャプテン" },
  { value: "club_leader", label: "クラブ長" },
];
const SYSTEM_ROLES = [
  { value: "member", label: "一般" },
  { value: "staff", label: "幹部" },
  { value: "captain", label: "主将" },
];

interface Member {
  id: string;
  name: string;
  name_roman: string | null;
  role: string;
  display_role: string | null;
  number: number | null;
  positions: string[] | null;
  photo_url: string | null;
}

// 役職タグのデザイン設定（手書きワイヤーベース）
const displayRoleConfig = {
  captain:      { label: "C",  bg: "bg-amber-400", text: "text-black" },
  vice_captain: { label: "VC", bg: "bg-blue-600",  text: "text-white" },
  club_leader:  { label: "CL", bg: "bg-purple-700", text: "text-white" },
};

// ── メンバーカード（新・2列＆背番号フォントデザイン）──────────────────
const MemberCard = ({
  member, isStaff, onEdit, onDelete,
}: {
  member: Member;
  isStaff: boolean;
  onEdit: (m: Member) => void;
  onDelete: (m: Member) => void;
}) => {
  const drConfig = member.display_role && member.display_role !== "none"
    ? displayRoleConfig[member.display_role as keyof typeof displayRoleConfig]
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative flex items-center gap-4 p-5 rounded-2xl border-2 border-purple-100 bg-white shadow-sm hover:shadow-md transition-all group overflow-hidden h-full"
    >
      {/* 写真 or アバター（左側、役職タグ付き） */}
      <div className="relative flex-shrink-0">
        <div className="relative w-16 h-16 rounded-full bg-purple-50 flex items-center justify-center overflow-hidden border-2 border-purple-200">
          {member.photo_url ? (
            <img src={member.photo_url} alt={member.name} className="w-full h-full object-cover" />
          ) : (
            <span className="text-2xl font-black text-purple-300">
              {member.name.charAt(0)}
            </span>
          )}
        </div>
        {/* 役職バッジ（アバターの左上・手書き風） */}
        {drConfig && (
          <span className={`absolute -top-1.5 -left-1.5 text-[10px] font-black px-1.5 py-0.5 shadow-sm rounded-sm ${drConfig.bg} ${drConfig.text}`}>
            {drConfig.label}
          </span>
        )}
      </div>

      {/* 中央情報エリア */}
      <div className="flex-1 min-w-0 flex flex-col pt-1">
        {/* 名前 */}
        <span className="font-black text-2xl text-gray-900 tracking-tight truncate mb-0.5">
          {member.name}
        </span>
        
        {/* ローマ字 */}
        {member.name_roman && (
          <div className="text-sm font-medium text-gray-500 tracking-wider mb-1">
            {member.name_roman}
          </div>
        )}

        {/* ポジション（シンプルにテキストでかっこよく） */}
        {member.positions && member.positions.length > 0 && (
          <div className="flex flex-wrap gap-1.5 items-center">
            {member.positions.map((p, index) => (
              <div key={p} className="flex items-center">
                <span className="text-xs font-bold text-purple-800">
                  {p}
                </span>
                {index < (member.positions?.length || 0) - 1 && (
                  <span className="mx-1 text-purple-300 font-bold">/</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 背番号（右側・背番号フォントで巨大配置） */}
      {member.number != null && (
        <div className="flex-shrink-0 pl-1">
          <span className="text-[3.5rem] leading-none font-black text-purple-950 tracking-tighter drop-shadow-sm font-sans">
            {member.number}
          </span>
        </div>
      )}

      {/* 操作ボタン（ホバー時に右下に表示） */}
      {isStaff && (
        <div className="absolute bottom-2 right-2 flex gap-1 bg-white rounded-lg p-0.5 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity">
          <Button variant="ghost" size="icon" onClick={() => onEdit(member)} className="h-7 w-7 text-purple-600 hover:text-purple-700 hover:bg-purple-100">
            <Edit2 size={14} />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => onDelete(member)} className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-50">
            <Trash2 size={14} />
          </Button>
        </div>
      )}
    </motion.div>
  );
};

// ── 追加・編集フォーム（新デザイン・紫テーマ適用） ──────────────────────────────
const MemberForm = ({
  initial, onSave, onCancel,
}: {
  initial?: Member;
  onSave: (data: Omit<Member, "id">) => void;
  onCancel: () => void;
}) => {
  const [name, setName] = useState(initial?.name ?? "");
  const [nameRoman, setNameRoman] = useState(initial?.name_roman ?? "");
  const [number, setNumber] = useState(initial?.number?.toString() ?? "");
  const [positions, setPositions] = useState<string[]>(initial?.positions ?? []);
  const [displayRole, setDisplayRole] = useState(initial?.display_role ?? "none");
  const [systemRole, setSystemRole] = useState(initial?.role ?? "member");
  const [photoUrl, setPhotoUrl] = useState(initial?.photo_url ?? "");

  const togglePosition = (p: string) => {
    setPositions((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
    );
  };

  const handleSave = () => {
    if (!name.trim()) return;
    onSave({
      name: name.trim(),
      name_roman: nameRoman.trim() || null,
      number: number ? parseInt(number) : null,
      positions,
      display_role: displayRole,
      role: systemRole,
      photo_url: photoUrl.trim() || null,
    });
  };

  return (
    <div className="p-5 rounded-2xl border-2 border-purple-200 bg-purple-50/70 space-y-4 shadow-sm">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-bold text-purple-900 mb-1 block">名前</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="笹谷 奏太" className="h-10 border-purple-200 focus-visible:ring-purple-500 rounded-lg" />
        </div>
        <div>
          <label className="text-xs font-bold text-purple-900 mb-1 block">背番号</label>
          <Input value={number} onChange={(e) => setNumber(e.target.value)} placeholder="23" type="number" className="h-10 border-purple-200 focus-visible:ring-purple-500 rounded-lg font-bold" />
        </div>
      </div>

      <div>
        <label className="text-xs font-bold text-purple-900 mb-1 block">ローマ字（任意）</label>
        <Input value={nameRoman} onChange={(e) => setNameRoman(e.target.value)} placeholder="Sota Sasaya" className="h-10 border-purple-200 focus-visible:ring-purple-500 rounded-lg tracking-wide" />
      </div>

      <div>
        <label className="text-xs font-bold text-purple-900 mb-1.5 block">ポジション</label>
        <div className="flex flex-wrap gap-1.5">
          {POSITIONS.map((p) => (
            <button
              key={p}
              onClick={() => togglePosition(p)}
              className={`px-3 py-1 rounded-md text-xs font-bold border-2 transition-all ${
                positions.includes(p)
                  ? "bg-purple-600 text-white border-purple-600 shadow-sm"
                  : "border-purple-200 bg-white text-purple-600 hover:bg-purple-100"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-bold text-purple-900 mb-1 block">表示役割</label>
          <select
            value={displayRole}
            onChange={(e) => setDisplayRole(e.target.value)}
            className="w-full h-10 rounded-lg border-2 border-purple-200 bg-white px-3 text-sm font-medium focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
          >
            {DISPLAY_ROLES.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-bold text-purple-900 mb-1 block">システム権限</label>
          <select
            value={systemRole}
            onChange={(e) => setSystemRole(e.target.value)}
            className="w-full h-10 rounded-lg border-2 border-purple-200 bg-white px-3 text-sm font-medium focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
          >
            {SYSTEM_ROLES.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="text-xs font-bold text-purple-900 mb-1 block">写真URL（任意）</label>
        <Input value={photoUrl} onChange={(e) => setPhotoUrl(e.target.value)} placeholder="https://..." className="h-10 border-purple-200 focus-visible:ring-purple-500 rounded-lg" />
      </div>

      <div className="flex gap-3 pt-1.5">
        <Button onClick={handleSave} className="flex-1 h-10 gap-2 bg-purple-600 hover:bg-purple-700 font-bold text-base shadow-sm rounded-lg">
          <Check size={16} />{initial ? "更新する" : "追加する"}
        </Button>
        <Button variant="outline" onClick={onCancel} className="h-10 gap-2 border-2 border-purple-200 text-purple-700 hover:bg-purple-100 font-bold rounded-lg">
          <X size={16} />キャンセル
        </Button>
      </div>
    </div>
  );
};

// ── メインページ ──────────────────────────────────────────
const MembersPage = () => {
  const { isStaff } = useAuth();
  const { toast } = useToast();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);

  const loadMembers = async () => {
    const { data } = await supabase
      .from("members")
      .select("*")
      .order("number", { ascending: true, nullsFirst: false });
    setMembers((data ?? []) as Member[]);
    setLoading(false);
  };

  useEffect(() => { loadMembers(); }, []);

  const handleAdd = async (formData: Omit<Member, "id">) => {
    const { error } = await supabase.from("members").insert(formData);
    if (error) {
      toast({ title: "追加に失敗しました", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "メンバーを追加しました！" });
    setShowForm(false);
    await loadMembers();
  };

  const handleUpdate = async (formData: Omit<Member, "id">) => {
    if (!editingMember) return;
    const { error } = await supabase
      .from("members")
      .update(formData)
      .eq("id", editingMember.id);
    if (error) {
      toast({ title: "更新に失敗しました", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "メンバーを更新しました！" });
    setEditingMember(null);
    await loadMembers();
  };

  const handleDelete = async (member: Member) => {
    if (!confirm(`「${member.name}」を削除しますか？`)) return;
    const { error } = await supabase.from("members").delete().eq("id", member.id);
    if (error) {
      toast({ title: "削除に失敗しました", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "メンバーを削除しました" });
    await loadMembers();
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="w-8 h-8 border-4 border-purple-100 border-t-purple-600 rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="container py-8 sm:py-12 max-w-5xl">
      <div className="flex items-center justify-between mb-8 pb-3 border-b-2 border-purple-100">
        <h1 className="font-display font-black text-3xl sm:text-4xl text-purple-950 flex items-center gap-3.5 tracking-tight drop-shadow-sm">
          <Users size={34} className="text-purple-600" />
          MEMBER
          <span className="text-lg font-bold text-purple-400 ml-1.5 bg-purple-50 px-3 py-0.5 rounded-full border border-purple-100">
            {members.length}
          </span>
        </h1>
        {isStaff && !showForm && !editingMember && (
          <Button onClick={() => setShowForm(true)} className="gap-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold shadow-sm rounded-lg px-5">
            <Plus size={18} />メンバー追加
          </Button>
        )}
      </div>

      {showForm && (
        <div className="mb-6 max-w-2xl mx-auto">
          <MemberForm onSave={handleAdd} onCancel={() => setShowForm(false)} />
        </div>
      )}

      {/* 2列レイアウトに変更 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
        {members.map((member) => (
          <div key={member.id} className="h-full">
            {editingMember?.id === member.id ? (
              <div className="p-1.5 rounded-2xl border-2 border-purple-300 bg-white">
                <MemberForm
                  initial={member}
                  onSave={handleUpdate}
                  onCancel={() => setEditingMember(null)}
                />
              </div>
            ) : (
              <MemberCard
                member={member}
                isStaff={isStaff}
                onEdit={(m) => {
                  setShowForm(false);
                  setEditingMember(m);
                }}
                onDelete={handleDelete}
              />
            )}
          </div>
        ))}
        {members.length === 0 && (
          <div className="md:col-span-2 text-center bg-purple-50 rounded-3xl border-2 border-dashed border-purple-200 py-16 px-6">
            <p className="text-purple-900 font-bold text-lg">まだメンバーが登録されていません</p>
            {isStaff && <p className="text-sm text-purple-600 mt-2.5">右上の「メンバー追加」から登録を開始してください</p>}
          </div>
        )}
      </div>
    </div>
  );
};

export default MembersPage;