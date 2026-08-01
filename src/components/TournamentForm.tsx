import { useState, useEffect } from "react";
import { X, Loader2, Plus, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { OWN_GOAL_NAME, normalizeScore } from "@/lib/matchUtils";

interface TournamentFormProps {
  onClose: () => void;
  onSaved: () => void;
}

type MatchType = "official" | "practice" | "friendly";
type ScorerMode = "member" | "guest" | "own";

interface RowScorer {
  member_name: string;
  is_guest: boolean;
}

interface MatchRow {
  opponent: string;
  scoreUs: string;
  scoreThem: string;
  scorers: RowScorer[];
  // 行ごとの入力状態（保存対象ではない）
  scorerMode: ScorerMode;
  scorerMember: string;
  guestName: string;
}

interface ScheduleOption {
  id: string;
  title: string;
  date: string;
}

const emptyRow = (defaultMember: string): MatchRow => ({
  opponent: "",
  scoreUs: "0",
  scoreThem: "0",
  scorers: [],
  scorerMode: "member",
  scorerMember: defaultMember,
  guestName: "",
});

const MATCH_TYPES: { value: MatchType; label: string }[] = [
  { value: "official", label: "公式戦" },
  { value: "practice", label: "練習試合" },
  { value: "friendly", label: "フレンドリー" },
];

const TournamentForm = ({ onClose, onSaved }: TournamentFormProps) => {
  const { memberName } = useAuth();

  const [matchType, setMatchType] = useState<MatchType>("official");
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [members, setMembers] = useState<string[]>([]);
  const [schedules, setSchedules] = useState<ScheduleOption[]>([]);
  const [rows, setRows] = useState<MatchRow[]>([emptyRow(""), emptyRow("")]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const [{ data: memberData }, { data: scheduleData }] = await Promise.all([
        supabase.from("members").select("name").order("name"),
        supabase
          .from("schedule_events")
          .select("id, title, date")
          .eq("type", "match")
          .order("date", { ascending: false })
          .limit(20),
      ]);

      const names = (memberData ?? []).map((m: any) => m.name as string);
      setMembers(names);
      setSchedules((scheduleData ?? []) as ScheduleOption[]);
      if (names.length > 0) {
        // 既に開いている行のセレクト初期値を埋める
        setRows((prev) => prev.map((r) => (r.scorerMember ? r : { ...r, scorerMember: names[0] })));
      }
    };
    load();
  }, []);

  const updateRow = (i: number, patch: Partial<MatchRow>) =>
    setRows((prev) => prev.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  const addScorer = (i: number) => {
    const row = rows[i];
    const name =
      row.scorerMode === "own" ? OWN_GOAL_NAME :
      row.scorerMode === "guest" ? row.guestName.trim() :
      row.scorerMember;
    if (!name) return;
    updateRow(i, {
      scorers: [...row.scorers, { member_name: name, is_guest: row.scorerMode === "guest" }],
      guestName: row.scorerMode === "guest" ? "" : row.guestName,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date) {
      setError("日付を入力してください");
      return;
    }
    const valid = rows.filter((r) => r.opponent.trim() !== "");
    if (valid.length === 0) {
      setError("対戦相手を1つ以上入力してください");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const num = (v: string) => Number(v) || 0;

      // 大会内の各試合は独立した match_results として保存する
      for (const row of valid) {
        const { data: created, error: insertError } = await supabase
          .from("match_results")
          .insert({
            title: title.trim() || null,
            match_type: matchType,
            opponent: row.opponent.trim(),
            match_date: date,
            score_us: num(row.scoreUs),
            score_them: num(row.scoreThem),
            created_by: memberName,
          })
          .select()
          .single();
        if (insertError) throw insertError;

        if (row.scorers.length > 0) {
          const { error: scorerError } = await supabase.from("match_scorers").insert(
            row.scorers.map((s, idx) => ({
              match_id: created!.id,
              member_name: s.member_name,
              type: "goal",
              display_order: idx,
              set_number: null,
            }))
          );
          if (scorerError) throw scorerError;
        }
      }

      onSaved();
    } catch (err: any) {
      setError(err.message || "保存に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "w-full min-w-0 px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50";

  const validCount = rows.filter((r) => r.opponent.trim() !== "").length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative w-full max-w-lg bg-card rounded-2xl shadow-2xl border border-border flex flex-col max-h-[90vh]"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 bg-muted/50 hover:bg-muted rounded-full text-muted-foreground z-10 transition-colors"
        >
          <X size={20} />
        </button>

        <div className="p-6 sm:p-8 overflow-y-auto">
          <h2 className="text-xl font-bold text-foreground mb-1">大会をまとめて追加</h2>
          <p className="text-xs text-muted-foreground mb-6">
            1日に相手の違う試合が複数あるとき用。試合ごとに結果が登録されます。
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 日程から選んで大会名・日付を埋める */}
            {schedules.length > 0 && (
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">日程から選ぶ（任意）</label>
                <select
                  value=""
                  onChange={(e) => {
                    const s = schedules.find((x) => x.id === e.target.value);
                    if (!s) return;
                    setTitle(s.title.trim());
                    setDate(s.date);
                  }}
                  className={inputClass}
                >
                  <option value="">日程を選んで自動入力...</option>
                  {schedules.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.date.replace(/-/g, "/")} {s.title.trim()}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">試合種別 *</label>
              <div className="flex rounded-lg border border-border overflow-hidden w-fit">
                {MATCH_TYPES.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setMatchType(t.value)}
                    className={`px-3 py-2 text-xs font-semibold transition-colors ${
                      matchType === t.value ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">大会名</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="例: 第26回東京都フットサルチャレンジU-18"
                className={inputClass}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">日付 *</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required className={inputClass} />
            </div>

            {/* 試合行 */}
            <div className="pt-2">
              <label className="text-sm font-medium text-foreground mb-2 block">試合</label>
              <div className="space-y-3">
                {rows.map((row, i) => (
                  <div key={i} className="rounded-xl border border-border bg-muted/20 p-3 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-muted-foreground">第{i + 1}試合</span>
                      {rows.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setRows((prev) => prev.filter((_, j) => j !== i))}
                          className="p-1 text-muted-foreground hover:text-red-500 transition-colors"
                          title="この試合を削除"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>

                    <input
                      type="text"
                      value={row.opponent}
                      onChange={(e) => updateRow(i, { opponent: e.target.value })}
                      placeholder="対戦相手（例: 正則学園）"
                      className={inputClass}
                    />

                    <div className="grid grid-cols-[1fr_1.5rem_1fr] gap-1 items-center">
                      <input
                        type="text"
                        inputMode="numeric"
                        value={row.scoreUs}
                        onChange={(e) => updateRow(i, { scoreUs: normalizeScore(e.target.value) })}
                        onFocus={(e) => e.target.select()}
                        className={inputClass}
                      />
                      <span className="text-center text-muted-foreground text-sm">-</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={row.scoreThem}
                        onChange={(e) => updateRow(i, { scoreThem: normalizeScore(e.target.value) })}
                        onFocus={(e) => e.target.select()}
                        className={inputClass}
                      />
                    </div>

                    {/* 得点者 */}
                    <div className="flex rounded-lg border border-border overflow-hidden w-fit">
                      {([
                        { value: "member", label: "部員" },
                        { value: "guest", label: "助っ人" },
                        { value: "own", label: "オウンゴール" },
                      ] as const).map((m) => (
                        <button
                          key={m.value}
                          type="button"
                          onClick={() => updateRow(i, { scorerMode: m.value, guestName: "" })}
                          className={`px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                            row.scorerMode === m.value ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {m.label}
                        </button>
                      ))}
                    </div>

                    <div className="flex gap-2">
                      {row.scorerMode === "guest" ? (
                        <input
                          type="text"
                          value={row.guestName}
                          onChange={(e) => updateRow(i, { guestName: e.target.value })}
                          placeholder="名前を入力"
                          className={`flex-1 ${inputClass}`}
                        />
                      ) : row.scorerMode === "own" ? (
                        <div className={`flex-1 ${inputClass} text-muted-foreground`}>相手のオウンゴール</div>
                      ) : (
                        <select
                          value={row.scorerMember}
                          onChange={(e) => updateRow(i, { scorerMember: e.target.value })}
                          className={`flex-1 ${inputClass}`}
                        >
                          {members.map((m) => (
                            <option key={m} value={m}>{m}</option>
                          ))}
                        </select>
                      )}
                      <button
                        type="button"
                        onClick={() => addScorer(i)}
                        className="px-3 py-2 rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors shrink-0"
                        title="得点者を追加"
                      >
                        <Plus size={14} />
                      </button>
                    </div>

                    {row.scorers.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {row.scorers.map((s, si) => (
                          <span
                            key={si}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-muted text-xs text-foreground"
                          >
                            {s.member_name === OWN_GOAL_NAME ? "🥅" : "⚽"} {s.member_name}
                            <button
                              type="button"
                              onClick={() => updateRow(i, { scorers: row.scorers.filter((_, j) => j !== si) })}
                              className="text-muted-foreground hover:text-red-500 transition-colors"
                            >
                              <X size={11} />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setRows((prev) => [...prev, emptyRow(members[0] ?? "")])}
                className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors font-semibold mt-3"
              >
                <Plus size={12} /> 試合を追加
              </button>
            </div>

            {error && (
              <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 size={16} className="animate-spin" />}
              {loading ? "保存中..." : `${validCount}試合を保存する`}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
};

export default TournamentForm;
