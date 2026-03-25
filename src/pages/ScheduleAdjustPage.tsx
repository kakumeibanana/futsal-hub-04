import { useState } from "react";
import { motion } from "framer-motion";
import { CalendarCheck, Check, X, Minus, Send, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface DateSlot {
  date: string;
  label: string;
}

type Availability = "available" | "unavailable" | "maybe" | null;

const generateDateSlots = (): DateSlot[] => {
  const slots: DateSlot[] = [];
  const days = ["日", "月", "火", "水", "木", "金", "土"];
  const start = new Date("2026-03-28");
  for (let i = 0; i < 14; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    const dateStr = d.toISOString().split("T")[0];
    const label = `${d.getMonth() + 1}/${d.getDate()} (${days[d.getDay()]})`;
    slots.push({ date: dateStr, label });
  }
  return slots;
};

const dateSlots = generateDateSlots();

const statusConfig: Record<string, { icon: typeof Check; label: string; className: string }> = {
  available: { icon: Check, label: "○", className: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30" },
  maybe: { icon: Minus, label: "△", className: "bg-amber-500/15 text-amber-600 border-amber-500/30" },
  unavailable: { icon: X, label: "✕", className: "bg-destructive/10 text-destructive border-destructive/30" },
};

const ScheduleAdjustPage = () => {
  const { memberName } = useAuth();
  const { toast } = useToast();
  const [selections, setSelections] = useState<Record<string, Availability>>({});
  const [submitted, setSubmitted] = useState(false);

  const cycleStatus = (date: string) => {
    const order: Availability[] = [null, "available", "maybe", "unavailable"];
    const current = selections[date] ?? null;
    const idx = order.indexOf(current);
    const next = order[(idx + 1) % order.length];
    setSelections((prev) => ({ ...prev, [date]: next }));
  };

  const handleSubmit = () => {
    const filled = Object.values(selections).filter(Boolean).length;
    if (filled === 0) {
      toast({ title: "日程を選択してください", description: "少なくとも1日は回答してください", variant: "destructive" });
      return;
    }
    setSubmitted(true);
    toast({ title: "回答を送信しました！", description: `${memberName}さんの回答が登録されました` });
  };

  const handleReset = () => {
    setSelections({});
    setSubmitted(false);
  };

  return (
    <div className="container py-8 sm:py-10 max-w-2xl">
      <h1 className="font-display font-bold text-2xl sm:text-3xl text-foreground flex items-center gap-2 mb-2">
        <CalendarCheck size={28} className="text-primary" />
        日程調整
      </h1>
      <p className="text-sm text-muted-foreground mb-8">
        各日程をタップして参加可否を入力してください（{memberName}さん）
      </p>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mb-6">
        {Object.entries(statusConfig).map(([key, cfg]) => (
          <div key={key} className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.className}`}>
            <cfg.icon size={12} />
            {key === "available" ? "参加可能" : key === "maybe" ? "未定" : "参加不可"}
          </div>
        ))}
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border border-border text-muted-foreground bg-muted/50">
          未回答
        </div>
      </div>

      {/* Date grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3 mb-8">
        {dateSlots.map((slot, i) => {
          const status = selections[slot.date];
          const cfg = status ? statusConfig[status] : null;

          return (
            <motion.button
              key={slot.date}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.02 }}
              disabled={submitted}
              onClick={() => cycleStatus(slot.date)}
              className={`relative flex items-center justify-between p-3 sm:p-4 rounded-xl border transition-all duration-200 ${
                cfg
                  ? cfg.className
                  : "border-border bg-card hover:bg-muted/50 text-foreground"
              } ${submitted ? "opacity-70 cursor-default" : "cursor-pointer active:scale-[0.97]"}`}
            >
              <span className="text-sm font-medium">{slot.label}</span>
              {cfg && <cfg.icon size={16} className="flex-shrink-0" />}
            </motion.button>
          );
        })}
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        {!submitted ? (
          <>
            <Button onClick={handleSubmit} className="flex-1 h-11 font-semibold gap-2">
              <Send size={16} />
              回答を送信
            </Button>
            <Button variant="outline" onClick={handleReset} className="h-11 gap-2">
              <RotateCcw size={16} />
              リセット
            </Button>
          </>
        ) : (
          <div className="w-full text-center space-y-3">
            <div className="text-sm text-muted-foreground">回答済みです。変更する場合は下のボタンを押してください。</div>
            <Button variant="outline" onClick={handleReset} className="gap-2">
              <RotateCcw size={16} />
              回答をやり直す
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ScheduleAdjustPage;
