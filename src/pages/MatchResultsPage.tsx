import { useState, useEffect, useCallback } from "react";
import { Trophy, Plus, Edit2, Trash2, X, Send, Heart, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const DAY_NAMES = ["日", "月", "火", "水", "木", "金", "土"];

interface MatchResult {
  id: string;
  title: string | null;
  opponent: string;
  match_date: string;
  score_us: number;
  score_them: number;
}

interface MatchScorer {
  id: string;
  member_name: string;
  type: "goal" | "assist";
  display_order: number;
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

function formatDate(dateStr: string) {
  const [y, mo, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, mo - 1, d);
  return `${mo}/${d}(${DAY_NAMES[dt.getDay()]})`;
}

function VideoPlayer({ video }: { video: VideoItem }) {
  const ytId = video.type === "youtube" ? extractYoutubeId(video.url) : null;
  const driveId = video.type === "drive" ? extractDriveId(video.url) : null;
  return (
    <div className="rounded-xl overflow-hidden aspect-video mb-4">
      {ytId && (
        <iframe src={`https://www.youtube.com/embed/${ytId}`} className="w-full h-full" allowFullScreen allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" />
      )}
      {driveId && (
        <iframe src={`https://drive.google.com/file/d/${driveId}/preview`} className="w-full h-full" allowFullScreen />
      )}
      {video.type === "upload" && (
        <video src={video.url} className="w-full h-full bg-black" controls />
      )}
    </div>
  );
}

const MatchResultsPage = () => {
  const { isStaff, memberName } = useAuth();

  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [videoList, setVideoList] = useState<VideoItem[]>([]);

  const [selectedMatch, setSelectedMatch] = useState<MatchResult | null>(null);
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
  const [fTitle, setFTitle] = useState("");
  const [fOpponent, setFOpponent] = useState("");
  const [fDate, setFDate] = useState("");
  const [fScoreUs, setFScoreUs] = useState(0);
  const [fScoreThem, setFScoreThem] = useState(0);
  const [fVideoIds, setFVideoIds] = useState<string[]>([]);
  const [fScorers, setFScorers] = useState<{ member_name: string; type: "goal" | "assist"; is_guest?: boolean }[]>([]);
  const [fScorerMember, setFScorerMember] = useState("");
  const [fScorerType, setFScorerType] = useState<"goal" | "assist">("goal");
  const [fScorerIsGuest, setFScorerIsGuest] = useState(false);
  const [fScorerGuestName, setFScorerGuestName] = useState("");
  const [formLoading, setFormLoading] = useState(false);

  const fetchMatches = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("match_results")
      .select("id, title, opponent, match_date, score_us, score_them")
      .order("match_date", { ascending: false });
    setMatches(data ?? []);
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
    setActiveVideoIdx(0);

    const [{ data: scorerData }, { data: commentData }, { data: videoLinkData }] = await Promise.all([
      supabase.from("match_scorers").select("*").eq("match_id", match.id).order("display_order"),
      supabase.from("match_comments").select("*").eq("match_id", match.id).order("created_at"),
      supabase.from("match_result_videos").select("video_id, display_order").eq("match_id", match.id).order("display_order"),
    ]);

    const commentIds = (commentData ?? []).map((c) => c.id);
    const { data: likeData } = commentIds.length > 0
      ? await supabase.from("match_likes").select("comment_id, member_name").in("comment_id", commentIds)
      : { data: [] };

    setScorers((scorerData ?? []) as MatchScorer[]);
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
    if (match) {
      setFTitle(match.title ?? "");
      setFOpponent(match.opponent);
      setFDate(match.match_date);
      setFScoreUs(match.score_us);
      setFScoreThem(match.score_them);
      const [{ data: scorerData }, { data: videoLinkData }] = await Promise.all([
        supabase.from("match_scorers").select("*").eq("match_id", match.id).order("display_order"),
        supabase.from("match_result_videos").select("video_id, display_order").eq("match_id", match.id).order("display_order"),
      ]);
      setFScorers((scorerData ?? []).map((s) => ({ member_name: s.member_name, type: s.type as "goal" | "assist" })));
      setFVideoIds((videoLinkData ?? []).map((v) => v.video_id));
    } else {
      setFTitle(""); setFOpponent(""); setFDate("");
      setFScoreUs(0); setFScoreThem(0); setFVideoIds([]); setFScorers([]);
    }
    const { data: memberData } = await supabase.from("members").select("name").order("name");
    const names = (memberData ?? []).map((m) => m.name);
    setMembers(names);
    if (names.length > 0) setFScorerMember(names[0]);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fOpponent || !fDate) return;
    setFormLoading(true);
    try {
      let matchId: string;
      const fields = {
        title: fTitle || null,
        opponent: fOpponent,
        match_date: fDate,
        score_us: fScoreUs,
        score_them: fScoreThem,
      };
      if (editingMatch) {
        await supabase.from("match_results").update(fields).eq("id", editingMatch.id);
        matchId = editingMatch.id;
        await Promise.all([
          supabase.from("match_scorers").delete().eq("match_id", matchId),
          supabase.from("match_result_videos").delete().eq("match_id", matchId),
        ]);
      } else {
        const { data } = await supabase.from("match_results").insert({ ...fields, created_by: memberName }).select().single();
        matchId = data!.id;
      }
      if (fScorers.length > 0) {
        await supabase.from("match_scorers").insert(
          fScorers.map((s, i) => ({ match_id: matchId, member_name: s.member_name, type: s.type, display_order: i }))
        );
      }
      if (fVideoIds.length > 0) {
        await supabase.from("match_result_videos").insert(
          fVideoIds.map((vid, i) => ({ match_id: matchId, video_id: vid, display_order: i }))
        );
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
            const result = getResult(match.score_us, match.score_them);
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
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${result.bg} ${result.text} ${result.border}`}>{result.label}</span>
                </div>
                <p className="text-sm text-muted-foreground mb-3">vs {match.opponent}</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-black text-foreground">{match.score_us}</span>
                  <span className="text-xl text-muted-foreground font-light">-</span>
                  <span className="text-4xl font-black text-foreground">{match.score_them}</span>
                </div>
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
              className="relative w-full max-w-lg bg-card rounded-2xl shadow-2xl border border-border overflow-y-auto overflow-x-hidden max-h-[90vh]"
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

              <div className="p-6 sm:p-8">
                {detailLoading ? (
                  <div className="flex items-center justify-center py-16"><Loader2 size={28} className="animate-spin text-primary" /></div>
                ) : (
                  <>
                    <div className="mb-4">
                      {selectedMatch.title && <p className="text-xs text-muted-foreground mb-1">{selectedMatch.title}</p>}
                      <div className="flex items-center gap-3 mb-1">
                        <span className="text-sm text-muted-foreground">{formatDate(selectedMatch.match_date)}</span>
                        {(() => { const r = getResult(selectedMatch.score_us, selectedMatch.score_them); return <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${r.bg} ${r.text} ${r.border}`}>{r.label}</span>; })()}
                      </div>
                      <p className="text-xl font-bold text-foreground">vs {selectedMatch.opponent}</p>
                    </div>

                    <div className="flex items-baseline gap-3 mb-4">
                      <span className="text-5xl sm:text-7xl font-black text-foreground">{selectedMatch.score_us}</span>
                      <span className="text-2xl sm:text-3xl text-muted-foreground font-light">-</span>
                      <span className="text-5xl sm:text-7xl font-black text-foreground">{selectedMatch.score_them}</span>
                    </div>

                    {scorers.length > 0 && (
                      <div className="mb-4 bg-muted/30 rounded-xl p-3 space-y-1">
                        {scorers.filter((s) => s.type === "goal").length > 0 && (
                          <p className="text-sm text-foreground"><span className="mr-2">⚽</span>{scorers.filter((s) => s.type === "goal").map((s) => s.member_name).join("　")}</p>
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
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleComment(); } }}
                          placeholder="コメントを入力..."
                          className="flex-1 px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
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
              className="relative w-full max-w-lg bg-card rounded-2xl shadow-2xl border border-border overflow-y-auto overflow-x-hidden max-h-[90vh]"
            >
              <button onClick={() => setShowForm(false)} className="absolute top-4 right-4 p-2 bg-muted/50 hover:bg-muted rounded-full text-muted-foreground z-10"><X size={20} /></button>
              <div className="p-6 sm:p-8">
                <h2 className="text-xl font-bold text-foreground mb-6">{editingMatch ? "試合結果を編集" : "試合結果を追加"}</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1 block">試合名（任意）</label>
                    <input type="text" value={fTitle} onChange={(e) => setFTitle(e.target.value)} placeholder="例: 春季大会 1回戦" className={inputClass} />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1 block">対戦相手 *</label>
                    <input type="text" value={fOpponent} onChange={(e) => setFOpponent(e.target.value)} required placeholder="例: ○○高校" className={inputClass} />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1 block">日付 *</label>
                    <input type="date" value={fDate} onChange={(e) => setFDate(e.target.value)} required className={inputClass} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-medium text-foreground mb-1 block">自チーム</label>
                      <input type="number" min={0} value={fScoreUs} onChange={(e) => setFScoreUs(Number(e.target.value))} className={inputClass} />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground mb-1 block">相手チーム</label>
                      <input type="number" min={0} value={fScoreThem} onChange={(e) => setFScoreThem(Number(e.target.value))} className={inputClass} />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1 block">動画</label>
                    <select
                      value=""
                      onChange={(e) => {
                        const id = e.target.value;
                        if (id && !fVideoIds.includes(id)) setFVideoIds((prev) => [...prev, id]);
                      }}
                      className={inputClass}
                    >
                      <option value="">動画を選んで追加...</option>
                      {videoList.filter((v) => !fVideoIds.includes(v.id)).map((v) => (
                        <option key={v.id} value={v.id}>{v.title}</option>
                      ))}
                    </select>
                    {fVideoIds.length > 0 && (
                      <div className="mt-2 space-y-1.5">
                        {fVideoIds.map((id, i) => {
                          const v = videoList.find((x) => x.id === id);
                          if (!v) return null;
                          return (
                            <div key={id} className="flex items-center justify-between bg-muted/30 rounded-lg px-3 py-1.5">
                              <span className="text-sm text-foreground truncate">{v.title}</span>
                              <button type="button" onClick={() => setFVideoIds((prev) => prev.filter((_, idx) => idx !== i))} className="ml-2 text-muted-foreground hover:text-red-500 transition-colors shrink-0"><X size={14} /></button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">得点者・アシスト</label>
                    <div className="flex rounded-lg border border-border overflow-hidden mb-2 w-fit">
                      <button type="button" onClick={() => { setFScorerIsGuest(false); setFScorerGuestName(""); }} className={`px-3 py-1.5 text-xs font-semibold transition-colors ${!fScorerIsGuest ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>部員</button>
                      <button type="button" onClick={() => setFScorerIsGuest(true)} className={`px-3 py-1.5 text-xs font-semibold transition-colors ${fScorerIsGuest ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>助っ人</button>
                    </div>
                    <div className="flex gap-2 mb-2">
                      {fScorerIsGuest ? (
                        <input type="text" value={fScorerGuestName} onChange={(e) => setFScorerGuestName(e.target.value)} placeholder="名前を入力" className={`flex-1 ${inputClass}`} />
                      ) : (
                        <select value={fScorerMember} onChange={(e) => setFScorerMember(e.target.value)} className={`flex-1 ${inputClass}`}>
                          {members.map((m) => <option key={m} value={m}>{m}</option>)}
                        </select>
                      )}
                      <div className="flex rounded-lg border border-border overflow-hidden shrink-0">
                        <button type="button" onClick={() => setFScorerType("goal")} className={`px-2.5 py-2 text-xs font-semibold transition-colors ${fScorerType === "goal" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>⚽</button>
                        <button type="button" onClick={() => setFScorerType("assist")} className={`px-2.5 py-2 text-xs font-semibold transition-colors ${fScorerType === "assist" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>🤝</button>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const name = fScorerIsGuest ? fScorerGuestName.trim() : fScorerMember;
                          if (!name) return;
                          setFScorers((prev) => [...prev, { member_name: name, type: fScorerType, is_guest: fScorerIsGuest }]);
                          if (fScorerIsGuest) setFScorerGuestName("");
                        }}
                        className="px-3 py-2 rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                    {fScorers.length > 0 && (
                      <div className="space-y-1.5">
                        {fScorers.map((s, i) => (
                          <div key={i} className="flex items-center justify-between bg-muted/30 rounded-lg px-3 py-1.5">
                            <span className="text-sm text-foreground">
                              {s.type === "goal" ? "⚽" : "🤝"} {s.member_name}
                              {s.is_guest && <span className="ml-1.5 text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">助っ人</span>}
                            </span>
                            <button type="button" onClick={() => setFScorers((prev) => prev.filter((_, idx) => idx !== i))} className="text-muted-foreground hover:text-red-500 transition-colors"><X size={14} /></button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <button type="submit" disabled={formLoading} className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                    {formLoading && <Loader2 size={16} className="animate-spin" />}
                    {formLoading ? "保存中..." : editingMatch ? "更新する" : "保存する"}
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
