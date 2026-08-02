import { useState, useEffect, useCallback } from "react";
import { Trophy, Plus, Edit2, Trash2, X, Send, Heart, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { OWN_GOAL_NAME, normalizeScore } from "@/lib/matchUtils";

const DAY_NAMES = ["日", "月", "火", "水", "木", "金", "土"];

interface MatchResult {
  id: string;
  title: string | null;
  match_type: "official" | "practice" | "friendly";
  opponent: string;
  match_date: string;
  score_us: number;
  score_them: number;
}

interface MatchSet {
  id: string;
  match_id: string;
  set_number: number;
  score_us: number;
  score_them: number;
}

interface MatchScorer {
  id: string;
  member_name: string;
  type: "goal" | "assist";
  display_order: number;
  set_number: number | null;
}

interface MatchComment {
  id: string;
  member_name: string;
  body: string;
  created_at: string;
  likes: { member_name: string }[];
}

interface VideoItem {
  id: string;
  title: string;
  type: "youtube" | "drive" | "upload";
  url: string;
}

// フォーム上の1試合分。公式戦では同じ日に複数持てる（大会などで相手が違う複数試合をやるため）
interface FormMatch {
  opponent: string;
  scoreUs: string;
  scoreThem: string;
  isMultiSet: boolean;
  sets: { score_us: string; score_them: string }[];
  videoIds: string[];
  scorers: { member_name: string; type: "goal" | "assist"; is_guest?: boolean; set_number: number | null }[];
  // 以下は入力用の一時状態（保存対象ではない）
  scorerSet: number;
  scorerMode: "member" | "guest" | "own";
  scorerMember: string;
  guestName: string;
}

const emptyFormMatch = (defaultMember: string): FormMatch => ({
  opponent: "",
  scoreUs: "0",
  scoreThem: "0",
  isMultiSet: false,
  sets: [{ score_us: "0", score_them: "0" }],
  videoIds: [],
  scorers: [],
  scorerSet: 1,
  scorerMode: "member",
  scorerMember: defaultMember,
  guestName: "",
});

function extractYoutubeId(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : null;
}

function extractDriveId(url: string): string | null {
  const m = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  return m ? m[1] : null;
}

function getResult(us: number, them: number) {
  if (us > them) return { label: "WIN", bg: "bg-green-500/10", text: "text-green-500", border: "border-green-500/30" };
  if (us < them) return { label: "LOSE", bg: "bg-red-500/10", text: "text-red-500", border: "border-red-500/30" };
  return { label: "DRAW", bg: "bg-yellow-500/10", text: "text-yellow-500", border: "border-yellow-500/30" };
}

function getSetSummary(sets: MatchSet[]) {
  let wins = 0, draws = 0, losses = 0;
  for (const s of sets) {
    if (s.score_us > s.score_them) wins++;
    else if (s.score_us < s.score_them) losses++;
    else draws++;
  }
  return { wins, draws, losses };
}

function getOverallResult(wins: number, draws: number, losses: number) {
  if (wins > losses) return { label: "WIN", bg: "bg-green-500/10", text: "text-green-500", border: "border-green-500/30" };
  if (wins < losses) return { label: "LOSE", bg: "bg-red-500/10", text: "text-red-500", border: "border-red-500/30" };
  return { label: "DRAW", bg: "bg-yellow-500/10", text: "text-yellow-500", border: "border-yellow-500/30" };
}

function formatDate(dateStr: string) {
  const [y, mo, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, mo - 1, d);
  return `${mo}/${d}(${DAY_NAMES[dt.getDay()]})`;
}

function VideoPlayer({ video }: { video: VideoItem }) {
  const ytId = video.type === "youtube" ? extractYoutubeId(video.url) : null;
  const driveId = video.type === "drive" ? extractDriveId(video.url) : null;

  if (driveId) {
    return (
      <a
        href={`https://drive.google.com/file/d/${driveId}/view`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-4 p-4 rounded-xl border border-border bg-muted/30 hover:bg-muted/60 transition-colors mb-4 group"
      >
        <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
          <svg className="w-6 h-6 text-blue-500" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8.267 14.68c-.184 0-.308.018-.372.036v1.178c.076.018.171.023.302.023.479 0 .774-.242.774-.651 0-.366-.254-.586-.704-.586zm3.487.012c-.2 0-.33.018-.407.036v2.61c.077.018.201.018.313.018.817.006 1.349-.444 1.349-1.396.006-.83-.479-1.268-1.255-1.268z"/>
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 1.5L18.5 9H13V3.5zM8.073 17.64c-.367 0-.756-.047-1.001-.106v-3.44c.245-.053.653-.083 1.043-.083 1.056 0 1.724.568 1.724 1.706-.006 1.29-.739 1.923-1.766 1.923zm3.81-.018c-.487 0-.946-.117-1.184-.23l.148-.964c.254.124.671.254 1.067.254.426 0 .65-.172.65-.444 0-.255-.189-.402-.68-.58-.681-.242-1.126-.626-1.126-1.232 0-.713.586-1.256 1.564-1.256.474 0 .822.1 1.067.213l-.207.934c-.177-.083-.474-.201-.873-.201-.397 0-.598.172-.598.39 0 .266.219.386.75.592.755.272 1.072.668 1.072 1.238-.006.707-.533 1.286-1.65 1.286zm4.285-3.501h-1.13v.875h1.06v.922h-1.06v1.685h-1.101v-4.404h2.231v.922z"/>
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{video.title}</p>
          <p className="text-xs text-muted-foreground mt-0.5">タップして Google Drive で開く</p>
        </div>
        <svg className="w-4 h-4 text-muted-foreground shrink-0 group-hover:text-foreground transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
        </svg>
      </a>
    );
  }

  return (
    <div className="rounded-xl overflow-hidden aspect-video mb-4">
      {ytId && (
        <iframe src={`https://www.youtube.com/embed/${ytId}`} className="w-full h-full" allowFullScreen allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" />
      )}
      {video.type === "upload" && (
        <video src={video.url} className="w-full h-full bg-black" controls />
      )}
    </div>
  );
}

// セット結果バッジ
function SetResultBadge({ us, them }: { us: number; them: number }) {
  if (us > them) return <span className="text-[10px] font-bold text-green-500">○</span>;
  if (us < them) return <span className="text-[10px] font-bold text-red-500">●</span>;
  return <span className="text-[10px] font-bold text-yellow-500">△</span>;
}

const MatchResultsPage = () => {
  const { isStaff, memberName } = useAuth();

  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [matchSetsMap, setMatchSetsMap] = useState<Record<string, MatchSet[]>>({});
  const [loading, setLoading] = useState(true);
  const [videoList, setVideoList] = useState<VideoItem[]>([]);

  const [selectedMatch, setSelectedMatch] = useState<MatchResult | null>(null);
  const [detailSets, setDetailSets] = useState<MatchSet[]>([]);
  const [scorers, setScorers] = useState<MatchScorer[]>([]);
  const [comments, setComments] = useState<MatchComment[]>([]);
  const [detailVideos, setDetailVideos] = useState<VideoItem[]>([]);
  const [activeVideoIdx, setActiveVideoIdx] = useState(0);
  const [detailLoading, setDetailLoading] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [commentLoading, setCommentLoading] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [editingMatch, setEditingMatch] = useState<MatchResult | null>(null);
  const [members, setMembers] = useState<string[]>([]);
  // 共通項目（大会でまとめて登録するとき、全試合で同じ値を使う）
  const [fTitle, setFTitle] = useState("");
  const [fMatchType, setFMatchType] = useState<"official" | "practice" | "friendly">("official");
  const [fDate, setFDate] = useState("");
  // 試合ごとの入力。スコアは文字列で保持する（数値stateだと「0」が消せず "01" になるため）
  const [fMatches, setFMatches] = useState<FormMatch[]>([emptyFormMatch("")]);
  const [formLoading, setFormLoading] = useState(false);

  const updateMatch = (i: number, patch: Partial<FormMatch>) =>
    setFMatches((prev) => prev.map((m, j) => (j === i ? { ...m, ...patch } : m)));

  const fetchMatches = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("match_results")
      .select("id, title, match_type, opponent, match_date, score_us, score_them")
      // 同じ日は登録順＝試合順（第1試合→第2試合…）に並べる
      .order("match_date", { ascending: false })
      .order("created_at", { ascending: true });
    const fetchedMatches = data ?? [];
    setMatches(fetchedMatches);

    // 全試合のセット情報を一括取得
    if (fetchedMatches.length > 0) {
      const ids = fetchedMatches.map((m) => m.id);
      const { data: setsData } = await supabase
        .from("match_sets")
        .select("*")
        .in("match_id", ids)
        .order("set_number");
      const map: Record<string, MatchSet[]> = {};
      for (const s of setsData ?? []) {
        if (!map[s.match_id]) map[s.match_id] = [];
        map[s.match_id].push(s as MatchSet);
      }
      setMatchSetsMap(map);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchMatches();
    supabase.from("videos").select("id, title, type, url").order("date", { ascending: false }).then(({ data }) => {
      setVideoList((data ?? []) as VideoItem[]);
    });
  }, [fetchMatches]);

  const fetchDetail = async (match: MatchResult) => {
    setSelectedMatch(match);
    setDetailLoading(true);
    setScorers([]);
    setComments([]);
    setDetailVideos([]);
    setDetailSets([]);
    setActiveVideoIdx(0);

    const [{ data: scorerData }, { data: commentData }, { data: videoLinkData }, { data: setsData }] = await Promise.all([
      supabase.from("match_scorers").select("*").eq("match_id", match.id).order("display_order"),
      supabase.from("match_comments").select("*").eq("match_id", match.id).order("created_at"),
      supabase.from("match_result_videos").select("video_id, display_order").eq("match_id", match.id).order("display_order"),
      supabase.from("match_sets").select("*").eq("match_id", match.id).order("set_number"),
    ]);

    const commentIds = (commentData ?? []).map((c) => c.id);
    const { data: likeData } = commentIds.length > 0
      ? await supabase.from("match_likes").select("comment_id, member_name").in("comment_id", commentIds)
      : { data: [] };

    setScorers((scorerData ?? []) as MatchScorer[]);
    setDetailSets((setsData ?? []) as MatchSet[]);
    setComments((commentData ?? []).map((c) => ({
      ...c,
      likes: (likeData ?? []).filter((l) => l.comment_id === c.id),
    })));

    if (videoLinkData && videoLinkData.length > 0) {
      const videoIds = videoLinkData.map((v) => v.video_id);
      const { data: vData } = await supabase.from("videos").select("id, title, type, url").in("id", videoIds);
      const ordered = videoIds.map((vid) => (vData ?? []).find((v) => v.id === vid)).filter(Boolean) as VideoItem[];
      setDetailVideos(ordered);
    }

    setDetailLoading(false);
  };

  const refreshComments = async (matchId: string) => {
    const { data: commentData } = await supabase.from("match_comments").select("*").eq("match_id", matchId).order("created_at");
    const commentIds = (commentData ?? []).map((c) => c.id);
    const { data: likeData } = commentIds.length > 0
      ? await supabase.from("match_likes").select("comment_id, member_name").in("comment_id", commentIds)
      : { data: [] };
    setComments((commentData ?? []).map((c) => ({
      ...c,
      likes: (likeData ?? []).filter((l) => l.comment_id === c.id),
    })));
  };

  const handleLike = async (commentId: string) => {
    if (!memberName || !selectedMatch) return;
    const comment = comments.find((c) => c.id === commentId);
    if (!comment) return;
    const alreadyLiked = comment.likes.some((l) => l.member_name === memberName);
    if (alreadyLiked) {
      await supabase.from("match_likes").delete().eq("comment_id", commentId).eq("member_name", memberName);
    } else {
      await supabase.from("match_likes").insert({ comment_id: commentId, member_name: memberName });
    }
    await refreshComments(selectedMatch.id);
  };

  const handleComment = async () => {
    if (!newComment.trim() || !memberName || !selectedMatch) return;
    setCommentLoading(true);
    await supabase.from("match_comments").insert({ match_id: selectedMatch.id, member_name: memberName, body: newComment.trim() });
    setNewComment("");
    await refreshComments(selectedMatch.id);
    setCommentLoading(false);
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm("コメントを削除しますか？") || !selectedMatch) return;
    await supabase.from("match_comments").delete().eq("id", commentId);
    await refreshComments(selectedMatch.id);
  };

  const handleDelete = async (matchId: string) => {
    if (!confirm("この試合結果を削除しますか？")) return;
    await supabase.from("match_results").delete().eq("id", matchId);
    setSelectedMatch(null);
    fetchMatches();
  };

  const openForm = async (match: MatchResult | null) => {
    setEditingMatch(match);

    const { data: memberData } = await supabase.from("members").select("name").order("name");
    const names = (memberData ?? []).map((m) => m.name);
    setMembers(names);
    const defaultMember = names[0] ?? "";

    if (match) {
      // 編集は常に1試合ぶん
      setFTitle(match.title ?? "");
      setFMatchType(match.match_type ?? "official");
      setFDate(match.match_date);

      const [{ data: scorerData }, { data: videoLinkData }, { data: setsData }] = await Promise.all([
        supabase.from("match_scorers").select("*").eq("match_id", match.id).order("display_order"),
        supabase.from("match_result_videos").select("video_id, display_order").eq("match_id", match.id).order("display_order"),
        supabase.from("match_sets").select("*").eq("match_id", match.id).order("set_number"),
      ]);
      const sets = (setsData ?? []) as MatchSet[];

      setFMatches([{
        ...emptyFormMatch(defaultMember),
        opponent: match.opponent,
        scoreUs: String(match.score_us),
        scoreThem: String(match.score_them),
        isMultiSet: sets.length > 0,
        sets: sets.length > 0
          ? sets.map((s) => ({ score_us: String(s.score_us), score_them: String(s.score_them) }))
          : [{ score_us: "0", score_them: "0" }],
        videoIds: (videoLinkData ?? []).map((v) => v.video_id),
        scorers: (scorerData ?? []).map((s) => ({
          member_name: s.member_name,
          type: s.type as "goal" | "assist",
          set_number: s.set_number ?? null,
        })),
      }]);
    } else {
      setFTitle("");
      setFMatchType("official");
      setFDate("");
      setFMatches([emptyFormMatch(defaultMember)]);
    }
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fDate) return;
    // 対戦相手が空の試合はスキップする
    const targets = fMatches.filter((m) => m.opponent.trim() !== "");
    if (targets.length === 0) return;

    setFormLoading(true);
    try {
      const num = (v: string) => Number(v) || 0;

      for (const fm of targets) {
        // マルチセット時はスコアを合計ゴール数で保存
        const scoreUs = fm.isMultiSet ? fm.sets.reduce((acc, s) => acc + num(s.score_us), 0) : num(fm.scoreUs);
        const scoreThem = fm.isMultiSet ? fm.sets.reduce((acc, s) => acc + num(s.score_them), 0) : num(fm.scoreThem);

        const fields = {
          title: fTitle || null,
          match_type: fMatchType,
          opponent: fm.opponent.trim(),
          match_date: fDate,
          score_us: scoreUs,
          score_them: scoreThem,
        };

        let matchId: string;
        if (editingMatch) {
          await supabase.from("match_results").update(fields).eq("id", editingMatch.id);
          matchId = editingMatch.id;
          await Promise.all([
            supabase.from("match_scorers").delete().eq("match_id", matchId),
            supabase.from("match_result_videos").delete().eq("match_id", matchId),
            supabase.from("match_sets").delete().eq("match_id", matchId),
          ]);
        } else {
          const { data } = await supabase.from("match_results").insert({ ...fields, created_by: memberName }).select().single();
          matchId = data!.id;
        }

        if (fm.isMultiSet && fm.sets.length > 0) {
          await supabase.from("match_sets").insert(
            fm.sets.map((s, i) => ({ match_id: matchId, set_number: i + 1, score_us: num(s.score_us), score_them: num(s.score_them) }))
          );
        }
        if (fm.scorers.length > 0) {
          await supabase.from("match_scorers").insert(
            fm.scorers.map((s, i) => ({
              match_id: matchId,
              member_name: s.member_name,
              type: s.type,
              display_order: i,
              // 1試合モードならセット紐付けなし（null）
              set_number: fm.isMultiSet ? s.set_number : null,
            }))
          );
        }
        if (fm.videoIds.length > 0) {
          await supabase.from("match_result_videos").insert(
            fm.videoIds.map((vid, i) => ({ match_id: matchId, video_id: vid, display_order: i }))
          );
        }
      }

      setShowForm(false);
      fetchMatches();
    } finally {
      setFormLoading(false);
    }
  };

  const inputClass = "w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50";

  return (
    <div className="container py-10">
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-display font-bold text-2xl sm:text-3xl text-foreground flex items-center gap-2">
          <Trophy size={24} className="text-primary sm:hidden" />
          <Trophy size={28} className="text-primary hidden sm:block" />
          試合結果
        </h1>
        {isStaff && (
          <button onClick={() => openForm(null)} className="flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs sm:text-sm font-semibold hover:bg-primary/90 transition-colors">
            <Plus size={14} />
            <span className="hidden sm:inline">結果を追加</span>
            <span className="sm:hidden">追加</span>
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 size={32} className="animate-spin text-primary" /></div>
      ) : matches.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground text-sm border border-dashed rounded-xl border-border bg-card/50">試合結果はまだありません</div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {matches.map((match, i) => {
            const sets = matchSetsMap[match.id] ?? [];
            const isMulti = sets.length > 0;
            const summary = isMulti ? getSetSummary(sets) : null;
            const result = isMulti
              ? getOverallResult(summary!.wins, summary!.draws, summary!.losses)
              : getResult(match.score_us, match.score_them);
            return (
              <motion.div
                key={match.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => fetchDetail(match)}
                className="cursor-pointer bg-card border border-border rounded-2xl p-5 hover:-translate-y-1 transition-transform duration-200"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground">{formatDate(match.match_date)}</span>
                  <div className="flex items-center gap-1.5">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                      match.match_type === "official" ? "bg-blue-500/10 text-blue-600 border-blue-500/30" :
                      match.match_type === "practice" ? "bg-gray-500/10 text-gray-500 border-gray-400/30" :
                      "bg-orange-500/10 text-orange-500 border-orange-500/30"
                    }`}>{
                      match.match_type === "official" ? "公式戦" :
                      match.match_type === "practice" ? "練習試合" : "フレンドリー"
                    }</span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${result.bg} ${result.text} ${result.border}`}>{result.label}</span>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mb-3">vs {match.opponent}</p>
                {isMulti ? (
                  <div>
                    <div className="flex items-baseline gap-1 mb-1">
                      <span className="text-3xl font-black text-green-500">{summary!.wins}</span>
                      <span className="text-lg text-muted-foreground font-light">勝</span>
                      {summary!.draws > 0 && <>
                        <span className="text-3xl font-black text-yellow-500">{summary!.draws}</span>
                        <span className="text-lg text-muted-foreground font-light">分</span>
                      </>}
                      <span className="text-3xl font-black text-red-500">{summary!.losses}</span>
                      <span className="text-lg text-muted-foreground font-light">敗</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{sets.length}セット戦</p>
                  </div>
                ) : (
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-black text-foreground">{match.score_us}</span>
                    <span className="text-xl text-muted-foreground font-light">-</span>
                    <span className="text-4xl font-black text-foreground">{match.score_them}</span>
                  </div>
                )}
                {match.title && <p className="text-xs text-muted-foreground mt-2">{match.title}</p>}
              </motion.div>
            );
          })}
        </div>
      )}

      {/* 詳細モーダル */}
      <AnimatePresence>
        {selectedMatch && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedMatch(null)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-card rounded-2xl shadow-2xl border border-border flex flex-col max-h-[90vh]"
            >
              <div className="absolute top-4 right-4 flex items-center gap-1.5 z-10">
                {isStaff && (
                  <>
                    <button onClick={() => { const m = selectedMatch; setSelectedMatch(null); openForm(m); }} className="p-2 bg-muted/80 hover:bg-muted text-muted-foreground rounded-full transition-colors"><Edit2 size={16} /></button>
                    <button onClick={() => handleDelete(selectedMatch.id)} className="p-2 bg-muted/80 hover:bg-red-100 text-muted-foreground hover:text-red-600 rounded-full transition-colors"><Trash2 size={16} /></button>
                  </>
                )}
                <button onClick={() => setSelectedMatch(null)} className="p-2 bg-muted/50 hover:bg-muted text-muted-foreground rounded-full transition-colors"><X size={20} /></button>
              </div>

              <div className="p-6 sm:p-8 overflow-y-auto">
                {detailLoading ? (
                  <div className="flex items-center justify-center py-16"><Loader2 size={28} className="animate-spin text-primary" /></div>
                ) : (
                  <>
                    <div className="mb-4">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                          selectedMatch.match_type === "official" ? "bg-blue-500/10 text-blue-600 border-blue-500/30" :
                          selectedMatch.match_type === "practice" ? "bg-gray-500/10 text-gray-500 border-gray-400/30" :
                          "bg-orange-500/10 text-orange-500 border-orange-500/30"
                        }`}>{
                          selectedMatch.match_type === "official" ? "公式戦" :
                          selectedMatch.match_type === "practice" ? "練習試合" : "フレンドリー"
                        }</span>
                        {selectedMatch.title && <span className="text-xs text-muted-foreground">{selectedMatch.title}</span>}
                      </div>
                      <div className="flex items-center gap-3 mb-1">
                        <span className="text-sm text-muted-foreground">{formatDate(selectedMatch.match_date)}</span>
                        {(() => {
                          const sets = detailSets;
                          const isMulti = sets.length > 0;
                          if (isMulti) {
                            const { wins, draws, losses } = getSetSummary(sets);
                            const r = getOverallResult(wins, draws, losses);
                            return <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${r.bg} ${r.text} ${r.border}`}>{r.label}</span>;
                          }
                          const r = getResult(selectedMatch.score_us, selectedMatch.score_them);
                          return <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${r.bg} ${r.text} ${r.border}`}>{r.label}</span>;
                        })()}
                      </div>
                      <p className="text-xl font-bold text-foreground">vs {selectedMatch.opponent}</p>
                    </div>

                    {/* スコア表示 */}
                    {detailSets.length > 0 ? (
                      <div className="mb-4">
                        {/* 合計サマリー */}
                        {(() => {
                          const { wins, draws, losses } = getSetSummary(detailSets);
                          return (
                            <div className="flex items-baseline gap-1 mb-3">
                              <span className="text-5xl font-black text-green-500">{wins}</span>
                              <span className="text-2xl text-muted-foreground font-light">勝</span>
                              {draws > 0 && <>
                                <span className="text-5xl font-black text-yellow-500">{draws}</span>
                                <span className="text-2xl text-muted-foreground font-light">分</span>
                              </>}
                              <span className="text-5xl font-black text-red-500">{losses}</span>
                              <span className="text-2xl text-muted-foreground font-light">敗</span>
                            </div>
                          );
                        })()}
                        {/* セットごとの詳細テーブル */}
                        <div className="bg-muted/30 rounded-xl overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-border">
                                <th className="text-left px-3 py-2 text-xs text-muted-foreground font-medium whitespace-nowrap">セット</th>
                                <th className="text-center px-3 py-2 text-xs text-muted-foreground font-medium">結果</th>
                                <th className="text-center px-3 py-2 text-xs text-muted-foreground font-medium whitespace-nowrap">スコア</th>
                                <th className="text-left px-3 py-2 text-xs text-muted-foreground font-medium">得点者</th>
                              </tr>
                            </thead>
                            <tbody>
                              {detailSets.map((s) => {
                                const setGoals = scorers.filter((sc) => sc.type === "goal" && sc.set_number === s.set_number);
                                return (
                                  <tr key={s.id} className="border-b border-border last:border-0">
                                    <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">第{s.set_number}戦</td>
                                    <td className="px-3 py-2 text-center">
                                      <SetResultBadge us={s.score_us} them={s.score_them} />
                                    </td>
                                    <td className="px-3 py-2 text-center font-bold text-foreground whitespace-nowrap">
                                      {s.score_us} - {s.score_them}
                                    </td>
                                    <td className="px-3 py-2 text-foreground text-xs">
                                      {setGoals.length > 0
                                        ? setGoals.map((sc) => sc.member_name).join("、")
                                        : <span className="text-muted-foreground">-</span>}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-baseline gap-3 mb-4">
                        <span className="text-5xl sm:text-7xl font-black text-foreground">{selectedMatch.score_us}</span>
                        <span className="text-2xl sm:text-3xl text-muted-foreground font-light">-</span>
                        <span className="text-5xl sm:text-7xl font-black text-foreground">{selectedMatch.score_them}</span>
                      </div>
                    )}

                    {scorers.length > 0 && (
                      <div className="mb-4 bg-muted/30 rounded-xl p-3 space-y-1">
                        {scorers.filter((s) => s.type === "goal").length > 0 && (
                          <p className="text-sm text-foreground">
                            <span className="mr-2">⚽</span>
                            {detailSets.length > 0
                              // 複数セット戦は同じ人が複数回得点するので「名前×回数」でまとめる
                              ? Object.entries(
                                  scorers.filter((s) => s.type === "goal").reduce((acc, s) => {
                                    acc[s.member_name] = (acc[s.member_name] ?? 0) + 1;
                                    return acc;
                                  }, {} as Record<string, number>)
                                ).map(([name, n]) => (n > 1 ? `${name}×${n}` : name)).join("　")
                              : scorers.filter((s) => s.type === "goal").map((s) => s.member_name).join("　")}
                          </p>
                        )}
                        {scorers.filter((s) => s.type === "assist").length > 0 && (
                          <p className="text-sm text-foreground"><span className="mr-2">🤝</span>{scorers.filter((s) => s.type === "assist").map((s) => s.member_name).join("　")}</p>
                        )}
                      </div>
                    )}

                    {detailVideos.length > 0 && (
                      <div className="mb-4">
                        {detailVideos.length > 1 && (
                          <div className="flex gap-1.5 mb-2 flex-wrap">
                            {detailVideos.map((v, i) => (
                              <button
                                key={v.id}
                                onClick={() => setActiveVideoIdx(i)}
                                className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-colors truncate max-w-[140px] ${activeVideoIdx === i ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
                              >
                                {v.title}
                              </button>
                            ))}
                          </div>
                        )}
                        <VideoPlayer video={detailVideos[activeVideoIdx] ?? detailVideos[0]} />
                      </div>
                    )}

                    <div className="border-t border-border pt-4 mt-2">
                      <h3 className="text-sm font-semibold text-foreground mb-3">コメント</h3>
                      <div className="space-y-2 mb-3 max-h-60 overflow-y-auto">
                        {comments.length === 0 ? (
                          <p className="text-xs text-muted-foreground text-center py-4">まだコメントはありません</p>
                        ) : comments.map((comment) => {
                          const liked = comment.likes.some((l) => l.member_name === memberName);
                          return (
                            <div key={comment.id} className="bg-muted/30 rounded-xl p-3">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs font-semibold text-foreground">{comment.member_name}</span>
                                <div className="flex items-center gap-2">
                                  <button onClick={() => handleLike(comment.id)} className={`flex items-center gap-1 text-xs transition-colors ${liked ? "text-red-500" : "text-muted-foreground hover:text-red-500"}`}>
                                    <Heart size={12} fill={liked ? "currentColor" : "none"} />
                                    {comment.likes.length > 0 && <span>{comment.likes.length}</span>}
                                  </button>
                                  {(isStaff || comment.member_name === memberName) && (
                                    <button onClick={() => handleDeleteComment(comment.id)} className="text-muted-foreground hover:text-red-500 transition-colors"><X size={12} /></button>
                                  )}
                                </div>
                              </div>
                              <p className="text-sm text-foreground whitespace-pre-wrap">{comment.body}</p>
                            </div>
                          );
                        })}
                      </div>
                      <div className="flex gap-2 overflow-hidden">
                        <input
                          type="text"
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleComment(); } }}
                          placeholder="コメントを入力..."
                          className="flex-1 min-w-0 px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                        />
                        <button onClick={handleComment} disabled={!newComment.trim() || commentLoading} className="px-3 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50">
                          {commentLoading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 追加・編集フォーム */}
      <AnimatePresence>
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowForm(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-card rounded-2xl shadow-2xl border border-border flex flex-col max-h-[90vh]"
            >
              <button onClick={() => setShowForm(false)} className="absolute top-4 right-4 p-2 bg-muted/50 hover:bg-muted rounded-full text-muted-foreground z-10"><X size={20} /></button>
              <div className="p-6 sm:p-8 overflow-y-auto">
                <h2 className="text-xl font-bold text-foreground mb-6">{editingMatch ? "試合結果を編集" : "試合結果を追加"}</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">試合種別 *</label>
                    <div className="flex rounded-lg border border-border overflow-hidden w-fit">
                      {([
                        { value: "official", label: "公式戦" },
                        { value: "practice", label: "練習試合" },
                        { value: "friendly", label: "フレンドリー" },
                      ] as const).map((t) => (
                        <button
                          key={t.value}
                          type="button"
                          onClick={() => setFMatchType(t.value)}
                          className={`px-3 py-2 text-xs font-semibold transition-colors ${fMatchType === t.value ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1 block">大会名・試合名（任意）</label>
                    <input type="text" value={fTitle} onChange={(e) => setFTitle(e.target.value)} placeholder="例: 春季大会 1回戦" className={inputClass} />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1 block">日付 *</label>
                    <input type="date" value={fDate} onChange={(e) => setFDate(e.target.value)} required className={inputClass} />
                  </div>

                  {/* 試合ごとの入力。公式戦では同じ日に複数試合を並べられる */}
                  {fMatches.map((fm, mi) => (
                    <div
                      key={mi}
                      className={fMatches.length > 1 ? "rounded-xl border border-border bg-muted/20 p-3 space-y-4" : "space-y-4"}
                    >
                      {fMatches.length > 1 && (
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-muted-foreground">第{mi + 1}試合</span>
                          <button
                            type="button"
                            onClick={() => setFMatches((prev) => prev.filter((_, j) => j !== mi))}
                            className="p-1 text-muted-foreground hover:text-red-500 transition-colors"
                            title="この試合を削除"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      )}

                      <div>
                        <label className="text-sm font-medium text-foreground mb-1 block">
                          対戦相手 {mi === 0 ? "*" : <span className="text-xs text-muted-foreground font-normal">（空欄なら保存しません）</span>}
                        </label>
                        {/* 2試合目以降は未入力を許容する（空の枠は保存時にスキップされる） */}
                        <input type="text" value={fm.opponent} onChange={(e) => updateMatch(mi, { opponent: e.target.value })} required={mi === 0} placeholder="例: ○○高校" className={inputClass} />
                      </div>

                      {/* シングル / マルチセット切り替え */}
                      <div>
                        <label className="text-sm font-medium text-foreground mb-1.5 block">スコア形式</label>
                        <div className="flex rounded-lg border border-border overflow-hidden w-fit mb-3">
                          <button
                            type="button"
                            onClick={() => updateMatch(mi, { isMultiSet: false })}
                            className={`px-3 py-2 text-xs font-semibold transition-colors ${!fm.isMultiSet ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
                          >
                            1試合
                          </button>
                          <button
                            type="button"
                            onClick={() => updateMatch(mi, { isMultiSet: true })}
                            className={`px-3 py-2 text-xs font-semibold transition-colors ${fm.isMultiSet ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
                          >
                            複数セット戦
                          </button>
                        </div>

                        {!fm.isMultiSet ? (
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-sm font-medium text-foreground mb-1 block">自チーム</label>
                              <input type="text" inputMode="numeric" value={fm.scoreUs} onChange={(e) => updateMatch(mi, { scoreUs: normalizeScore(e.target.value) })} onFocus={(e) => e.target.select()} className={inputClass} />
                            </div>
                            <div>
                              <label className="text-sm font-medium text-foreground mb-1 block">相手チーム</label>
                              <input type="text" inputMode="numeric" value={fm.scoreThem} onChange={(e) => updateMatch(mi, { scoreThem: normalizeScore(e.target.value) })} onFocus={(e) => e.target.select()} className={inputClass} />
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <div className="grid grid-cols-[3rem_1fr_1.5rem_1fr_2rem] gap-1 items-center px-1">
                              <span className="text-xs text-muted-foreground text-center"></span>
                              <span className="text-xs text-muted-foreground text-center">自チーム</span>
                              <span></span>
                              <span className="text-xs text-muted-foreground text-center">相手</span>
                              <span></span>
                            </div>
                            {fm.sets.map((s, i) => (
                              <div key={i} className="grid grid-cols-[3rem_1fr_1.5rem_1fr_2rem] gap-1 items-center">
                                <span className="text-xs text-muted-foreground text-center">第{i + 1}戦</span>
                                <input
                                  type="text" inputMode="numeric" value={s.score_us}
                                  onChange={(e) => updateMatch(mi, { sets: fm.sets.map((x, j) => j === i ? { ...x, score_us: normalizeScore(e.target.value) } : x) })}
                                  onFocus={(e) => e.target.select()}
                                  className={inputClass}
                                />
                                <span className="text-center text-muted-foreground text-sm">-</span>
                                <input
                                  type="text" inputMode="numeric" value={s.score_them}
                                  onChange={(e) => updateMatch(mi, { sets: fm.sets.map((x, j) => j === i ? { ...x, score_them: normalizeScore(e.target.value) } : x) })}
                                  onFocus={(e) => e.target.select()}
                                  className={inputClass}
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    // セット削除時、そのセットの得点者も外し、以降のセット番号を繰り上げる
                                    const removed = i + 1;
                                    updateMatch(mi, {
                                      sets: fm.sets.filter((_, j) => j !== i),
                                      scorers: fm.scorers
                                        .filter((sc) => sc.set_number !== removed)
                                        .map((sc) => sc.set_number && sc.set_number > removed ? { ...sc, set_number: sc.set_number - 1 } : sc),
                                    });
                                  }}
                                  className="p-1 text-muted-foreground hover:text-red-500 transition-colors"
                                  disabled={fm.sets.length <= 1}
                                >
                                  <X size={14} />
                                </button>
                              </div>
                            ))}
                            <button
                              type="button"
                              onClick={() => updateMatch(mi, { sets: [...fm.sets, { score_us: "0", score_them: "0" }] })}
                              className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors font-semibold mt-1"
                            >
                              <Plus size={12} /> セットを追加
                            </button>
                          </div>
                        )}
                      </div>

                      <div>
                        <label className="text-sm font-medium text-foreground mb-1 block">動画</label>
                        <select
                          value=""
                          onChange={(e) => {
                            const id = e.target.value;
                            if (id && !fm.videoIds.includes(id)) updateMatch(mi, { videoIds: [...fm.videoIds, id] });
                          }}
                          className={inputClass}
                        >
                          <option value="">動画を選んで追加...</option>
                          {videoList.filter((v) => !fm.videoIds.includes(v.id)).map((v) => (
                            <option key={v.id} value={v.id}>{v.title}</option>
                          ))}
                        </select>
                        {fm.videoIds.length > 0 && (
                          <div className="mt-2 space-y-1.5">
                            {fm.videoIds.map((id, i) => {
                              const v = videoList.find((x) => x.id === id);
                              if (!v) return null;
                              return (
                                <div key={id} className="flex items-center justify-between bg-muted/30 rounded-lg px-3 py-1.5">
                                  <span className="text-sm text-foreground truncate">{v.title}</span>
                                  <button type="button" onClick={() => updateMatch(mi, { videoIds: fm.videoIds.filter((_, idx) => idx !== i) })} className="ml-2 text-muted-foreground hover:text-red-500 transition-colors shrink-0"><X size={14} /></button>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      <div>
                        <label className="text-sm font-medium text-foreground mb-2 block">得点者</label>
                        <div className="flex rounded-lg border border-border overflow-hidden mb-2 w-fit">
                          <button type="button" onClick={() => updateMatch(mi, { scorerMode: "member", guestName: "" })} className={`px-3 py-1.5 text-xs font-semibold transition-colors ${fm.scorerMode === "member" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>部員</button>
                          <button type="button" onClick={() => updateMatch(mi, { scorerMode: "guest" })} className={`px-3 py-1.5 text-xs font-semibold transition-colors ${fm.scorerMode === "guest" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>助っ人</button>
                          <button type="button" onClick={() => updateMatch(mi, { scorerMode: "own", guestName: "" })} className={`px-3 py-1.5 text-xs font-semibold transition-colors ${fm.scorerMode === "own" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>オウンゴール</button>
                        </div>

                        {/* 複数セット戦のときは、どのセットの得点かを選ぶ */}
                        {fm.isMultiSet && (
                          <div className="flex flex-wrap gap-1.5 mb-2">
                            {fm.sets.map((_, i) => (
                              <button
                                key={i}
                                type="button"
                                onClick={() => updateMatch(mi, { scorerSet: i + 1 })}
                                className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${fm.scorerSet === i + 1 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
                              >
                                第{i + 1}戦
                              </button>
                            ))}
                          </div>
                        )}

                        <div className="flex gap-2 mb-2">
                          {fm.scorerMode === "guest" ? (
                            <input type="text" value={fm.guestName} onChange={(e) => updateMatch(mi, { guestName: e.target.value })} placeholder="名前を入力" className={`flex-1 ${inputClass}`} />
                          ) : fm.scorerMode === "own" ? (
                            <div className={`flex-1 ${inputClass} text-muted-foreground`}>相手のオウンゴール</div>
                          ) : (
                            <select value={fm.scorerMember} onChange={(e) => updateMatch(mi, { scorerMember: e.target.value })} className={`flex-1 ${inputClass}`}>
                              {members.map((m) => <option key={m} value={m}>{m}</option>)}
                            </select>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              const name =
                                fm.scorerMode === "own" ? OWN_GOAL_NAME :
                                fm.scorerMode === "guest" ? fm.guestName.trim() :
                                fm.scorerMember;
                              if (!name) return;
                              updateMatch(mi, {
                                scorers: [...fm.scorers, {
                                  member_name: name,
                                  type: "goal",
                                  is_guest: fm.scorerMode === "guest",
                                  set_number: fm.isMultiSet ? fm.scorerSet : null,
                                }],
                                guestName: fm.scorerMode === "guest" ? "" : fm.guestName,
                              });
                            }}
                            className="px-3 py-2 rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors shrink-0"
                          >
                            <Plus size={14} />
                          </button>
                        </div>

                        {fm.scorers.length > 0 && (
                          fm.isMultiSet ? (
                            // セットごとにまとめて表示
                            <div className="space-y-2">
                              {fm.sets.map((_, si) => {
                                const setNo = si + 1;
                                const list = fm.scorers.map((s, idx) => ({ s, idx })).filter(({ s }) => s.set_number === setNo);
                                if (list.length === 0) return null;
                                return (
                                  <div key={setNo}>
                                    <p className="text-xs text-muted-foreground mb-1">第{setNo}戦</p>
                                    <div className="space-y-1.5">
                                      {list.map(({ s, idx }) => (
                                        <div key={idx} className="flex items-center justify-between bg-muted/30 rounded-lg px-3 py-1.5">
                                          <span className="text-sm text-foreground">
                                            {s.member_name === OWN_GOAL_NAME ? "🥅" : "⚽"} {s.member_name}
                                            {s.is_guest && <span className="ml-1.5 text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">助っ人</span>}
                                          </span>
                                          <button type="button" onClick={() => updateMatch(mi, { scorers: fm.scorers.filter((_, j) => j !== idx) })} className="text-muted-foreground hover:text-red-500 transition-colors"><X size={14} /></button>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="space-y-1.5">
                              {fm.scorers.map((s, i) => (
                                <div key={i} className="flex items-center justify-between bg-muted/30 rounded-lg px-3 py-1.5">
                                  <span className="text-sm text-foreground">
                                    {s.member_name === OWN_GOAL_NAME ? "🥅" : s.type === "goal" ? "⚽" : "🤝"} {s.member_name}
                                    {s.is_guest && <span className="ml-1.5 text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">助っ人</span>}
                                  </span>
                                  <button type="button" onClick={() => updateMatch(mi, { scorers: fm.scorers.filter((_, idx) => idx !== i) })} className="text-muted-foreground hover:text-red-500 transition-colors"><X size={14} /></button>
                                </div>
                              ))}
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  ))}

                  {/* 大会などで相手の違う試合が続くとき用。公式戦の新規登録のときだけ出す */}
                  {!editingMatch && fMatchType === "official" && (
                    <button
                      type="button"
                      onClick={() => setFMatches((prev) => [...prev, emptyFormMatch(members[0] ?? "")])}
                      className="flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 transition-colors font-semibold"
                    >
                      <Plus size={14} /> この日にもう1試合追加する
                    </button>
                  )}

                  <button type="submit" disabled={formLoading} className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                    {formLoading && <Loader2 size={16} className="animate-spin" />}
                    {formLoading
                      ? "保存中..."
                      : editingMatch
                        ? "更新する"
                        : fMatches.length > 1
                          ? `${fMatches.filter((m) => m.opponent.trim() !== "").length}試合を保存する`
                          : "保存する"}
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MatchResultsPage;
