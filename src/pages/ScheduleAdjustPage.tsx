import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { CalendarCheck, Plus, X, Minus, Send, RotateCcw, ChevronLeft, Trash2, MessageCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

type Availability = "available" | "maybe" | "unavailable";

interface Event {
  id: string;
  title: string;
  description: string | null;
  created_by: string;
  created_at: string;
  decide_count: number;
}

interface EventDate {
  id: string;
  event_id: string;
  date: string;
  time_slot: string | null;
}

interface Response {
  id: string;
  event_id: string;
  member_name: string;
  date: string;
  time_slot: string | null;
  availability: Availability;
}

interface Comment {
  id: string;
  event_id: string;
  member_name: string;
  content: string;
  created_at: string;
}

const statusConfig = {
  available:   { label: "○", className: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30", score: 2 },
  maybe:       { label: "△", className: "bg-amber-500/15 text-amber-600 border-amber-500/30", score: 1 },
  unavailable: { label: "✕", className: "bg-destructive/10 text-destructive border-destructive/30", score: 0 },
};

const days = ["日", "月", "火", "水", "木", "金", "土"];

const formatDate = (dateStr: string) => {
  const d = new Date(dateStr + "T00:00:00");
  return `${d.getMonth() + 1}/${d.getDate()}(${days[d.getDay()]})`;
};

const formatSlotLabel = (date: string, timeSlot: string | null) => {
  const base = formatDate(date);
  return timeSlot ? `${base} ${timeSlot}` : base;
};

// ── イベント一覧 ──────────────────────────────────────────
const EventList = ({
  events, onSelect, onCreateNew, isStaff,
}: {
  events: Event[];
  onSelect: (e: Event) => void;
  onCreateNew: () => void;
  isStaff: boolean;
}) => (
  <div>
    <div className="flex items-center justify-between mb-6">
      <h1 className="font-display font-bold text-2xl sm:text-3xl text-foreground flex items-center gap-2">
        <CalendarCheck size={28} className="text-primary" />
        日程調整
      </h1>
      {isStaff && (
        <Button onClick={onCreateNew} className="gap-2">
          <Plus size={16} />新規作成
        </Button>
      )}
    </div>
    {events.length === 0 ? (
      <div className="text-center text-muted-foreground py-16">
        まだイベントがありません
        {isStaff && <p className="text-sm mt-2">「新規作成」からイベントを追加してください</p>}
      </div>
    ) : (
      <div className="space-y-3">
        {events.map((event, i) => (
          <motion.button
            key={event.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            onClick={() => onSelect(event)}
            className="w-full text-left p-4 rounded-xl border border-border bg-card hover:bg-muted/50 transition-all"
          >
            <div className="font-semibold text-foreground">{event.title}</div>
            {event.description && <div className="text-sm text-muted-foreground mt-1">{event.description}</div>}
            <div className="text-xs text-muted-foreground mt-2">
              作成者: {event.created_by} · {new Date(event.created_at).toLocaleDateString("ja-JP")}
            </div>
          </motion.button>
        ))}
      </div>
    )}
  </div>
);

// ── イベント作成 ──────────────────────────────────────────
const TIME_SLOTS = ["午前", "午後", "夜", "終日"];

const CreateEvent = ({
  memberName, onCreated, onCancel,
}: {
  memberName: string;
  onCreated: () => void;
  onCancel: () => void;
}) => {
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [decideCount, setDecideCount] = useState(1);
  const [selectedSlots, setSelectedSlots] = useState<{ date: string; timeSlot: string | null }[]>([]);
  const [customSlot, setCustomSlot] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const dateOptions: string[] = [];
  for (let i = 0; i < 90; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    dateOptions.push(d.toISOString().split("T")[0]);
  }

  const toggleSlot = (date: string, timeSlot: string | null) => {
    const key = `${date}_${timeSlot ?? ""}`;
    setSelectedSlots((prev) => {
      const exists = prev.some((s) => `${s.date}_${s.timeSlot ?? ""}` === key);
      if (exists) return prev.filter((s) => `${s.date}_${s.timeSlot ?? ""}` !== key);
      return [...prev, { date, timeSlot }];
    });
  };

  const isSelected = (date: string, timeSlot: string | null) =>
    selectedSlots.some((s) => s.date === date && s.timeSlot === timeSlot);

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast({ title: "タイトルを入力してください", variant: "destructive" });
      return;
    }
    if (selectedSlots.length === 0) {
      toast({ title: "候補日を1つ以上選択してください", variant: "destructive" });
      return;
    }
    setSubmitting(true);

    const { data: event, error } = await supabase
      .from("events")
      .insert({ title: title.trim(), description: description.trim() || null, created_by: memberName, decide_count: decideCount })
      .select()
      .single();

    if (error || !event) {
      toast({ title: "作成に失敗しました", variant: "destructive" });
      setSubmitting(false);
      return;
    }

    await supabase.from("event_dates").insert(
      selectedSlots.map((s) => ({ event_id: event.id, date: s.date, time_slot: s.timeSlot }))
    );

    toast({ title: "イベントを作成しました！" });
    onCreated();
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={onCancel}><ChevronLeft size={20} /></Button>
        <h1 className="font-display font-bold text-2xl text-foreground">イベント作成</h1>
      </div>

      <div className="space-y-4 mb-6">
        <div>
          <label className="text-sm font-medium text-foreground mb-1.5 block">タイトル</label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="例: 4月練習日程" className="h-11" />
        </div>
        <div>
          <label className="text-sm font-medium text-foreground mb-1.5 block">メモ（任意）</label>
          <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="例: 場所は第一体育館" className="h-11" />
        </div>
        <div>
          <label className="text-sm font-medium text-foreground mb-1.5 block">決定候補数（上位N日を色付け）</label>
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-10 w-10"
              onClick={() => setDecideCount((c) => Math.max(1, c - 1))}
              disabled={decideCount <= 1}
            >
              <Minus size={16} />
            </Button>
            <span className="text-lg font-bold text-foreground w-8 text-center">{decideCount}</span>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-10 w-10"
              onClick={() => setDecideCount((c) => c + 1)}
            >
              <Plus size={16} />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-1">スコア上位{decideCount}位の日程列がハイライトされます</p>
        </div>
      </div>

      <div className="mb-2 text-sm font-medium text-foreground">候補日・時間帯を選択</div>
      <p className="text-xs text-muted-foreground mb-3">日付を選んで時間帯ボタンを押すと追加できます。同じ日に複数の時間帯も追加可能です。</p>

      <div className="space-y-2 mb-4 max-h-80 overflow-y-auto pr-1">
        {dateOptions.map((date) => {
          const hasAny = selectedSlots.some((s) => s.date === date);
          return (
            <div key={date} className={`rounded-xl border p-3 transition-all ${hasAny ? "border-primary/50 bg-primary/5" : "border-border bg-card"}`}>
              <div className="text-sm font-medium text-foreground mb-2">{formatDate(date)}</div>
              <div className="flex flex-wrap gap-1.5">
                {TIME_SLOTS.map((slot) => (
                  <button
                    key={slot}
                    onClick={() => toggleSlot(date, slot)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
                      isSelected(date, slot)
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border bg-muted/50 text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {slot}
                  </button>
                ))}
                <div className="flex items-center gap-1">
                  <input
                    className="w-16 px-2 py-1 rounded-lg text-xs border border-border bg-muted/50 text-foreground"
                    placeholder="カスタム"
                    value={customSlot}
                    onChange={(e) => setCustomSlot(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && customSlot.trim()) {
                        toggleSlot(date, customSlot.trim());
                        setCustomSlot("");
                      }
                    }}
                  />
                  <button
                    onClick={() => { if (customSlot.trim()) { toggleSlot(date, customSlot.trim()); setCustomSlot(""); } }}
                    className="px-2 py-1 rounded-lg text-xs border border-border bg-muted/50 hover:bg-muted"
                  >
                    追加
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {selectedSlots.length > 0 && (
        <div className="mb-6 p-3 rounded-xl bg-primary/5 border border-primary/20">
          <div className="text-xs font-semibold text-primary mb-2">選択済み ({selectedSlots.length}件)</div>
          <div className="flex flex-wrap gap-1.5">
            {selectedSlots.sort((a, b) => a.date.localeCompare(b.date)).map((s) => (
              <span
                key={`${s.date}_${s.timeSlot}`}
                onClick={() => toggleSlot(s.date, s.timeSlot)}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-primary/10 text-primary border border-primary/20 cursor-pointer hover:bg-destructive/10 hover:text-destructive hover:border-destructive/20"
              >
                {formatSlotLabel(s.date, s.timeSlot)}
                <X size={10} />
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <Button onClick={handleSubmit} disabled={submitting} className="flex-1 h-11 font-semibold">
          {submitting ? "作成中..." : "作成する"}
        </Button>
        <Button variant="outline" onClick={onCancel} className="h-11">キャンセル</Button>
      </div>
    </div>
  );
};

// ── 集計テーブル ──────────────────────────────────────────
const SummaryTable = ({
  dates, responses, dateScores, topDateKeys, memberNames,
}: {
  dates: EventDate[];
  responses: Response[];
  dateScores: { date: string; time_slot: string | null; score: number }[];
  topDateKeys: Set<string>;
  memberNames: string[];
}) => (
  <div className="mb-8">
    <div className="text-sm font-semibold text-foreground mb-3">集計結果</div>
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/50">
            <th className="text-left px-3 py-2 font-medium text-muted-foreground sticky left-0 bg-muted/50">名前</th>
            {dates.map((d) => {
              const key = `${d.date}_${d.time_slot ?? ""}`;
              return (
                <th
                  key={key}
                  className={`px-3 py-2 font-medium text-center whitespace-nowrap ${
                    topDateKeys.has(key) ? "bg-primary/10 text-primary" : "text-muted-foreground"
                  }`}
                >
                  {formatSlotLabel(d.date, d.time_slot)}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {memberNames.map((name) => (
            <tr key={name} className="border-b border-border last:border-0">
              <td className="px-3 py-2 font-medium text-foreground whitespace-nowrap sticky left-0 bg-background">{name}</td>
              {dates.map((d) => {
                const key = `${d.date}_${d.time_slot ?? ""}`;
                const res = responses.find((r) => r.member_name === name && r.date === d.date && r.time_slot === d.time_slot);
                const cfg = res ? statusConfig[res.availability as Availability] : null;
                const isTop = topDateKeys.has(key);
                return (
                  <td key={key} className={`px-3 py-2 text-center ${isTop ? "bg-primary/5" : ""}`}>
                    {cfg ? (
                      <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold border ${cfg.className}`}>
                        {cfg.label}
                      </span>
                    ) : <span className="text-muted-foreground">-</span>}
                  </td>
                );
              })}
            </tr>
          ))}
          {/* スコア行 */}
          <tr className="bg-muted/30">
            <td className="px-3 py-2 font-semibold text-foreground text-sm sticky left-0 bg-muted/30">スコア</td>
            {dateScores.map((ds) => {
              const key = `${ds.date}_${ds.time_slot ?? ""}`;
              const isTop = topDateKeys.has(key);
              return (
                <td key={key} className={`px-3 py-2 text-center font-bold ${isTop ? "text-primary bg-primary/10" : "text-muted-foreground"}`}>
                  {ds.score}
                  {isTop && <span className="ml-0.5">★</span>}
                </td>
              );
            })}
          </tr>
        </tbody>
      </table>
    </div>
    <p className="text-xs text-muted-foreground mt-2">○=2点、△=1点で集計。★が候補日程</p>
  </div>
);

// ── 回答・集計・コメント ──────────────────────────────────────────
const EventDetail = ({
  event, memberName, isStaff, onBack, onDeleted,
}: {
  event: Event;
  memberName: string;
  isStaff: boolean;
  onBack: () => void;
  onDeleted: () => void;
}) => {
  const { toast } = useToast();
  const [dates, setDates] = useState<EventDate[]>([]);
  const [responses, setResponses] = useState<Response[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [mySelections, setMySelections] = useState<Record<string, Availability | null>>({});
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [sendingComment, setSendingComment] = useState(false);
  const [updatingResponse, setUpdatingResponse] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data: datesData } = await supabase
        .from("event_dates").select("*").eq("event_id", event.id).order("date");
      const { data: responsesData } = await supabase
        .from("responses").select("*").eq("event_id", event.id);
      const { data: commentsData } = await supabase
        .from("comments").select("*").eq("event_id", event.id).order("created_at");

      setDates((datesData ?? []) as EventDate[]);
      setResponses((responsesData ?? []) as Response[]);
      setComments(commentsData as Comment[] ?? []);

      // mySelections は EventDate の id をキーとして管理する
      const mine: Record<string, Availability | null> = {};
      (responsesData ?? [])
        .filter((r) => r.member_name === memberName)
        .forEach((r) => {
          const dateSlot = (datesData ?? []).find(
            (d) => d.date === r.date && d.time_slot === r.time_slot
          );
          if (dateSlot) mine[dateSlot.id] = r.availability as Availability;
        });

      if (Object.keys(mine).length > 0) {
        setMySelections(mine);
        setSubmitted(true);
      }
      setLoading(false);
    };
    load();
  }, [event.id, memberName]);

  const cycleStatus = (eventDateId: string) => {
    const order: (Availability | null)[] = [null, "available", "maybe", "unavailable"];
    const current = mySelections[eventDateId] ?? null;
    const idx = order.indexOf(current);
    setMySelections((prev) => ({ ...prev, [eventDateId]: order[(idx + 1) % order.length] }));
  };

  const handleSubmit = async () => {
    const entries = Object.entries(mySelections).filter(([, v]) => v !== null);
    if (entries.length === 0) {
      toast({ title: "1日以上回答してください", variant: "destructive" });
      return;
    }
    setUpdatingResponse(true);

    await supabase.from("responses").delete()
      .eq("event_id", event.id).eq("member_name", memberName);

    await supabase.from("responses").insert(
      entries.map(([eventDateId, availability]) => {
        const dateSlot = dates.find((d) => d.id === eventDateId)!;
        return {
          event_id: event.id,
          member_name: memberName,
          date: dateSlot.date,
          time_slot: dateSlot.time_slot,
          availability: availability as Availability,
        };
      })
    );

    const { data: responsesData } = await supabase
      .from("responses").select("*").eq("event_id", event.id);
    setResponses((responsesData ?? []) as Response[]);
    setSubmitted(true);
    setUpdatingResponse(false);
    toast({ title: submitted ? "回答を更新しました！" : "回答を送信しました！" });
  };

  const handleSendComment = async () => {
    if (!newComment.trim()) return;
    setSendingComment(true);
    await supabase.from("comments").insert({
      event_id: event.id, member_name: memberName, content: newComment.trim(),
    });
    const { data } = await supabase
      .from("comments").select("*").eq("event_id", event.id).order("created_at");
    setComments((data as Comment[]) ?? []);
    setNewComment("");
    setSendingComment(false);
  };

  const handleDeleteComment = async (id: string) => {
    await supabase.from("comments").delete().eq("id", id);
    setComments((prev) => prev.filter((c) => c.id !== id));
  };

  const handleDelete = async () => {
    if (!confirm(`「${event.title}」を削除しますか？`)) return;
    await supabase.from("events").delete().eq("id", event.id);
    toast({ title: "イベントを削除しました" });
    onDeleted();
  };

  // 集計
  const memberNames = [...new Set(responses.map((r) => r.member_name))];
  const dateScores = dates.map((d) => {
    const score = responses
      .filter((r) => r.date === d.date && r.time_slot === d.time_slot)
      .reduce((sum, r) => sum + (statusConfig[r.availability as Availability]?.score ?? 0), 0);
    return { date: d.date, time_slot: d.time_slot, score };
  });

  // 上位N位の日程を算出（同点は全て含む）
  const decideCount = event.decide_count ?? 1;
  const uniqueScores = [...new Set(dateScores.map((d) => d.score))].filter((s) => s > 0).sort((a, b) => b - a);
  const topNThreshold = uniqueScores.length >= decideCount ? uniqueScores[decideCount - 1] : 0;
  const topDateKeys = new Set(
    dateScores.filter((d) => d.score > 0 && d.score >= topNThreshold).map((d) => `${d.date}_${d.time_slot ?? ""}`)
  );

  if (loading) return <div className="text-center py-16 text-muted-foreground">読み込み中...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-2 gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Button variant="ghost" size="icon" onClick={onBack} className="flex-shrink-0"><ChevronLeft size={20} /></Button>
          <h1 className="font-display font-bold text-xl sm:text-2xl text-foreground truncate">{event.title}</h1>
        </div>
        {isStaff && (
          <Button variant="ghost" size="icon" onClick={handleDelete} className="text-destructive hover:text-destructive flex-shrink-0">
            <Trash2 size={18} />
          </Button>
        )}
      </div>
      {event.description && <p className="text-sm text-muted-foreground mb-6 ml-12">{event.description}</p>}

      {/* 回答エリア */}
      <div className={`mb-8 ${submitted ? "p-4 rounded-xl border border-border bg-muted/20" : ""}`}>
        <div className="text-sm font-semibold text-foreground mb-3">
          {submitted ? "回答を変更する" : "参加可否を入力してください"}
        </div>
        {!submitted && (
          <div className="flex flex-wrap gap-3 mb-4">
            {Object.entries(statusConfig).map(([key, cfg]) => (
              <div key={key} className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.className}`}>
                {cfg.label} {key === "available" ? "参加可" : key === "maybe" ? "未定" : "不可"}
              </div>
            ))}
          </div>
        )}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
          {dates.map((slot) => {
            const status = mySelections[slot.id] ?? null;
            const cfg = status ? statusConfig[status] : null;
            return (
              <button
                key={slot.id}
                onClick={() => cycleStatus(slot.id)}
                className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                  cfg ? cfg.className : "border-border bg-card hover:bg-muted/50 text-foreground"
                }`}
              >
                <span className="text-sm font-medium">{formatSlotLabel(slot.date, slot.time_slot)}</span>
                {cfg && <span className="text-base font-bold">{cfg.label}</span>}
              </button>
            );
          })}
        </div>
        <div className="flex gap-3">
          <Button onClick={handleSubmit} disabled={updatingResponse} className={`h-11 gap-2 font-semibold ${submitted ? "" : "flex-1"}`}>
            <Send size={16} />
            {updatingResponse ? "送信中..." : submitted ? "回答を更新する" : "回答を送信"}
          </Button>
          {!submitted && (
            <Button variant="outline" onClick={() => setMySelections({})} className="h-11 gap-2">
              <RotateCcw size={16} />リセット
            </Button>
          )}
        </div>
      </div>

      {/* 集計テーブル */}
      {responses.length > 0 && (
        <SummaryTable
          dates={dates}
          responses={responses}
          dateScores={dateScores}
          topDateKeys={topDateKeys}
          memberNames={memberNames}
        />
      )}

      {/* コメント（集計テーブルの下） */}
      <div>
        <div className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <MessageCircle size={16} className="text-primary" />
          コメント（{comments.length}）
        </div>
        <div className="space-y-3 mb-4">
          {comments.length === 0 && (
            <div className="text-sm text-muted-foreground text-center py-4">まだコメントはありません</div>
          )}
          {comments.map((c) => (
            <div key={c.id} className="p-3 rounded-xl border border-border bg-card">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-foreground">{c.member_name}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {new Date(c.created_at).toLocaleDateString("ja-JP")}
                  </span>
                  {(c.member_name === memberName || isStaff) && (
                    <button onClick={() => handleDeleteComment(c.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                      <X size={12} />
                    </button>
                  )}
                </div>
              </div>
              <p className="text-sm text-foreground">{c.content}</p>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="コメントを入力..."
            className="h-10"
            onKeyDown={(e) => { if (e.key === "Enter") handleSendComment(); }}
          />
          <Button onClick={handleSendComment} disabled={sendingComment || !newComment.trim()} className="h-10 gap-1.5">
            <Send size={14} />送信
          </Button>
        </div>
      </div>
    </div>
  );
};

// ── メインページ ──────────────────────────────────────────
const ScheduleAdjustPage = () => {
  const { memberName, isStaff } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [view, setView] = useState<"list" | "create" | "detail">("list");
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

  const loadEvents = async () => {
    const { data } = await supabase.from("events").select("*").order("created_at", { ascending: false });
    setEvents((data as Event[]) ?? []);
  };

  useEffect(() => { loadEvents(); }, []);

  return (
    <div className="container py-8 sm:py-10 max-w-2xl">
      {view === "list" && (
        <EventList
          events={events}
          onSelect={(e) => { setSelectedEvent(e); setView("detail"); }}
          onCreateNew={() => setView("create")}
          isStaff={isStaff}
        />
      )}
      {view === "create" && (
        <CreateEvent
          memberName={memberName}
          onCreated={() => { loadEvents(); setView("list"); }}
          onCancel={() => setView("list")}
        />
      )}
      {view === "detail" && selectedEvent && (
        <EventDetail
          event={selectedEvent}
          memberName={memberName}
          isStaff={isStaff}
          onBack={() => setView("list")}
          onDeleted={() => { loadEvents(); setView("list"); }}
        />
      )}
    </div>
  );
};

export default ScheduleAdjustPage;
