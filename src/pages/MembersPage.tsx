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
  { value: "captain", label: "主将" },
  { value: "vice_captain", label: "副主将" },
  { value: "club_leader", label: "クラブ長" },
  { value: "treasurer", label: "会計" },
  { value: "ex_captain", label: "元主将" },
  { value: "ex_vice_captain", label: "元副主将" },
  { value: "ex_club_leader", label: "元クラブ長" },
  { value: "ex_treasurer", label: "元会計" },
  { value: "advisor", label: "顧問" },
  { value: "manager", label: "監督" },
  { value: "coach", label: "コーチ" },
  { value: "gk_coach", label: "ゴレイロコーチ" },
];

const DISPLAY_ROLE_ORDER = ["advisor", "manager", "coach", "gk_coach", "captain", "vice_captain", "club_leader", "treasurer", "ex_captain", "ex_vice_captain", "ex_club_leader", "ex_treasurer", "none"];
const POSITION_ORDER = ["ピヴォ", "右アラ", "左アラ", "フィクソ", "ゴレイロ"];

const sortMembers = (list: Member[]) =>
  [...list].sort((a, b) => {
    const aRole = a.display_roles?.[0] ?? "none";
    const bRole = b.display_roles?.[0] ?? "none";
    const aRoleIdx = DISPLAY_ROLE_ORDER.indexOf(aRole);
    const bRoleIdx = DISPLAY_ROLE_ORDER.indexOf(bRole);
    const aIdx = aRoleIdx === -1 ? 999 : aRoleIdx;
    const bIdx = bRoleIdx === -1 ? 999 : bRoleIdx;
    if (aIdx !== bIdx) return aIdx - bIdx;

    const gradeOrder = ["2", "1"];
    const aGradeIdx = gradeOrder.indexOf(a.grade ?? "");
    const bGradeIdx = gradeOrder.indexOf(b.grade ?? "");
    const aG = aGradeIdx === -1 ? 999 : aGradeIdx;
    const bG = bGradeIdx === -1 ? 999 : bGradeIdx;
    if (aG !== bG) return aG - bG;

    const aBestPos = Math.min(...(a.positions ?? []).map((p) => {
      const i = POSITION_ORDER.indexOf(p);
      return i === -1 ? 999 : i;
    }).concat(999));
    const bBestPos = Math.min(...(b.positions ?? []).map((p) => {
      const i = POSITION_ORDER.indexOf(p);
      return i === -1 ? 999 : i;
    }).concat(999));
    return aBestPos - bBestPos;
  });
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
  display_roles: string[];
  number: number | null;
  positions: string[] | null;
  photo_url: string | null;
  grade: string | null;
}

const displayRoleConfig: Record<string, { label: string; bg: string; text: string }> = {
  captain:         { label: "C",    bg: "bg-amber-400",   text: "text-black" },
  vice_captain:    { label: "VC",   bg: "bg-blue-600",    text: "text-white" },
  club_leader:     { label: "CL",   bg: "bg-purple-700",  text: "text-white" },
  treasurer:       { label: "AC",   bg: "bg-green-600",   text: "text-white" },
  ex_captain:      { label: "元C",    bg: "bg-amber-100",   text: "text-amber-700" },
  ex_vice_captain: { label: "元VC",   bg: "bg-blue-100",    text: "text-blue-700" },
  ex_club_leader:  { label: "元CL",   bg: "bg-purple-200",  text: "text-purple-800" },
  ex_treasurer:    { label: "元AC",   bg: "bg-green-100",   text: "text-green-700" },
  advisor:         { label: "顧問",   bg: "bg-slate-700",   text: "text-white" },
  manager:         { label: "監督",   bg: "bg-slate-600",   text: "text-white" },
  coach:           { label: "コーチ", bg: "bg-slate-500",   text: "text-white" },
  gk_coach:        { label: "GKコーチ", bg: "bg-slate-400", text: "text-white" },
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
  const roleConfigs = (member.display_roles ?? []).map((r) => displayRoleConfig[r]).filter(Boolean);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative flex items-center gap-4 p-5 rounded-2xl border-2 border-purple-100 bg-white shadow-sm hover:shadow-md transition-all group overflow-hidden h-full"
    >
      {/* 写真 or アバター */}
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
      </div>

      {/* 中央情報エリア */}
      <div className="flex-1 min-w-0 flex flex-col pt-1">
        {/* 名前 + 学年バッジ */}
        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
          <span className="font-black text-2xl text-gray-900 tracking-tight truncate">
            {member.name}
          </span>
          {member.grade === "2" && (
            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-purple-600 text-white flex-shrink-0">
              2年
            </span>
          )}
          {member.grade === "1" && (
            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-violet-100 text-violet-600 border border-violet-200 flex-shrink-0">
              1年
            </span>
          )}
        </div>
        {/* 役職バッジ（複数） */}
        {roleConfigs.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-1">
            {roleConfigs.map((cfg, i) => (
              <span key={i} className={`text-[10px] font-black px-1.5 py-0.5 shadow-sm rounded-sm ${cfg.bg} ${cfg.text}`}>
                {cfg.label}
              </span>
            ))}
          </div>
        )}

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
          <span className="text-[2.5rem] sm:text-[3.5rem] leading-none font-black text-purple-950 tracking-tighter drop-shadow-sm font-sans">
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
  const [displayRoles, setDisplayRoles] = useState<string[]>(initial?.display_roles ?? []);
  const [systemRole, setSystemRole] = useState(initial?.role ?? "member");
  const [photoUrl, setPhotoUrl] = useState(initial?.photo_url ?? "");
  const [grade, setGrade] = useState(initial?.grade ?? "");

  const togglePosition = (p: string) => {
    setPositions((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
    );
  };

  const toggleDisplayRole = (r: string) => {
    setDisplayRoles((prev) =>
      prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]
    );
  };

  const handleSave = () => {
    if (!name.trim()) return;
    onSave({
      name: name.trim(),
      name_roman: nameRoman.trim() || null,
      number: number ? parseInt(number) : null,
      positions,
      display_roles: displayRoles,
      role: systemRole,
      photo_url: photoUrl.trim() || null,
      grade: grade || null,
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
          <label className="text-xs font-bold text-purple-900 mb-1 block">背番号 <span className="font-normal text-purple-400">（任意）</span></label>
          <Input value={number} onChange={(e) => setNumber(e.target.value)} placeholder="23" type="number" className="h-10 border-purple-200 focus-visible:ring-purple-500 rounded-lg font-bold" />
        </div>
      </div>

      <div>
        <label className="text-xs font-bold text-purple-900 mb-1 block">ローマ字（任意）</label>
        <Input value={nameRoman} onChange={(e) => setNameRoman(e.target.value)} placeholder="Sota Sasaya" className="h-10 border-purple-200 focus-visible:ring-purple-500 rounded-lg tracking-wide" />
      </div>

      <div>
        <label className="text-xs font-bold text-purple-900 mb-1.5 block">ポジション <span className="font-normal text-purple-400">（任意）</span></label>
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

      <div>
        <label className="text-xs font-bold text-purple-900 mb-1.5 block">学年</label>
        <div className="flex gap-2">
          {[
            { value: "", label: "未設定" },
            { value: "2", label: "2年生" },
            { value: "1", label: "1年生" },
            { value: "3", label: "3年（引退）" },
            { value: "staff", label: "スタッフ" },
          ].map((g) => (
            <button
              key={g.value}
              type="button"
              onClick={() => setGrade(g.value)}
              className={`px-4 py-1.5 rounded-md text-xs font-bold border-2 transition-all ${
                grade === g.value
                  ? g.value === "2"
                    ? "bg-purple-600 text-white border-purple-600 shadow-sm"
                    : g.value === "1"
                    ? "bg-violet-100 text-violet-600 border-violet-400"
                    : g.value === "3"
                    ? "bg-gray-400 text-white border-gray-400"
                    : g.value === "staff"
                    ? "bg-slate-700 text-white border-slate-700 shadow-sm"
                    : "bg-gray-200 text-gray-600 border-gray-300"
                  : "border-purple-200 bg-white text-purple-600 hover:bg-purple-50"
              }`}
            >
              {g.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-xs font-bold text-purple-900 mb-1.5 block">表示役割 <span className="font-normal text-purple-400">（複数選択可）</span></label>
        <div className="flex flex-wrap gap-1.5">
          {DISPLAY_ROLES.map((r) => (
            <button
              key={r.value}
              type="button"
              onClick={() => toggleDisplayRole(r.value)}
              className={`px-3 py-1 rounded-md text-xs font-bold border-2 transition-all ${
                displayRoles.includes(r.value)
                  ? "bg-purple-600 text-white border-purple-600 shadow-sm"
                  : "border-purple-200 bg-white text-purple-600 hover:bg-purple-100"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
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
  const [activeMembers, setActiveMembers] = useState<Member[]>([]);
  const [retiredMembers, setRetiredMembers] = useState<Member[]>([]);
  const [staffMembers, setStaffMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);

  const loadMembers = async () => {
    const { data } = await supabase.from("members").select("*").eq("hidden", false);
    const visible = (data ?? []).filter((m: any) => !m.hidden) as Member[];
    setActiveMembers(sortMembers(visible.filter((m) => m.grade !== "3" && m.grade !== "staff")));
    setRetiredMembers(sortMembers(visible.filter((m) => m.grade === "3")));
    setStaffMembers(sortMembers(visible.filter((m) => m.grade === "staff")));
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
        <h1 className="font-display font-black text-2xl sm:text-4xl text-purple-950 flex items-center gap-2 sm:gap-3.5 tracking-tight drop-shadow-sm min-w-0">
          <Users size={26} className="text-purple-600 flex-shrink-0 sm:hidden" />
          <Users size={34} className="text-purple-600 flex-shrink-0 hidden sm:block" />
          MEMBER
          <span className="text-base sm:text-lg font-bold text-purple-400 ml-1 sm:ml-1.5 bg-purple-50 px-2 sm:px-3 py-0.5 rounded-full border border-purple-100 flex-shrink-0">
            {activeMembers.length}
          </span>
        </h1>
        {isStaff && !showForm && !editingMember && (
          <Button onClick={() => setShowForm(true)} className="hidden sm:flex gap-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold shadow-sm rounded-lg px-5">
            <Plus size={18} />メンバー追加
          </Button>
        )}
      </div>

      {showForm && (
        <div className="mb-6 max-w-2xl mx-auto">
          <MemberForm onSave={handleAdd} onCancel={() => setShowForm(false)} />
        </div>
      )}

      {/* モバイル用FAB */}
      {isStaff && !showForm && !editingMember && (
        <button
          onClick={() => setShowForm(true)}
          className="fixed bottom-6 right-6 z-40 sm:hidden w-14 h-14 rounded-full bg-purple-600 shadow-lg shadow-purple-200 flex items-center justify-center text-white active:scale-95 transition-transform"
        >
          <Plus size={24} />
        </button>
      )}

      {/* 現役部員 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
        {activeMembers.map((member) => (
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
                onEdit={(m) => { setShowForm(false); setEditingMember(m); }}
                onDelete={handleDelete}
              />
            )}
          </div>
        ))}
        {activeMembers.length === 0 && (
          <div className="md:col-span-2 text-center bg-purple-50 rounded-3xl border-2 border-dashed border-purple-200 py-16 px-6">
            <p className="text-purple-900 font-bold text-lg">まだメンバーが登録されていません</p>
            {isStaff && <p className="text-sm text-purple-600 mt-2.5">右上の「メンバー追加」から登録を開始してください</p>}
          </div>
        )}
      </div>

      {/* スタッフセクション */}
      {staffMembers.length > 0 && (
        <div className="mt-10">
          <div className="flex items-center gap-3 mb-5 pb-2 border-b-2 border-slate-200">
            <h2 className="font-black text-lg text-slate-600 tracking-tight">スタッフ</h2>
            <span className="text-sm font-bold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200">
              {staffMembers.length}
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
            {staffMembers.map((member) => (
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
                    onEdit={(m) => { setShowForm(false); setEditingMember(m); }}
                    onDelete={handleDelete}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 引退部員セクション */}
      {retiredMembers.length > 0 && (
        <div className="mt-10">
          <div className="flex items-center gap-3 mb-5 pb-2 border-b-2 border-gray-100">
            <h2 className="font-black text-lg text-gray-500 tracking-tight">引退部員</h2>
            <span className="text-sm font-bold text-gray-400 bg-gray-100 px-2.5 py-0.5 rounded-full border border-gray-200">
              {retiredMembers.length}
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5 opacity-70">
            {retiredMembers.map((member) => (
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
                    onEdit={(m) => { setShowForm(false); setEditingMember(m); }}
                    onDelete={handleDelete}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default MembersPage;