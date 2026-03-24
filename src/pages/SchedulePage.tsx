import { useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { scheduleEvents, type EventType } from "@/data/sampleData";
import ScheduleCard from "@/components/ScheduleCard";
import { CalendarDays } from "lucide-react";
import { motion } from "framer-motion";

const filterOptions: { value: EventType | "all"; label: string }[] = [
  { value: "all", label: "すべて" },
  { value: "match", label: "試合" },
  { value: "practice", label: "練習" },
  { value: "event", label: "イベント" },
];

const SchedulePage = () => {
  const [filter, setFilter] = useState<EventType | "all">("all");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);

  const filtered = scheduleEvents.filter((e) => {
    if (filter !== "all" && e.type !== filter) return false;
    if (selectedDate) {
      const sel = selectedDate.toISOString().split("T")[0];
      if (e.date !== sel) return false;
    }
    return true;
  });

  const eventDates = scheduleEvents.map((e) => new Date(e.date));

  return (
    <div className="container py-10">
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
          {filtered.length > 0 ? (
            filtered.map((event, i) => (
              <motion.div key={event.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <ScheduleCard event={event} />
              </motion.div>
            ))
          ) : (
            <div className="text-center py-16 text-muted-foreground text-sm">
              該当する予定はありません
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SchedulePage;
