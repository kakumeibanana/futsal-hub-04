import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Users, Plus, Edit2, Trash2, Check, X, Crown, Shield, Star } from "lucide-react";
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
  role: string;
  display_role: string | null;
  number: number | null;
  positions: string[] | null;
  photo_url: string | null;
}

const displayRoleConfig = {
  captain:      { icon: Crown,  label: "C",  className: "text-yellow-500" },
  vice_captain: { icon: Shield, label: "VC", className: "text-blue-500" },
  club_leader:  { icon: Star,   label: "CL", className: "text-purple-500" },
};

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
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card"
    >
      {/* 写真 or アバター */}
      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
        {member.photo_url ? (
          <img src={member.photo_url} alt={member.name} className="w-full h-full object-cover" />
        ) : (
          <span className="text-lg font-bold text-muted-foreground">
            {member.name.charAt(0)}
          </span>
        )}
      </div>

      {/* 情報 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          {drConfig && (
            <drConfig.icon size={14} className={drConfig.className} />
          )}
          <span className="font-semibold text-foreground truncate">{member.name}</span>
          {member.number != null && (
            <span className="text-xs text-muted-foreground">#{member.number}</span>
          )}
        </div>
        {member.positions && member.positions.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {member.positions.map((p) => (
              <span key={p} className="text-xs px-1.5 py-0.5 rounded-md bg-primary/10 text-primary font-medium">
                {p}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* 操作 */}
      {isStaff && (
        <div className="flex gap-1 flex-shrink-0">
          <Button variant="ghost" size="icon" onClick={() => onEdit(member)} className="h-8 w-8">
            <Edit2 size={14} />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => onDelete(member)} className="h-8 w-8 text-destructive hover:text-destructive">
            <Trash2 size={14} />
          </Button>
        </div>
      )}
    </motion.div>
  );
};

const MemberForm = ({
  initial, onSave, onCancel,
}: {
  initial?: Member;
  onSave: (data: Omit<Member, "id">) => void;
  onCancel: () => void;
}) => {
  const [name, setName] = useState(initial?.name ?? "");
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
      number: number ? parseInt(number) : null,
      positions,
      display_role: displayRole,
      role: systemRole,
      photo_url: photoUrl.trim() || null,
    });
  };

  return (
    <div className="p-4 rounded-xl border border-primary/30 bg-primary/5 space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">名前</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="山田太郎" className="h-9" />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">背番号</label>
          <Input value={number} onChange={(e) => setNumber(e.target.value)} placeholder="10" type="number" className="h-9" />
        </div>
      </div>

      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">ポジション</label>
        <div className="flex flex-wrap gap-1.5">
          {POSITIONS.map((p) => (
            <button
              key={p}
              onClick={() => togglePosition(p)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
                positions.includes(p)
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border bg-card text-muted-foreground hover:bg-muted"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">表示役割</label>
          <select
            value={displayRole}
            onChange={(e) => setDisplayRole(e.target.value)}
            className="w-full h-9 rounded-md border border-border bg-card px-2 text-sm text-foreground"
          >
            {DISPLAY_ROLES.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">システム権限</label>
          <select
            value={systemRole}
            onChange={(e) => setSystemRole(e.target.value)}
            className="w-full h-9 rounded-md border border-border bg-card px-2 text-sm text-foreground"
          >
            {SYSTEM_ROLES.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1 block">写真URL（任意）</label>
        <Input value={photoUrl} onChange={(e) => setPhotoUrl(e.target.value)} placeholder="https://..." className="h-9" />
      </div>

      <div className="flex gap-2">
        <Button onClick={handleSave} className="flex-1 h-9 gap-1.5">
          <Check size={14} />{initial ? "更新" : "追加"}
        </Button>
        <Button variant="outline" onClick={onCancel} className="h-9 gap-1.5">
          <X size={14} />キャンセル
        </Button>
      </div>
    </div>
  );
};

const MembersPage = () => {
  const { isStaff } = useAuth();
  const { toast } = useToast();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);

  const loadMembers = async () => {
    const { data } = await supabase.from("members").select("*").order("number", { ascending: true, nullsFirst: false });
    setMembers((data ?? []) as Member[]);
    setLoading(false);
  };

  useEffect(() => { loadMembers(); }, []);

  const handleAdd = async (data: Omit<Member, "id">) => {
    const { error } = await supabase.from("members").insert(data);
    if (error) { toast({ title: "追加に失敗しました", variant: "destructive" }); return; }
    toast({ title: "メンバーを追加しました！" });
    setShowForm(false);
    loadMembers();
  };

  const handleUpdate = async (data: Omit<Member, "id">) => {
    if (!editingMember) return;
    const { error } = await supabase.from("members").update(data).eq("id", editingMember.id);
    if (error) { toast({ title: "更新に失敗しました", variant: "destructive" }); return; }
    toast({ title: "メンバーを更新しました！" });
    setEditingMember(null);
    loadMembers();
  };

  const handleDelete = async (member: Member) => {
    if (!confirm(`「${member.name}」を削除しますか？`)) return;
    await supabase.from("members").delete().eq("id", member.id);
    toast({ title: "メンバーを削除しました" });
    loadMembers();
  };

  if (loading) return <div className="text-center py-16 text-muted-foreground">読み込み中...</div>;

  return (
    <div className="container py-8 sm:py-10 max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display font-bold text-2xl sm:text-3xl text-foreground flex items-center gap-2">
          <Users size={28} className="text-primary" />
          メンバー
        </h1>
        {isStaff && !showForm && !editingMember && (
          <Button onClick={() => setShowForm(true)} className="gap-2">
            <Plus size={16} />追加
          </Button>
        )}
      </div>

      {/* 追加フォーム */}
      {showForm && (
        <div className="mb-4">
          <MemberForm onSave={handleAdd} onCancel={() => setShowForm(false)} />
        </div>
      )}

      <div className="space-y-3">
        {members.map((member) => (
          <div key={member.id}>
            {editingMember?.id === member.id ? (
              <MemberForm
                initial={member}
                onSave={handleUpdate}
                onCancel={() => setEditingMember(null)}
              />
            ) : (
              <MemberCard
                member={member}
                isStaff={isStaff}
                onEdit={setEditingMember}
                onDelete={handleDelete}
              />
            )}
          </div>
        ))}
        {members.length === 0 && (
          <div className="text-center text-muted-foreground py-16">
            まだメンバーがいません
            {isStaff && <p className="text-sm mt-2">「追加」からメンバーを登録してください</p>}
          </div>
        )}
      </div>
    </div>
  );
};

export default MembersPage;