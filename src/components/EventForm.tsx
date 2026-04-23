import { useState } from "react";
import { X, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface InitialValues {
  title?: string;
  date?: string;
  isAllDay?: boolean;
  startTime?: string;
  endTime?: string;
  location?: string;
  type?: "match" | "practice" | "event";
  detail?: string;
  belongings?: string;
}

interface EventFormProps {
  onClose: () => void;
  onSaved: () => void;
  initialValues?: InitialValues;
}

const EventForm = ({ onClose, onSaved, initialValues }: EventFormProps) => {
  const { memberName } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState(initialValues?.title ?? "");
  const [date, setDate] = useState(initialValues?.date ?? "");
  const [isAllDay, setIsAllDay] = useState(initialValues?.isAllDay ?? false);
  const [startTime, setStartTime] = useState(initialValues?.startTime ?? "");
  const [endTime, setEndTime] = useState(initialValues?.endTime ?? "");
  const [location, setLocation] = useState(initialValues?.location ?? "");
  const [type, setType] = useState<"match" | "practice" | "event">(initialValues?.type ?? "practice");
  const [detail, setDetail] = useState(initialValues?.detail ?? "");
  const [belongings, setBelongings] = useState(initialValues?.belongings ?? "");
  const [lineNotify, setLineNotify] = useState<"none" | "immediate" | "scheduled">("none");
  const [lineSendAt, setLineSendAt] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !date) return;

    setLoading(true);
    setError(null);

    try {
      const { data: newEvent, error: insertError } = await supabase
        .from("schedule_events")
        .insert({
          title,
          date,
          start_time: isAllDay ? null : startTime || null,
          end_time: isAllDay ? null : endTime || null,
          is_all_day: isAllDay,
          location,
          type,
          detail,
          belongings,
          line_notify_type: lineNotify,
          line_send_at:
            lineNotify === "scheduled" && lineSendAt
              ? new Date(lineSendAt).toISOString()
              : null,
          line_sent: false,
          created_by: memberName,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      if (lineNotify === "immediate" && newEvent) {
        const { error: fnError } = await supabase.functions.invoke("line-notify", {
          body: { event_id: newEvent.id },
        });
        if (fnError) throw new Error("LINE送信に失敗しました: " + fnError.message);
      }

      onSaved();
    } catch (err: any) {
      setError(err.message || "保存に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-lg bg-card rounded-2xl shadow-2xl border border-border overflow-y-auto max-h-[90vh]"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 bg-muted/50 hover:bg-muted rounded-full text-muted-foreground z-10 transition-colors"
        >
          <X size={20} />
        </button>

        <div className="p-6 sm:p-8">
          <h2 className="text-xl font-bold text-foreground mb-6">イベントを追加</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">タイトル *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                placeholder="例: 練習、春季大会 1回戦"
                className={inputClass}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">種別 *</label>
              <div className="flex gap-2">
                {(["practice", "match", "event"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setType(t)}
                    className={`flex-1 py-2 rounded-lg text-xs font-semibold border transition-colors ${
                      type === t
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-muted text-muted-foreground border-border hover:bg-secondary"
                    }`}
                  >
                    {t === "practice" ? "練習" : t === "match" ? "試合" : "イベント"}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">日付 *</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className={inputClass}
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isAllDay"
                checked={isAllDay}
                onChange={(e) => setIsAllDay(e.target.checked)}
                className="rounded"
              />
              <label htmlFor="isAllDay" className="text-sm text-foreground select-none">
                終日
              </label>
            </div>

            {!isAllDay && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">開始時間</label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">終了時間</label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>
            )}

            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">場所</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="例: 第一体育館"
                className={inputClass}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">詳細・時程</label>
              <textarea
                value={detail}
                onChange={(e) => setDetail(e.target.value)}
                rows={3}
                placeholder="詳細や時程を入力..."
                className={`${inputClass} resize-none`}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">持ち物</label>
              <textarea
                value={belongings}
                onChange={(e) => setBelongings(e.target.value)}
                rows={2}
                placeholder="例: ユニフォーム、シューズ"
                className={`${inputClass} resize-none`}
              />
            </div>

            <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-3">
              <p className="text-sm font-semibold text-foreground">LINE通知</p>
              <div className="flex gap-2">
                {(["none", "immediate", "scheduled"] as const).map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setLineNotify(n)}
                    className={`flex-1 py-2 rounded-lg text-xs font-semibold border transition-colors ${
                      lineNotify === n
                        ? "bg-green-600 text-white border-green-600"
                        : "bg-muted text-muted-foreground border-border hover:bg-secondary"
                    }`}
                  >
                    {n === "none" ? "送らない" : n === "immediate" ? "今すぐ送る" : "予約配信"}
                  </button>
                ))}
              </div>
              {lineNotify === "scheduled" && (
                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">送信日時</label>
                  <input
                    type="datetime-local"
                    value={lineSendAt}
                    onChange={(e) => setLineSendAt(e.target.value)}
                    required={lineNotify === "scheduled"}
                    className={inputClass}
                  />
                </div>
              )}
            </div>

            {error && (
              <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 size={16} className="animate-spin" />}
              {loading ? "保存中..." : "保存する"}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
};

export default EventForm;
