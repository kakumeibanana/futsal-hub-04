import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { Calendar } from "@/components/ui/calendar";
import ScheduleCard from "@/components/ScheduleCard";
import EventForm from "@/components/EventForm";
import {
  CalendarDays, Loader2, AlertCircle,
  X, MapPin, Clock, Info, Briefcase, Plus, Edit2, Trash2, Bell, BellOff,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePushNotification } from "@/hooks/usePushNotification";

// 曜日ごとの固定テンプレート（日曜=0, 月曜=1, ...）
const PRACTICE_TEMPLATES: Record<number, { startTime: string; endTime: string }> = {
  2: { startTime: "15:15", endTime: "17:30" }, // 火曜
  4: { startTime: "15:15", endTime: "17:30" }, // 木曜
  5: { startTime: "15:15", endTime: "17:30" }, // 金曜
  6: { startTime: "12:30", endTime: "16:00" }, // 土曜
};

export type EventType = "match" | "practice" | "event";

export interface MappedEvent {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  type: EventType;
  detail: string;
  belongings: string;
}

const filterOptions: { value: EventType | "all"; label: string }[] = [
  { value: "all", label: "すべて" },
  { value: "match", label: "試合" },
  { value: "practice", label: "練習" },
  { value: "event", label: "イベント" },
];

const SchedulePage = () => {
  const { isStaff } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const { isSubscribed, isLoading: pushLoading, subscribe, unsubscribe } = usePushNotification();
  const [events, setEvents] = useState<MappedEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<EventType | "all">("all");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedEvent, setSelectedEvent] = useState<MappedEvent | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [duplicateValues, setDuplicateValues] = useState<MappedEvent | null>(null);
  const [editingEvent, setEditingEvent] = useState<MappedEvent | null>(null);
  const [notificationTemplate, setNotificationTemplate] = useState<{
    title: string; date: string; startTime: string; endTime: string; type: "practice";
  } | null>(null);

  const fetchSchedules = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const today = new Date().toISOString().split("T")[0];
      const { data, error: fetchError } = await supabase
        .from("schedule_events")
        .select("id, title, date, start_time, end_time, is_all_day, location, type, detail, belongings")
        .gte("date", today)
        .order("date", { ascending: true });

      if (fetchError) throw fetchError;

      const mapped: MappedEvent[] = (data ?? []).map((row) => {
        let time = "終日";
        if (!row.is_all_day && row.start_time) {
          const start = (row.start_time as string).slice(0, 5);
          const end = row.end_time ? (row.end_time as string).slice(0, 5) : "";
          time = end ? `${start} - ${end}` : `${start}~`;
        }
        return {
          id: row.id,
          title: row.title,
          date: row.date,
          time,
          location: row.location,
          type: row.type as EventType,
          detail: row.detail,
          belongings: row.belongings,
        };
      });

      setEvents(mapped);
    } catch (err: any) {
      setError(err.message || "スケジュールの読み込みに失敗しました");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules]);

  // 通知クリックからのディープリンク処理
  useEffect(() => {
    const practiceDate = searchParams.get("practiceDate");
    if (!practiceDate) return;

    const d = new Date(practiceDate + "T12:00:00");
    const dayOfWeek = d.getDay();
    const template = PRACTICE_TEMPLATES[dayOfWeek];
    if (template) {
      setNotificationTemplate({
        title: "練習",
        date: practiceDate,
        startTime: template.startTime,
        endTime: template.endTime,
        type: "practice",
      });
      setShowForm(true);
    }
    setSearchParams({}, { replace: true });
  }, []);

  const filtered = events.filter((e) => {
    if (filter !== "all" && e.type !== filter) return false;
    if (selectedDate) {
      const selYear = selectedDate.getFullYear();
      const selMonth = String(selectedDate.getMonth() + 1).padStart(2, "0");
      const selDay = String(selectedDate.getDate()).padStart(2, "0");
      if (e.date !== `${selYear}-${selMonth}-${selDay}`) return false;
    }
    return true;
  });

  const handleDeleteEvent = async (event: MappedEvent) => {
    if (!confirm(`「${event.title}」を削除しますか？`)) return;
    await supabase.from("schedule_events").delete().eq("id", event.id);
    setSelectedEvent(null);
    fetchSchedules();
  };

  const eventDates = events.map((e) => new Date(e.date + "T12:00:00"));

  return (
    <div className="container py-10 relative">
      <div className="flex items-center justify-between mb-8 gap-3">
        <h1 className="font-display font-bold text-2xl sm:text-3xl text-foreground flex items-center gap-2 flex-shrink-0">
          <CalendarDays size={24} className="text-primary sm:hidden" />
          <CalendarDays size={28} className="text-primary hidden sm:block" />
          日程
        </h1>
        {isStaff && (
          <div className="flex items-center gap-2">
            <button
              onClick={isSubscribed ? unsubscribe : subscribe}
              disabled={pushLoading}
              title={isSubscribed ? "練習リマインダー通知をOFF" : "練習リマインダー通知をON"}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-colors flex-shrink-0 border ${
                isSubscribed
                  ? "bg-green-500/10 text-green-600 border-green-500/30 hover:bg-red-500/10 hover:text-red-600 hover:border-red-500/30"
                  : "bg-muted text-muted-foreground border-border hover:bg-secondary"
              }`}
            >
              {pushLoading
                ? <Loader2 size={14} className="animate-spin" />
                : isSubscribed
                  ? <Bell size={14} />
                  : <BellOff size={14} />}
              <span className="hidden sm:inline">{isSubscribed ? "通知ON" : "通知OFF"}</span>
            </button>
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs sm:text-sm font-semibold hover:bg-primary/90 transition-colors flex-shrink-0"
            >
              <Plus size={14} />
              <span className="hidden sm:inline">イベントを追加</span>
              <span className="sm:hidden">追加</span>
            </button>
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-[300px_1fr] gap-8">
        {/* Sidebar */}
        <div className="space-y-6">
          <div className="rounded-xl border border-border bg-card p-4 overflow-hidden">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              modifiers={{ hasEvent: eventDates }}
              modifiersStyles={{ hasEvent: { fontWeight: 600, color: "hsl(270 50% 68%)" } }}
              className="pointer-events-auto w-full"
            />
            {selectedDate && (
              <button
                onClick={() => setSelectedDate(undefined)}
                className="mt-2 text-xs text-primary hover:underline w-full text-center"
              >
                日付の選択を解除
              </button>
            )}
          </div>

          <div className="rounded-xl border border-border bg-card p-4">
            <h3 className="font-display font-semibold text-sm mb-3 text-foreground">フィルター</h3>
            <div className="flex flex-wrap gap-2">
              {filterOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setFilter(opt.value)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                    filter === opt.value
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-secondary"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Event list */}
        <div className="space-y-3">
          {loading && (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <Loader2 size={32} className="animate-spin text-primary mb-4" />
              <p className="text-sm">スケジュールを取得中...</p>
            </div>
          )}

          {error && !loading && (
            <div className="bg-destructive/10 text-destructive p-4 rounded-xl flex items-start gap-3 border border-destructive/20">
              <AlertCircle size={20} className="shrink-0 mt-0.5" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          {!loading && !error && (
            filtered.length > 0 ? (
              filtered.map((event, i) => (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => setSelectedEvent(event)}
                  className="cursor-pointer"
                >
                  <div className="transition-transform duration-200 hover:-translate-y-1">
                    <ScheduleCard event={event} />
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="text-center py-16 text-muted-foreground text-sm border border-dashed rounded-xl border-border bg-card/50">
                該当する予定はありません
              </div>
            )
          )}
        </div>
      </div>

      {/* 詳細モーダル */}
      <AnimatePresence>
        {selectedEvent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedEvent(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-card rounded-2xl shadow-2xl overflow-hidden border border-border"
            >
              <div className="absolute top-4 right-4 flex items-center gap-1.5 z-10">
                {isStaff && (
                  <>
                    <button
                      onClick={() => {
                        setEditingEvent(selectedEvent);
                        setSelectedEvent(null);
                        setShowForm(true);
                      }}
                      className="p-2 bg-muted/80 hover:bg-muted text-muted-foreground rounded-full transition-colors"
                      title="編集"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => handleDeleteEvent(selectedEvent)}
                      className="p-2 bg-muted/80 hover:bg-red-100 text-muted-foreground hover:text-red-600 rounded-full transition-colors"
                      title="削除"
                    >
                      <Trash2 size={16} />
                    </button>
                    <button
                      onClick={() => {
                        setDuplicateValues(selectedEvent);
                        setSelectedEvent(null);
                        setShowForm(true);
                      }}
                      className="px-3 py-1.5 bg-muted/80 hover:bg-muted text-muted-foreground rounded-full text-xs font-semibold transition-colors"
                    >
                      複製
                    </button>
                  </>
                )}
                <button
                  onClick={() => setSelectedEvent(null)}
                  className="p-2 bg-muted/50 hover:bg-muted text-muted-foreground rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 sm:p-8">
                <div className="mb-4 inline-block px-3 py-1 bg-primary/10 text-primary text-xs font-bold rounded-full">
                  {selectedEvent.type === "match" ? "試合" : selectedEvent.type === "practice" ? "練習" : "イベント"}
                </div>
                <h2 className="text-2xl font-bold text-foreground mb-4">{selectedEvent.title}</h2>

                <div className="space-y-3 pb-6 border-b border-border">
                  <div className="flex items-center gap-3 text-muted-foreground text-sm">
                    <Clock size={18} className="text-primary/70 shrink-0" />
                    <span>{selectedEvent.date.replace(/-/g, "/")} {selectedEvent.time}</span>
                  </div>
                  {selectedEvent.location && (
                    <div className="flex items-center gap-3 text-muted-foreground text-sm">
                      <MapPin size={18} className="text-primary/70 shrink-0" />
                      <span>{selectedEvent.location}</span>
                    </div>
                  )}
                </div>

                <div className="pt-6 space-y-6">
                  {selectedEvent.detail && (
                    <div>
                      <h3 className="flex items-center gap-2 font-bold text-foreground mb-2 text-sm">
                        <Info size={18} className="text-primary" /> 詳細・時程
                      </h3>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed bg-muted/30 p-4 rounded-xl">
                        {selectedEvent.detail}
                      </p>
                    </div>
                  )}
                  {selectedEvent.belongings && (
                    <div>
                      <h3 className="flex items-center gap-2 font-bold text-foreground mb-2 text-sm">
                        <Briefcase size={18} className="text-primary" /> 持ち物
                      </h3>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed bg-muted/30 p-4 rounded-xl">
                        {selectedEvent.belongings}
                      </p>
                    </div>
                  )}
                  {!selectedEvent.detail && !selectedEvent.belongings && (
                    <p className="text-sm text-muted-foreground italic text-center py-4">
                      詳細情報は登録されていません。
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* イベント追加フォーム（スタッフのみ） */}
      <AnimatePresence>
        {showForm && (
          <EventForm
            onClose={() => { setShowForm(false); setDuplicateValues(null); setEditingEvent(null); setNotificationTemplate(null); }}
            onSaved={() => {
              setShowForm(false);
              setDuplicateValues(null);
              setEditingEvent(null);
              setNotificationTemplate(null);
              fetchSchedules();
            }}
            eventId={editingEvent?.id}
            initialValues={editingEvent ? {
              title: editingEvent.title,
              date: editingEvent.date,
              isAllDay: editingEvent.time === "終日",
              startTime: editingEvent.time !== "終日" ? editingEvent.time.split(" - ")[0] : "",
              endTime: editingEvent.time !== "終日" ? editingEvent.time.split(" - ")[1] ?? "" : "",
              location: editingEvent.location,
              type: editingEvent.type,
              detail: editingEvent.detail,
              belongings: editingEvent.belongings,
            } : notificationTemplate ? {
              title: notificationTemplate.title,
              date: notificationTemplate.date,
              startTime: notificationTemplate.startTime,
              endTime: notificationTemplate.endTime,
              type: notificationTemplate.type,
            } : duplicateValues ? {
              title: duplicateValues.title,
              isAllDay: duplicateValues.time === "終日",
              startTime: duplicateValues.time !== "終日" ? duplicateValues.time.split(" - ")[0] : "",
              endTime: duplicateValues.time !== "終日" ? duplicateValues.time.split(" - ")[1] ?? "" : "",
              location: duplicateValues.location,
              type: duplicateValues.type,
              detail: duplicateValues.detail,
              belongings: duplicateValues.belongings,
            } : undefined}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default SchedulePage;
