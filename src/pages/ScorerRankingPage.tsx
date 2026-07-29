import { useState, useEffect } from "react";
import { Trophy, Loader2, Medal } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";

// 相手のオウンゴールは選手ではないのでランキングから除外する
const OWN_GOAL_NAME = "オウンゴール";

type MatchType = "official" | "practice" | "friendly";
type Filter = "all" | "official" | "practice" | "friendly";

interface ScorerRow {
  member_name: string;
  goals: number;
  rank: number;
}

interface MemberInfo {
  name: string;
  grade: string | null;
  photo_url: string | null;
  number: number | null;
}

const filterOptions: { value: Filter; label: string }[] = [
  { value: "all", label: "すべて" },
  { value: "official", label: "公式戦" },
  { value: "practice", label: "練習試合" },
  { value: "friendly", label: "フレンドリー" },
];

// members.grade は "1" / "2" / "3" / "staff" / "alumni" が入る
const formatGrade = (grade: string | null): string | null => {
  if (!grade) return null;
  if (["1", "2", "3"].includes(grade)) return `${grade}年`;
  if (grade === "alumni") return "OB";
  return null; // staff などは表示しない
};

// 同じ得点数は同順位にする（例: 1位,1位,3位）
function buildRanking(counts: Record<string, number>): ScorerRow[] {
  const sorted = Object.entries(counts)
    .map(([member_name, goals]) => ({ member_name, goals }))
    .sort((a, b) => b.goals - a.goals || a.member_name.localeCompare(b.member_name, "ja"));

  let rank = 0;
  let prevGoals: number | null = null;
  return sorted.map((row, i) => {
    if (prevGoals === null || row.goals < prevGoals) {
      rank = i + 1;
      prevGoals = row.goals;
    }
    return { ...row, rank };
  });
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <Medal size={20} className="text-yellow-500" />;
  if (rank === 2) return <Medal size={20} className="text-gray-400" />;
  if (rank === 3) return <Medal size={20} className="text-amber-700" />;
  return <span className="text-sm font-bold text-muted-foreground">{rank}</span>;
}

const ScorerRankingPage = () => {
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [scorers, setScorers] = useState<{ member_name: string; match_type: MatchType }[]>([]);
  const [members, setMembers] = useState<Record<string, MemberInfo>>({});
  const [ownGoals, setOwnGoals] = useState<{ match_type: MatchType }[]>([]);

  useEffect(() => {
    const load = async () => {
      // 得点者とその試合の種別を突き合わせる
      const [{ data: scorerData }, { data: matchData }, { data: memberData }] = await Promise.all([
        supabase.from("match_scorers").select("member_name, type, match_id"),
        supabase.from("match_results").select("id, match_type"),
        supabase.from("members").select("name, grade, photo_url, number"),
      ]);

      const typeById = new Map<string, MatchType>(
        (matchData ?? []).map((m: any) => [m.id, (m.match_type ?? "official") as MatchType])
      );

      const rows = (scorerData ?? [])
        .filter((s: any) => s.type === "goal")
        .map((s: any) => ({
          member_name: s.member_name as string,
          match_type: typeById.get(s.match_id) ?? ("official" as MatchType),
        }));

      setScorers(rows.filter((r) => r.member_name !== OWN_GOAL_NAME));
      setOwnGoals(rows.filter((r) => r.member_name === OWN_GOAL_NAME).map((r) => ({ match_type: r.match_type })));

      const memberMap: Record<string, MemberInfo> = {};
      for (const m of (memberData ?? []) as any[]) {
        memberMap[m.name] = { name: m.name, grade: m.grade, photo_url: m.photo_url, number: m.number };
      }
      setMembers(memberMap);
      setLoading(false);
    };
    load();
  }, []);

  const matchesFilter = (t: MatchType) => filter === "all" || t === filter;

  const counts: Record<string, number> = {};
  for (const s of scorers) {
    if (!matchesFilter(s.match_type)) continue;
    counts[s.member_name] = (counts[s.member_name] ?? 0) + 1;
  }
  const ranking = buildRanking(counts);
  const totalGoals = ranking.reduce((sum, r) => sum + r.goals, 0);
  const ownGoalCount = ownGoals.filter((o) => matchesFilter(o.match_type)).length;
  const maxGoals = ranking.length > 0 ? ranking[0].goals : 0;

  return (
    <div className="container py-10 max-w-2xl">
      <div className="flex items-center justify-between mb-6 gap-3">
        <h1 className="font-display font-bold text-2xl sm:text-3xl text-foreground flex items-center gap-2">
          <Trophy size={26} className="text-primary" />
          得点ランキング
        </h1>
      </div>

      {/* 種別フィルター */}
      <div className="flex flex-wrap gap-2 mb-6">
        {filterOptions.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setFilter(opt.value)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors ${
              filter === opt.value
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-secondary"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin text-primary" />
        </div>
      ) : ranking.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground text-sm border border-dashed rounded-xl border-border bg-card/50">
          該当する得点記録はまだありません
        </div>
      ) : (
        <>
          {/* サマリー */}
          <div className="flex gap-3 mb-5">
            <div className="flex-1 rounded-xl border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground mb-1">総得点</p>
              <p className="text-2xl font-black text-foreground">
                {totalGoals}
                <span className="text-sm font-normal text-muted-foreground ml-1">点</span>
              </p>
            </div>
            <div className="flex-1 rounded-xl border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground mb-1">得点者</p>
              <p className="text-2xl font-black text-foreground">
                {ranking.length}
                <span className="text-sm font-normal text-muted-foreground ml-1">人</span>
              </p>
            </div>
          </div>

          {/* ランキング */}
          <div className="space-y-2">
            {ranking.map((row, i) => {
              const info = members[row.member_name];
              const isTop3 = row.rank <= 3;
              return (
                <motion.div
                  key={row.member_name}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.04, 0.4) }}
                  className={`relative overflow-hidden flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                    isTop3 ? "border-primary/30 bg-primary/5" : "border-border bg-card"
                  }`}
                >
                  {/* 得点数に応じた背景バー */}
                  <div
                    className="absolute inset-y-0 left-0 bg-primary/10 pointer-events-none"
                    style={{ width: maxGoals > 0 ? `${(row.goals / maxGoals) * 100}%` : "0%" }}
                  />

                  <div className="relative w-7 flex items-center justify-center shrink-0">
                    <RankBadge rank={row.rank} />
                  </div>

                  <div className="relative w-10 h-10 rounded-full overflow-hidden bg-muted shrink-0">
                    {info?.photo_url ? (
                      <img src={info.photo_url} alt={row.member_name} className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs font-bold text-muted-foreground">
                        {row.member_name.slice(0, 1)}
                      </div>
                    )}
                  </div>

                  <div className="relative flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{row.member_name}</p>
                    {formatGrade(info?.grade ?? null) && (
                      <p className="text-xs text-muted-foreground">{formatGrade(info?.grade ?? null)}</p>
                    )}
                  </div>

                  <div className="relative flex items-baseline gap-1 shrink-0">
                    <span className={`text-2xl font-black ${isTop3 ? "text-primary" : "text-foreground"}`}>{row.goals}</span>
                    <span className="text-xs text-muted-foreground">点</span>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {ownGoalCount > 0 && (
            <p className="text-xs text-muted-foreground mt-4 text-center">
              ※ このほかに相手のオウンゴールが {ownGoalCount} 点あります（ランキングには含みません）
            </p>
          )}
        </>
      )}
    </div>
  );
};

export default ScorerRankingPage;
