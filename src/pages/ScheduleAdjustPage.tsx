import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { CalendarCheck, Plus, Check, X, Minus, Send, RotateCcw, ChevronLeft, Trash2 } from "lucide-react";
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
}

interface EventDate {
  id: string;
  event_id: string;
  date: string;
}

interface Response {
  id: string;
  event_id: string;
  member_name: string;
  date: string;
  availability: Availability;
}

const statusConfig = {
  available: { label: "○", className: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30" },
  maybe:     { label: "△", className: "bg-amber-500/15 text-amber-600 border-amber-500/30" },
  unavailable: { label: "✕", className: "bg-destructive/10 text-destructive border-destructive/30" },
};

const days = ["日", "月", "火", "水", "木", "金", "土"];

const formatDate = (dateStr: string) => {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}(${days[d.getDay()]})`;
};

// ── イベント一覧 ──────────────────────────────────────────
const EventList = ({
  events,
  onSelect,
  onCreateNew,
  isStaff,
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
          <Plus size={16} />
          新規作成
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
            {event.description && (
              <div className="text-sm text-muted-foreground mt-1">{event.description}</div>
            )}
            <div className="text-xs text-muted-foreground mt-2">
              作成者: {event.created_by} ·{" "}
              {new Date(event.created_at).toLocaleDateString("ja-JP")}
            </div>
          </motion.button>
        ))}
      </div>
    )}
  </div>
);

// ── イベント作成 ──────────────────────────────────────────
const CreateEvent = ({
  memberName,
  onCreated,
  onCancel,
}: {
  memberName: string;
  onCreated: () => void;
  onCancel: () => void;
}) => {
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // 今日から60日分の候補日を生成
  const dateOptions: string[] = [];
  for (let i = 0; i < 60; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    dateOptions.push(d.toISOString().split("T")[0]);
  }

  const toggleDate = (date: string) => {
    setSelectedDates((prev) =>
      prev.includes(date) ? prev.filter((d) => d !== date) : [...prev, date].sort()
    );
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast({ title: "タイトルを入力してください", variant: "destructive" });
      return;
    }
    if (selectedDates.length === 0) {
      toast({ title: "候補日を1日以上選択してください", variant: "destructive" });
      return;
    }
    setSubmitting(true);

    const { data: event, error } = await supabase
      .from("events")
      .insert({ title: title.trim(), description: description.trim() || null, created_by: memberName })
      .select()
      .single();

    if (error || !event) {
      toast({ title: "作成に失敗しました", variant: "destructive" });
      setSubmitting(false);
      return;
    }

    await supabase.from("event_dates").insert(
      selectedDates.map((date) => ({ event_id: event.id, date }))
    );

    toast({ title: "イベントを作成しました！" });
    onCreated();
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={onCancel}>
          <ChevronLeft size={20} />
        </Button>
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
      </div>

      <div className="mb-2 text-sm font-medium text-foreground">候補日を選択</div>
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-8 max-h-72 overflow-y-auto pr-1">
        {dateOptions.map((date) => {
          const selected = selectedDates.includes(date);
          return (
            <button
              key={date}
              onClick={() => toggleDate(date)}
              className={`p-2.5 rounded-lg border text-sm font-medium transition-all ${
                selected
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border bg-card hover:bg-muted/50 text-foreground"
              }`}
            >
              {formatDate(date)}
            </button>
          );
        })}
      </div>

      <div className="flex gap-3">
        <Button onClick={handleSubmit} disabled={submitting} className="flex-1 h-11 font-semibold">
          {submitting ? "作成中..." : "作成する"}
        </Button>
        <Button variant="outline" onClick={onCancel} className="h-11">キャンセル</Button>
      </div>
    </div>
  );
};

// ── 回答・集計 ──────────────────────────────────────────
const EventDetail = ({
  event,
  memberName,
  isStaff,
  onBack,
  onDeleted,
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
  const [mySelections, setMySelections] = useState<Record<string, Availability | null>>({});
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data: datesData } = await supabase
        .from("event_dates")
        .select("*")
        .eq("event_id", event.id)
        .order("date");

      const { data: responsesData } = await supabase
        .from("responses")
        .select("*")
        .eq("event_id", event.id);

      setDates(datesData ?? []);
      setResponses((responsesData ?? []) as Response[]);

      // 自分の回答を復元
      const mine: Record<string, Availability | null> = {};
      (responsesData ?? [])
        .filter((r) => r.member_name === memberName)
        .forEach((r) => { mine[r.date] = r.availability as Availability; });

      if (Object.keys(mine).length > 0) {
        setMySelections(mine);
        setSubmitted(true);
      }
      setLoading(false);
    };
    load();
  }, [event.id, memberName]);

  const cycleStatus = (date: string) => {
    const order: (Availability | null)[] = [null, "available", "maybe", "unavailable"];
    const current = mySelections[date] ?? null;
    const idx = order.indexOf(current);
    setMySelections((prev) => ({ ...prev, [date]: order[(idx + 1) % order.length] }));
  };

  const handleSubmit = async () => {
    const entries = Object.entries(mySelections).filter(([, v]) => v !== null);
    if (entries.length === 0) {
      toast({ title: "1日以上回答してください", variant: "destructive" });
      return;
    }

    // 既存の自分の回答を削除してから再挿入
    await supabase.from("responses").delete()
      .eq("event_id", event.id)
      .eq("member_name", memberName);

    await supabase.from("responses").insert(
      entries.map(([date, availability]) => ({
        event_id: event.id,
        member_name: memberName,
        date,
        availability: availability as Availability,
      }))
    );

    // ローカルのresponsesを更新
    const { data: responsesData } = await supabase
      .from("responses").select("*").eq("event_id", event.id);
    setResponses((responsesData ?? []) as Response[]);
    setSubmitted(true);
    toast({ title: "回答を送信しました！" });
  };

  const handleDelete = async () => {
    if (!confirm(`「${event.title}」を削除しますか？`)) return;
    await supabase.from("events").delete().eq("id", event.id);
    toast({ title: "イベントを削除しました" });
    onDeleted();
  };

  // 集計：日付ごとに回答者をまとめる
  const memberNames = [...new Set(responses.map((r) => r.member_name))];

  if (loading) return <div className="text-center py-16 text-muted-foreground">読み込み中...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ChevronLeft size={20} />
          </Button>
          <h1 className="font-display font-bold text-xl sm:text-2xl text-foreground">{event.title}</h1>
        </div>
        {isStaff && (
          <Button variant="ghost" size="icon" onClick={handleDelete} className="text-destructive hover:text-destructive">
            <Trash2 size={18} />
          </Button>
        )}
      </div>

      {event.description && (
        <p className="text-sm text-muted-foreground mb-6">{event.description}</p>
      )}

      {/* 自分の回答エリア */}
      <div className="mb-8">
        <div className="text-sm font-semibold text-foreground mb-3">
          {submitted ? "あなたの回答（変更可）" : "参加可否を入力してください"}
        </div>
        <div className="flex flex-wrap gap-3 mb-4">
          {Object.entries(statusConfig).map(([key, cfg]) => (
            <div key={key} className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.className}`}>
              {cfg.label} {key === "available" ? "参加可" : key === "maybe" ? "未定" : "不可"}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
          {dates.map((slot) => {
            const status = mySelections[slot.date] ?? null;
            const cfg = status ? statusConfig[status] : null;
            return (
              <button
                key={slot.date}
                onClick={() => cycleStatus(slot.date)}
                className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                  cfg ? cfg.className : "border-border bg-card hover:bg-muted/50 text-foreground"
                }`}
              >
                <span className="text-sm font-medium">{formatDate(slot.date)}</span>
                {cfg && <span className="text-base font-bold">{cfg.label}</span>}
              </button>
            );
          })}
        </div>
        <div className="flex gap-3">
          <Button onClick={handleSubmit} className="flex-1 h-11 gap-2 font-semibold">
            <Send size={16} />
            {submitted ? "回答を更新する" : "回答を送信"}
          </Button>
          {submitted && (
            <Button variant="outline" onClick={() => { setMySelections({}); setSubmitted(false); }} className="h-11 gap-2">
              <RotateCcw size={16} />
              リセット
            </Button>
          )}
        </div>
      </div>

      {/* 集計表 */}
      {responses.length > 0 && (
        <div>
          <div className="text-sm font-semibold text-foreground mb-3">集計結果</div>
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left px-3 py-2 font-medium text-muted-foreground">名前</th>
                  {dates.map((d) => (
                    <th key={d.date} className="px-3 py-2 font-medium text-muted-foreground text-center whitespace-nowrap">
                      {formatDate(d.date)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {memberNames.map((name) => (
                  <tr key={name} className="border-b border-border last:border-0">
                    <td className="px-3 py-2 font-medium text-foreground whitespace-nowrap">{name}</td>
                    {dates.map((d) => {
                      const res = responses.find((r) => r.member_name === name && r.date === d.date);
                      const cfg = res ? statusConfig[res.availability as Availability] : null;
                      return (
                        <td key={d.date} className="px-3 py-2 text-center">
                          {cfg ? (
                            <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold border ${cfg.className}`}>
                              {cfg.label}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
                {/* ○の合計行 */}
                <tr className="bg-emerald-500/5">
                  <td className="px-3 py-2 font-semibold text-emerald-600 text-sm">○合計</td>
                  {dates.map((d) => {
                    const count = responses.filter((r) => r.date === d.date && r.availability === "available").length;
                    return (
                      <td key={d.date} className="px-3 py-2 text-center font-bold text-emerald-600">
                        {count}
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
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
    setEvents(data ?? []);
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