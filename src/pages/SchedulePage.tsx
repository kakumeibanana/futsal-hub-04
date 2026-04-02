import { useState, useEffect } from "react";
import { Calendar } from "@/components/ui/calendar";
import ScheduleCard from "@/components/ScheduleCard";
import { 
  CalendarDays, Loader2, AlertCircle, 
  X, MapPin, Clock, Info, Briefcase 
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export type EventType = "match" | "practice" | "event";

export interface MappedEvent {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  type: EventType;
  detail: string;       // 追加：詳細
  belongings: string;   // 追加：持ち物
}

const filterOptions: { value: EventType | "all"; label: string }[] = [
  { value: "all", label: "すべて" },
  { value: "match", label: "試合" },
  { value: "practice", label: "練習" },
  { value: "event", label: "イベント" },
];

const SchedulePage = () => {
  const [events, setEvents] = useState<MappedEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filter, setFilter] = useState<EventType | "all">("all");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  
  // モーダル表示用のステートを追加
  const [selectedEvent, setSelectedEvent] = useState<MappedEvent | null>(null);

  useEffect(() => {
    const fetchSchedules = async () => {
      try {
        const response = await fetch("https://script.google.com/macros/s/AKfycbyIhmMlNo6H4rD0so6nYnGfVWptl4LTjV86UPlSB-fhSF0j_Q9JasRve30oorczsl0dcg/exec");
        if (!response.ok) throw new Error("データの取得に失敗しました");
        const data = await response.json();
        
        if (data.error) throw new Error(data.error);

        const mappedData = data.map((d: any, i: number): MappedEvent => {
          let type: EventType = "event";
          if (d.title.includes("試合") || d.title.includes("大会") || d.title.includes("リーグ")) {
            type = "match";
          } else if (d.title.includes("練習") || d.title.includes("トレ")) {
            type = "practice";
          }

          const startDate = new Date(d.startTime);
          const endDate = new Date(d.endTime);
          
          const dateStr = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}-${String(startDate.getDate()).padStart(2, '0')}`;

          let timeStr = "終日";
          if (!d.isAllDayEvent) {
            const formatTime = (date: Date) => date.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" });
            timeStr = `${formatTime(startDate)} - ${formatTime(endDate)}`;
          }

          return {
            id: `gas-event-${i}`,
            title: d.title || "予定なし",
            date: dateStr,
            time: timeStr,
            location: d.location || "",
            type: type,
            detail: d.detail || "",             // 新しいGASから取得
            belongings: d.belongings || ""      // 新しいGASから取得
          };
        });

        setEvents(mappedData);
      } catch (err: any) {
        setError(err.message || "スケジュールの読み込み中にエラーが発生しました。");
      } finally {
        setLoading(false);
      }
    };

    fetchSchedules();
  }, []);

  const filtered = events.filter((e) => {
    if (filter !== "all" && e.type !== filter) return false;
    if (selectedDate) {
      const selYear = selectedDate.getFullYear();
      const selMonth = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const selDay = String(selectedDate.getDate()).padStart(2, '0');
      const selDateStr = `${selYear}-${selMonth}-${selDay}`;
      
      if (e.date !== selDateStr) return false;
    }
    return true;
  });

  const eventDates = events.map((e) => new Date(e.date));

  return (
    <div className="container py-10 relative">
      <h1 className="font-display font-bold text-3xl text-foreground flex items-center gap-2 mb-8">
        <CalendarDays size={28} className="text-primary" />
        日程
      </h1>

      <div className="grid md:grid-cols-[300px_1fr] gap-8">
        {/* Sidebar */}
        <div className="space-y-6">
          <div className="rounded-xl border border-border bg-card p-4">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              modifiers={{ hasEvent: eventDates }}
              modifiersStyles={{ hasEvent: { fontWeight: 700, color: "hsl(270 60% 52%)" } }}
              className="pointer-events-auto"
            />
            {selectedDate && (
              <button onClick={() => setSelectedDate(undefined)} className="mt-2 text-xs text-primary hover:underline w-full text-center">
                日付の選択を解除
              </button>
            )}
          </div>

          {/* Filters */}
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
              <p className="text-sm">Googleカレンダーから予定を取得中...</p>
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
                  onClick={() => setSelectedEvent(event)} // クリックでモーダルを開く
                  className="cursor-pointer"
                >
                  {/* カードにホバーエフェクトをつけるため div でラップしています */}
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

      {/* 詳細を表示するモーダル（ポップアップ） */}
      <AnimatePresence>
        {selectedEvent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            {/* 背景の黒いオーバーレイ */}
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setSelectedEvent(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            
            {/* モーダル本体 */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-card rounded-2xl shadow-2xl overflow-hidden border border-border"
            >
              <button 
                onClick={() => setSelectedEvent(null)}
                className="absolute top-4 right-4 p-2 bg-muted/50 hover:bg-muted text-muted-foreground rounded-full transition-colors z-10"
              >
                <X size={20} />
              </button>

              <div className="p-6 sm:p-8">
                <div className="mb-4 inline-block px-3 py-1 bg-primary/10 text-primary text-xs font-bold rounded-full">
                  {selectedEvent.type === "match" ? "試合" : selectedEvent.type === "practice" ? "練習" : "イベント"}
                </div>
                
                <h2 className="text-2xl font-bold text-foreground mb-4">
                  {selectedEvent.title}
                </h2>

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
                  {/* 詳細セクション */}
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

                  {/* 持ち物セクション */}
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

                  {/* どちらもない場合 */}
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
    </div>
  );
};

export default SchedulePage;