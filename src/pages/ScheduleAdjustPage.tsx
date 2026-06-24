import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { CalendarCheck, Plus, X, Minus, Send, RotateCcw, ChevronLeft, Trash2, MessageCircle, Edit2, Lock, Unlock, Users } from "lucide-react";
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
  target_type: string[];
  target_members: string[];
  is_closed: boolean;
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

interface Member {
  name: string;
  grade: string | null;
}

const TARGET_LABELS: Record<string, string> = {
  all: "全員",
  "1年生": "1年生",
  "2年生": "2年生",
  "3年生": "3年生",
  custom: "個人指定",
};

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

const checkIsTarget = (event: Event, memberName: string, memberGrade: string | null): boolean => {
  const types = event.target_type ?? ["all"];
  if (types.includes("all")) return true;
  if (memberGrade && types.includes(memberGrade)) return true;
  if (types.includes("custom") && (event.target_members ?? []).includes(memberName)) return true;
  return false;
};

// ── ターゲット選択UI ──────────────────────────────────────────
const TargetSelector = ({
  value, onChange, targetMembers, onTargetMembersChange, allMembers,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  targetMembers: string[];
  onTargetMembersChange: (names: string[]) => void;
  allMembers: Member[];
}) => {
  const grades = ["1年生", "2年生", "3年生"];

  const toggleOption = (t: string) => {
    if (t === "all") {
      onChange(["all"]);
      return;
    }
    const without = value.filter((v) => v !== "all");
    const next = without.includes(t)
      ? without.filter((v) => v !== t)
      : [...without, t];
    onChange(next.length === 0 ? ["all"] : next);
  };

  const toggleMember = (name: string) => {
    onTargetMembersChange(
      targetMembers.includes(name)
        ? targetMembers.filter((n) => n !== name)
        : [...targetMembers, name]
    );
  };

  const isActive = (t: string) => value.includes(t);

  return (
    <div>
      <label className="text-sm font-medium text-foreground mb-1.5 block">対象者</label>
      <div className="flex flex-wrap gap-2 mb-3">
        <button
          type="button"
          onClick={() => toggleOption("all")}
          className={`px-3 py-1.5 rounded-full text-sm font-semibold border transition-all ${
            isActive("all")
              ? "bg-primary text-primary-foreground border-primary"
              : "border-border bg-muted/50 text-muted-foreground hover:bg-muted"
          }`}
        >
          全員
        </button>
        {grades.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => toggleOption(t)}
            className={`px-3 py-1.5 rounded-full text-sm font-semibold border transition-all ${
              isActive(t)
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border bg-muted/50 text-muted-foreground hover:bg-muted"
            }`}
          >
            {t}
          </button>
        ))}
        <button
          type="button"
          onClick={() => toggleOption("custom")}
          className={`px-3 py-1.5 rounded-full text-sm font-semibold border transition-all ${
            isActive("custom")
              ? "bg-primary text-primary-foreground border-primary"
              : "border-border bg-muted/50 text-muted-foreground hover:bg-muted"
          }`}
        >
          個人指定
        </button>
      </div>
      {isActive("custom") && (
        <div className="rounded-xl border border-border bg-muted/30 p-3 max-h-48 overflow-y-auto">
          <div className="text-xs text-muted-foreground mb-2">
            メンバーを選択（{targetMembers.length}人選択中）
          </div>
          <div className="space-y-1">
            {allMembers.map((m) => (
              <label
                key={m.name}
                className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 rounded-lg px-2 py-1"
              >
                <input
                  type="checkbox"
                  checked={targetMembers.includes(m.name)}
                  onChange={() => toggleMember(m.name)}
                  className="accent-primary"
                />
                <span className="text-sm text-foreground">{m.name}</span>
                {m.grade && (
                  <span className="text-xs text-muted-foreground">{m.grade}</span>
                )}
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ── イベント一覧 ──────────────────────────────────────────
const EventList = ({
  events, onSelect, onCreateNew, isStaff, memberName, memberGrade,
}: {
  events: Event[];
  onSelect: (e: Event) => void;
  onCreateNew: () => void;
  isStaff: boolean;
  memberName: string;
  memberGrade: string | null;
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
        {events.map((event, i) => {
          const isTarget = checkIsTarget(event, memberName, memberGrade);
          return (
            <motion.button
              key={event.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => onSelect(event)}
              className="w-full text-left p-4 rounded-xl border border-border bg-card hover:bg-muted/50 transition-all"
            >
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <div className="font-semibold text-foreground">{event.title}</div>
                <div className="flex items-center gap-1.5 flex-shrink-0 flex-wrap">
                  {event.is_closed && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-muted text-muted-foreground border border-border">
                      <Lock size={10} />締め切り済み
                    </span>
                  )}
                  {!(event.target_type ?? []).includes("all") && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-600 border border-blue-500/20">
                      <Users size={10} />
                      {(event.target_type ?? []).map((t) => TARGET_LABELS[t] ?? t).join("・")}対象
                    </span>
                  )}
                  {!isTarget ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-muted/50 text-muted-foreground border border-border">
                      関係なし
                    </span>
                  ) : !event.is_closed ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                      投票してください
                    </span>
                  ) : null}
                </div>
              </div>
              {event.description && (
                <div className="text-sm text-muted-foreground mt-1">{event.description}</div>
              )}
              <div className="text-xs text-muted-foreground mt-2">
                作成者: {event.created_by} · {new Date(event.created_at).toLocaleDateString("ja-JP")}
              </div>
            </motion.button>
          );
        })}
      </div>
    )}
  </div>
);

// ── イベント作成 ──────────────────────────────────────────
const TIME_SLOTS = ["午前", "午後", "夜", "A時間帯", "B時間帯", "終日"];

const CreateEvent = ({
  memberName, allMembers, onCreated, onCancel,
}: {
  memberName: string;
  allMembers: Member[];
  onCreated: () => void;
  onCancel: () => void;
}) => {
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [decideCount, setDecideCount] = useState(1);
  const [targetType, setTargetType] = useState<string[]>(["all"]);
  const [targetMembers, setTargetMembers] = useState<string[]>([]);
  const [selectedSlots, setSelectedSlots] = useState<{ date: string; timeSlot: string | null }[]>([]);
  const [customSlot, setCustomSlot] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const dateOptions: string[] = [];
  for (let i = -30; i < 90; i++) {
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
    if (targetType.includes("custom") && targetMembers.length === 0) {
      toast({ title: "個人指定の場合は1人以上選択してください", variant: "destructive" });
      return;
    }
    setSubmitting(true);

    const { data: event, error } = await supabase
      .from("events")
      .insert({
        title: title.trim(),
        description: description.trim() || null,
        created_by: memberName,
        decide_count: decideCount,
        target_type: targetType,
        target_members: targetType.includes("custom") ? targetMembers : [],
      })
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
        <TargetSelector
          value={targetType}
          onChange={setTargetType}
          targetMembers={targetMembers}
          onTargetMembersChange={setTargetMembers}
          allMembers={allMembers}
        />
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

// ── イベント編集 ──────────────────────────────────────────
const EditEvent = ({
  event, dates, allMembers, onUpdated, onCancel,
}: {
  event: Event;
  dates: EventDate[];
  allMembers: Member[];
  onUpdated: (updatedEvent: Event, updatedDates: EventDate[]) => void;
  onCancel: () => void;
}) => {
  const { toast } = useToast();
  const [title, setTitle] = useState(event.title);
  const [description, setDescription] = useState(event.description ?? "");
  const [decideCount, setDecideCount] = useState(event.decide_count);
  const [targetType, setTargetType] = useState<string[]>(
    Array.isArray(event.target_type) ? event.target_type : [event.target_type ?? "all"]
  );
  const [targetMembers, setTargetMembers] = useState<string[]>(event.target_members ?? []);
  const [selectedSlots, setSelectedSlots] = useState<{ date: string; timeSlot: string | null }[]>(
    dates.map((d) => ({ date: d.date, timeSlot: d.time_slot }))
  );
  const [customSlot, setCustomSlot] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const futureOptions: string[] = [];
  for (let i = -30; i < 90; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    futureOptions.push(d.toISOString().split("T")[0]);
  }
  const pastSelected = dates.map((d) => d.date).filter((d) => !futureOptions.includes(d));
  const allDates = [...new Set([...pastSelected, ...futureOptions])].sort();

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
    if (targetType.includes("custom") && targetMembers.length === 0) {
      toast({ title: "個人指定の場合は1人以上選択してください", variant: "destructive" });
      return;
    }
    setSubmitting(true);

    const { data: updatedEvent, error: updateError } = await supabase
      .from("events")
      .update({
        title: title.trim(),
        description: description.trim() || null,
        decide_count: decideCount,
        target_type: targetType,
        target_members: targetType.includes("custom") ? targetMembers : [],
      })
      .eq("id", event.id)
      .select()
      .single();

    if (updateError || !updatedEvent) {
      toast({ title: "更新に失敗しました", variant: "destructive" });
      setSubmitting(false);
      return;
    }

    const existingKeys = new Set(dates.map((d) => `${d.date}_${d.time_slot ?? ""}`));
    const newKeys = new Set(selectedSlots.map((s) => `${s.date}_${s.timeSlot ?? ""}`));
    const addedSlots = selectedSlots.filter((s) => !existingKeys.has(`${s.date}_${s.timeSlot ?? ""}`));
    const removedDates = dates.filter((d) => !newKeys.has(`${d.date}_${d.time_slot ?? ""}`));

    for (const d of removedDates) {
      if (d.time_slot === null) {
        await supabase.from("responses").delete().eq("event_id", event.id).eq("date", d.date).is("time_slot", null);
      } else {
        await supabase.from("responses").delete().eq("event_id", event.id).eq("date", d.date).eq("time_slot", d.time_slot);
      }
    }
    if (removedDates.length > 0) {
      await supabase.from("event_dates").delete().in("id", removedDates.map((d) => d.id));
    }
    if (addedSlots.length > 0) {
      await supabase.from("event_dates").insert(
        addedSlots.map((s) => ({ event_id: event.id, date: s.date, time_slot: s.timeSlot }))
      );
    }

    const { data: refreshedDates } = await supabase
      .from("event_dates").select("*").eq("event_id", event.id).order("date");

    toast({ title: "イベントを更新しました！" });
    setSubmitting(false);
    onUpdated(updatedEvent as Event, (refreshedDates ?? []) as EventDate[]);
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={onCancel}><ChevronLeft size={20} /></Button>
        <h1 className="font-display font-bold text-2xl text-foreground">イベント編集</h1>
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
        <TargetSelector
          value={targetType}
          onChange={setTargetType}
          targetMembers={targetMembers}
          onTargetMembersChange={setTargetMembers}
          allMembers={allMembers}
        />
        <div>
          <label className="text-sm font-medium text-foreground mb-1.5 block">決定候補数（上位N日を色付け）</label>
          <div className="flex items-center gap-3">
            <Button type="button" variant="outline" size="icon" className="h-10 w-10" onClick={() => setDecideCount((c) => Math.max(1, c - 1))} disabled={decideCount <= 1}>
              <Minus size={16} />
            </Button>
            <span className="text-lg font-bold text-foreground w-8 text-center">{decideCount}</span>
            <Button type="button" variant="outline" size="icon" className="h-10 w-10" onClick={() => setDecideCount((c) => c + 1)}>
              <Plus size={16} />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-1">スコア上位{decideCount}位の日程列がハイライトされます</p>
        </div>
      </div>

      <div className="mb-2 text-sm font-medium text-foreground">候補日・時間帯を選択</div>
      <p className="text-xs text-muted-foreground mb-3">追加・削除が可能です。削除した候補日の回答も同時に削除されます。</p>

      <div className="space-y-2 mb-4 max-h-80 overflow-y-auto pr-1">
        {allDates.map((date) => {
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
                      isSelected(date, slot) ? "bg-primary text-primary-foreground border-primary" : "border-border bg-muted/50 text-muted-foreground hover:bg-muted"
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
          {submitting ? "更新中..." : "更新する"}
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
    <div className="overflow-x-auto overflow-y-scroll max-h-96 rounded-xl border border-border">
      <table className="w-full text-sm">
        <thead className="sticky top-0 z-10">
          <tr className="border-b border-border bg-muted/50">
            <th className="text-left px-3 py-2 font-medium text-muted-foreground sticky left-0 z-20 bg-muted/50">名前</th>
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
  event, memberName, memberGrade, isStaff, allMembers, onBack, onDeleted, onUpdated,
}: {
  event: Event;
  memberName: string;
  memberGrade: string | null;
  isStaff: boolean;
  allMembers: Member[];
  onBack: () => void;
  onDeleted: () => void;
  onUpdated: (updatedEvent: Event) => void;
}) => {
  const { toast } = useToast();
  const [currentEvent, setCurrentEvent] = useState<Event>(event);
  const [isEditing, setIsEditing] = useState(false);
  const [dates, setDates] = useState<EventDate[]>([]);
  const [responses, setResponses] = useState<Response[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [mySelections, setMySelections] = useState<Record<string, Availability | null>>({});
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [sendingComment, setSendingComment] = useState(false);
  const [updatingResponse, setUpdatingResponse] = useState(false);
  const [closingEvent, setClosingEvent] = useState(false);

  const isTarget = checkIsTarget(currentEvent, memberName, memberGrade);
  const canVote = isTarget && !currentEvent.is_closed;

  useEffect(() => {
    const load = async () => {
      const { data: datesData } = await supabase
        .from("event_dates").select("*").eq("event_id", currentEvent.id).order("date");
      const { data: responsesData } = await supabase
        .from("responses").select("*").eq("event_id", currentEvent.id);
      const { data: commentsData } = await supabase
        .from("comments").select("*").eq("event_id", currentEvent.id).order("created_at");

      setDates((datesData ?? []) as EventDate[]);
      setResponses((responsesData ?? []) as Response[]);
      setComments(commentsData as Comment[] ?? []);

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
  }, [currentEvent.id, memberName]);

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

    const insertRows = entries.map(([eventDateId, availability]) => {
      const dateSlot = dates.find((d) => d.id === eventDateId)!;
      return {
        event_id: event.id,
        member_name: memberName,
        date: dateSlot.date,
        time_slot: dateSlot.time_slot,
        availability: availability as Availability,
      };
    });

    const { data: existingData } = await supabase
      .from("responses").select("id")
      .eq("event_id", event.id).eq("member_name", memberName);
    const existingIds = (existingData ?? []).map((r: any) => r.id);

    // 先に自分の既存回答を削除してから挿入する。
    // (event_id, member_name, date, time_slot) にユニーク制約があるため、
    // 削除より先に挿入すると再投票（変更）時に必ず重複エラーになる。
    if (existingIds.length > 0) {
      await supabase.from("responses").delete().in("id", existingIds);
    }

    const { error: insertError } = await supabase.from("responses").insert(insertRows);
    if (insertError) {
      toast({ title: "送信に失敗しました", description: insertError.message, variant: "destructive" });
      setUpdatingResponse(false);
      return;
    }

    const { data: responsesData } = await supabase
      .from("responses").select("*").eq("event_id", event.id);
    setResponses((responsesData ?? []) as Response[]);
    setSubmitted(true);
    setUpdatingResponse(false);
    toast({ title: submitted ? "回答を更新しました！" : "回答を送信しました！" });
  };

  const handleToggleClose = async () => {
    const newClosed = !currentEvent.is_closed;
    setClosingEvent(true);
    const { data: updated } = await supabase
      .from("events")
      .update({ is_closed: newClosed })
      .eq("id", currentEvent.id)
      .select()
      .single();
    if (updated) {
      const newEvent = { ...currentEvent, is_closed: newClosed };
      setCurrentEvent(newEvent);
      onUpdated(newEvent);
      toast({ title: newClosed ? "締め切りました" : "締め切りを取り消しました" });
    }
    setClosingEvent(false);
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
    if (!confirm(`「${currentEvent.title}」を削除しますか？`)) return;
    await supabase.from("events").delete().eq("id", currentEvent.id);
    toast({ title: "イベントを削除しました" });
    onDeleted();
  };

  const memberNames = [...new Set(responses.map((r) => r.member_name))];
  const dateScores = dates.map((d) => {
    const score = responses
      .filter((r) => r.date === d.date && r.time_slot === d.time_slot)
      .reduce((sum, r) => sum + (statusConfig[r.availability as Availability]?.score ?? 0), 0);
    return { date: d.date, time_slot: d.time_slot, score };
  });

  const decideCount = currentEvent.decide_count ?? 1;
  // スコアが1点以上ある日を高い順に並べ、上位N日（=decideCount）を割り出す。
  // N位と同点の日もすべて含める。候補日がN個未満なら、点のある日すべてが対象。
  const positiveScores = dateScores.map((d) => d.score).filter((s) => s > 0).sort((a, b) => b - a);
  const topNThreshold = positiveScores.length === 0
    ? Infinity
    : positiveScores[Math.min(decideCount, positiveScores.length) - 1];
  const topDateKeys = new Set(
    dateScores.filter((d) => d.score > 0 && d.score >= topNThreshold).map((d) => `${d.date}_${d.time_slot ?? ""}`)
  );

  if (loading) return <div className="text-center py-16 text-muted-foreground">読み込み中...</div>;

  if (isEditing) return (
    <EditEvent
      event={currentEvent}
      dates={dates}
      allMembers={allMembers}
      onUpdated={(updatedEvent, updatedDates) => {
        setCurrentEvent(updatedEvent);
        setDates(updatedDates);
        supabase.from("responses").select("*").eq("event_id", updatedEvent.id).then(({ data }) => {
          setResponses((data ?? []) as Response[]);
        });
        onUpdated(updatedEvent);
        setIsEditing(false);
      }}
      onCancel={() => setIsEditing(false)}
    />
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-2 gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Button variant="ghost" size="icon" onClick={onBack} className="flex-shrink-0"><ChevronLeft size={20} /></Button>
          <h1 className="font-display font-bold text-xl sm:text-2xl text-foreground truncate">{currentEvent.title}</h1>
        </div>
        {isStaff && (
          <div className="flex items-center gap-1 flex-shrink-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleToggleClose}
              disabled={closingEvent}
              title={currentEvent.is_closed ? "締め切りを取り消す" : "締め切る"}
              className={currentEvent.is_closed ? "text-emerald-600 hover:text-emerald-700" : "text-muted-foreground hover:text-amber-600"}
            >
              {currentEvent.is_closed ? <Unlock size={18} /> : <Lock size={18} />}
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setIsEditing(true)} className="text-muted-foreground hover:text-foreground">
              <Edit2 size={18} />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleDelete} className="text-destructive hover:text-destructive">
              <Trash2 size={18} />
            </Button>
          </div>
        )}
      </div>

      {/* ターゲットバッジ */}
      {!(currentEvent.target_type ?? []).includes("all") && (
        <div className="flex items-center gap-2 mb-2 ml-12">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-600 border border-blue-500/20">
            <Users size={11} />
            {(currentEvent.target_type ?? []).map((t) => TARGET_LABELS[t] ?? t).join("・")}対象
          </span>
        </div>
      )}

      {/* 締め切りバナー */}
      {currentEvent.is_closed && (
        <div className="mb-4 p-3 rounded-xl bg-muted/50 border border-border flex items-center gap-2">
          <Lock size={14} className="text-muted-foreground" />
          <span className="text-sm text-muted-foreground font-medium">この日程調整は締め切り済みです</span>
        </div>
      )}

      {/* 対象外バナー */}
      {!isTarget && (
        <div className="mb-4 p-3 rounded-xl bg-muted/30 border border-border">
          <span className="text-sm text-muted-foreground">あなたはこのイベントの対象外です（閲覧のみ可能）</span>
        </div>
      )}

      {currentEvent.description && <p className="text-sm text-muted-foreground mb-6 ml-12">{currentEvent.description}</p>}

      {/* 回答エリア（対象者かつ締め切り前のみ表示） */}
      {canVote && (
        <div className={`mb-8 ${submitted ? "p-4 rounded-xl border border-border bg-muted/20" : ""}`}>
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-semibold text-foreground">
              {submitted ? "回答を変更する" : "参加可否を入力してください"}
            </div>
            <span className="text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded-full">
              {memberName} として回答
            </span>
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
      )}

      {/* 集計テーブル */}
      {dates.length > 0 && (
        <SummaryTable
          dates={dates}
          responses={responses}
          dateScores={dateScores}
          topDateKeys={topDateKeys}
          memberNames={memberNames}
        />
      )}

      {/* コメント */}
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
  const [allMembers, setAllMembers] = useState<Member[]>([]);
  const [memberGrade, setMemberGrade] = useState<string | null>(null);
  const [view, setView] = useState<"list" | "create" | "detail">("list");
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

  const loadEvents = async () => {
    const { data } = await supabase.from("events").select("*").order("created_at", { ascending: false });
    setEvents((data as Event[]) ?? []);
  };

  useEffect(() => {
    loadEvents();
    supabase
      .from("members")
      .select("name, grade")
      .eq("hidden", false)
      .order("number")
      .then(({ data }) => {
        if (data) {
          setAllMembers(data as Member[]);
          const me = data.find((m) => m.name === memberName);
          if (me) setMemberGrade(me.grade ?? null);
        }
      });
  }, [memberName]);

  return (
    <div className="container py-8 sm:py-10 max-w-2xl">
      {view === "list" && (
        <EventList
          events={events}
          onSelect={(e) => { setSelectedEvent(e); setView("detail"); }}
          onCreateNew={() => setView("create")}
          isStaff={isStaff}
          memberName={memberName}
          memberGrade={memberGrade}
        />
      )}
      {view === "create" && (
        <CreateEvent
          memberName={memberName}
          allMembers={allMembers}
          onCreated={() => { loadEvents(); setView("list"); }}
          onCancel={() => setView("list")}
        />
      )}
      {view === "detail" && selectedEvent && (
        <EventDetail
          event={selectedEvent}
          memberName={memberName}
          memberGrade={memberGrade}
          isStaff={isStaff}
          allMembers={allMembers}
          onBack={() => setView("list")}
          onDeleted={() => { loadEvents(); setView("list"); }}
          onUpdated={(updatedEvent) => { setSelectedEvent(updatedEvent); loadEvents(); }}
        />
      )}
    </div>
  );
};

export default ScheduleAdjustPage;
