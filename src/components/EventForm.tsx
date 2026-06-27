import { useState, useEffect } from "react";
import { X, Loader2, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
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
  lineNotify?: "none" | "immediate" | "scheduled";
  lineSendAt?: string;
}

interface EventFormProps {
  onClose: () => void;
  onSaved: () => void;
  initialValues?: InitialValues;
  eventId?: string;
}

interface Template {
  id: string;
  name: string;
  type: "practice" | "match" | "event";
  title: string;
  location: string;
  detail: string;
  belongings: string;
  start_time: string | null;
  end_time: string | null;
}

const EventForm = ({ onClose, onSaved, initialValues, eventId }: EventFormProps) => {
  const isEditing = !!eventId;
  const { memberName, isStaff } = useAuth();
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
  const [lineNotify, setLineNotify] = useState<"none" | "immediate" | "scheduled">(
    initialValues?.lineNotify ?? "none"
  );
  const [lineSendAt, setLineSendAt] = useState(initialValues?.lineSendAt ?? "");

  // テンプレート
  const [templates, setTemplates] = useState<Template[]>([]);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);

  // 編集時：既存のLINE設定を取得
  useEffect(() => {
    if (!isEditing || !eventId) return;
    supabase
      .from("schedule_events")
      .select("line_notify_type, line_send_at")
      .eq("id", eventId)
      .single()
      .then(({ data }) => {
        if (data) {
          setLineNotify((data.line_notify_type as "none" | "immediate" | "scheduled") ?? "none");
          if (data.line_send_at) {
            // DBにはUTCで保存されているので、datetime-local用にローカル時刻へ変換する。
            // （変換しないと日本時間20:00が11:00と表示されてしまう）
            const d = new Date(data.line_send_at);
            const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
            setLineSendAt(local.toISOString().slice(0, 16));
          }
        }
      });
  }, [isEditing, eventId]);

  // テンプレート一覧取得（リーダーのみ）
  useEffect(() => {
    if (!isStaff) return;
    supabase
      .from("event_templates")
      .select("*")
      .order("sort_order", { ascending: true })
      .then(({ data }) => {
        if (data) setTemplates(data as Template[]);
      });
  }, [isStaff]);

  const applyTemplate = (t: Template) => {
    if (t.title) setTitle(t.title);
    if (t.location) setLocation(t.location);
    if (t.detail) setDetail(t.detail);
    if (t.belongings) setBelongings(t.belongings);
    if (t.start_time) setStartTime(t.start_time);
    if (t.end_time) setEndTime(t.end_time);
    setType(t.type);
    setIsAllDay(false);
    setShowTemplatePicker(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !date) return;
    if (lineNotify === "scheduled" && !lineSendAt) {
      setError("予約配信の送信日時を入力してください");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const baseFields = {
        title,
        date,
        start_time: isAllDay ? null : startTime || null,
        end_time: isAllDay ? null : endTime || null,
        is_all_day: isAllDay,
        location,
        type,
        detail,
        belongings,
      };

      let savedEventId = eventId;

      if (isEditing) {
        // 編集時：LINE設定も更新し、line_sentをリセット（再配信を可能にする）
        const { error: updateError } = await supabase
          .from("schedule_events")
          .update({
            ...baseFields,
            line_notify_type: lineNotify,
            line_send_at:
              lineNotify === "scheduled" && lineSendAt
                ? new Date(lineSendAt).toISOString()
                : null,
            line_sent: false,
          })
          .eq("id", eventId!);
        if (updateError) throw updateError;
      } else {
        const { data: newEvent, error: insertError } = await supabase
          .from("schedule_events")
          .insert({
            ...baseFields,
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
        savedEventId = newEvent.id;
      }

      // 「今すぐ送る」の場合は即時送信
      if (lineNotify === "immediate" && savedEventId) {
        const { error: fnError } = await supabase.functions.invoke("line-notify", {
          body: { event_id: savedEventId },
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
    "w-full min-w-0 max-w-full box-border px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50";

  const practiceTemplates = templates.filter((t) => t.type === "practice");
  const matchTemplates = templates.filter((t) => t.type === "match");
  const eventTemplates = templates.filter((t) => t.type === "event");

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
        className="relative w-full max-w-lg bg-card rounded-2xl shadow-2xl border border-border overflow-y-auto overflow-x-hidden max-h-[90vh]"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 bg-muted/50 hover:bg-muted rounded-full text-muted-foreground z-10 transition-colors"
        >
          <X size={20} />
        </button>

        <div className="p-6 sm:p-8">
          <h2 className="text-xl font-bold text-foreground mb-6">
            {isEditing ? "イベントを編集" : "イベントを追加"}
          </h2>

          {/* テンプレート選択（リーダーのみ） */}
          {isStaff && templates.length > 0 && (
            <div className="mb-5 relative">
              <button
                type="button"
                onClick={() => setShowTemplatePicker((v) => !v)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border bg-muted/50 text-sm font-semibold text-muted-foreground hover:bg-muted transition-colors w-full justify-between"
              >
                <span>テンプレートを使う</span>
                <ChevronDown
                  size={16}
                  className={`transition-transform ${showTemplatePicker ? "rotate-180" : ""}`}
                />
              </button>

              <AnimatePresence>
                {showTemplatePicker && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-lg z-20 overflow-hidden"
                  >
                    {[
                      { label: "練習", items: practiceTemplates },
                      { label: "試合", items: matchTemplates },
                      { label: "イベント", items: eventTemplates },
                    ]
                      .filter((g) => g.items.length > 0)
                      .map((group) => (
                        <div key={group.label}>
                          <p className="text-xs font-semibold text-muted-foreground px-3 py-1.5 bg-muted/50 border-b border-border">
                            {group.label}
                          </p>
                          {group.items.map((t) => (
                            <button
                              key={t.id}
                              type="button"
                              onClick={() => applyTemplate(t)}
                              className="w-full text-left px-4 py-2.5 text-sm hover:bg-muted transition-colors flex items-center justify-between"
                            >
                              <span className="font-medium">{t.name}</span>
                              {(t.start_time || t.location) && (
                                <span className="text-xs text-muted-foreground">
                                  {[
                                    t.start_time &&
                                      `${t.start_time}${t.end_time ? `-${t.end_time}` : ""}`,
                                    t.location,
                                  ]
                                    .filter(Boolean)
                                    .join(" / ")}
                                </span>
                              )}
                            </button>
                          ))}
                        </div>
                      ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

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
                <div className="min-w-0">
                  <label className="text-sm font-medium text-foreground mb-1 block">開始時間</label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div className="min-w-0">
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

            {/* LINE通知 */}
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
                    className={inputClass}
                  />
                </div>
              )}
              {isEditing && lineNotify !== "none" && (
                <p className="text-xs text-muted-foreground">
                  ※ 保存すると配信設定がリセットされ、再配信されます。
                </p>
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
              {loading ? "保存中..." : isEditing ? "更新する" : "保存する"}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
};

export default EventForm;
