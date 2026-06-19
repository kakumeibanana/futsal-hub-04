import { useState, useEffect } from "react";
import { X, Plus, Edit2, Trash2, Loader2, GripVertical } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";

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
  sort_order: number;
}

interface TemplateManagerProps {
  onClose: () => void;
}

const TYPE_LABELS = { practice: "練習", match: "試合", event: "イベント" };

const emptyForm = (): Omit<Template, "id" | "sort_order"> => ({
  name: "",
  type: "practice",
  title: "",
  location: "",
  detail: "",
  belongings: "",
  start_time: null,
  end_time: null,
});

const TemplateManager = ({ onClose }: TemplateManagerProps) => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | "new" | null>(null);
  const [form, setForm] = useState(emptyForm());

  const fetchTemplates = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("event_templates")
      .select("*")
      .order("sort_order", { ascending: true });
    if (!error) setTemplates((data ?? []) as Template[]);
    setLoading(false);
  };

  useEffect(() => { fetchTemplates(); }, []);

  const openNew = () => {
    setForm(emptyForm());
    setEditingId("new");
    setError(null);
  };

  const openEdit = (t: Template) => {
    setForm({
      name: t.name,
      type: t.type,
      title: t.title,
      location: t.location,
      detail: t.detail,
      belongings: t.belongings,
      start_time: t.start_time,
      end_time: t.end_time,
    });
    setEditingId(t.id);
    setError(null);
  };

  const handleSave = async () => {
    if (!form.name) { setError("テンプレート名を入力してください"); return; }
    setSaving(true);
    setError(null);
    try {
      if (editingId === "new") {
        const maxOrder = templates.length > 0 ? Math.max(...templates.map((t) => t.sort_order)) + 1 : 0;
        const { error } = await supabase.from("event_templates").insert({
          ...form,
          start_time: form.start_time || null,
          end_time: form.end_time || null,
          sort_order: maxOrder,
        });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("event_templates")
          .update({
            ...form,
            start_time: form.start_time || null,
            end_time: form.end_time || null,
          })
          .eq("id", editingId!);
        if (error) throw error;
      }
      setEditingId(null);
      await fetchTemplates();
    } catch (err: any) {
      setError(err.message || "保存に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`「${name}」を削除しますか？`)) return;
    await supabase.from("event_templates").delete().eq("id", id);
    await fetchTemplates();
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
        className="relative w-full max-w-xl bg-card rounded-2xl shadow-2xl border border-border overflow-y-auto overflow-x-hidden max-h-[90vh]"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 bg-muted/50 hover:bg-muted rounded-full text-muted-foreground z-10 transition-colors"
        >
          <X size={20} />
        </button>

        <div className="p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-6 pr-10">
            <h2 className="text-xl font-bold text-foreground flex-1">テンプレート管理</h2>
            <button
              onClick={openNew}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors shrink-0"
            >
              <Plus size={14} />
              追加
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 size={28} className="animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-2">
              {templates.length === 0 && editingId !== "new" && (
                <p className="text-sm text-muted-foreground text-center py-8">
                  テンプレートがありません。「追加」から作成してください。
                </p>
              )}
              {templates.map((t) => (
                <div key={t.id}>
                  {editingId === t.id ? (
                    <TemplateForm
                      form={form}
                      onChange={setForm}
                      onSave={handleSave}
                      onCancel={() => setEditingId(null)}
                      saving={saving}
                      error={error}
                      inputClass={inputClass}
                    />
                  ) : (
                    <div className="flex items-center gap-3 p-3 rounded-xl border border-border bg-muted/30 group">
                      <GripVertical size={16} className="text-muted-foreground/40 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                            {TYPE_LABELS[t.type]}
                          </span>
                          <span className="text-sm font-semibold text-foreground truncate">{t.name}</span>
                        </div>
                        {(t.start_time || t.location) && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {[t.start_time && `${t.start_time}${t.end_time ? ` - ${t.end_time}` : ""}`, t.location]
                              .filter(Boolean)
                              .join(" / ")}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => openEdit(t)}
                          className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-colors"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(t.id, t.name)}
                          className="p-1.5 rounded-lg hover:bg-red-100 text-muted-foreground hover:text-red-600 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {editingId === "new" && (
                <TemplateForm
                  form={form}
                  onChange={setForm}
                  onSave={handleSave}
                  onCancel={() => setEditingId(null)}
                  saving={saving}
                  error={error}
                  inputClass={inputClass}
                  isNew
                />
              )}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

interface TemplateFormProps {
  form: ReturnType<typeof emptyForm>;
  onChange: (f: ReturnType<typeof emptyForm>) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
  error: string | null;
  inputClass: string;
  isNew?: boolean;
}

const TemplateForm = ({ form, onChange, onSave, onCancel, saving, error, inputClass, isNew }: TemplateFormProps) => {
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    onChange({ ...form, [k]: v });

  return (
    <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3">
      <p className="text-sm font-semibold text-foreground">{isNew ? "新しいテンプレート" : "テンプレートを編集"}</p>

      <div>
        <label className="text-xs font-medium text-foreground mb-1 block">テンプレート名 *</label>
        <input
          type="text"
          value={form.name}
          onChange={(e) => set("name", e.target.value)}
          placeholder="例: 通常練習、関東大会"
          className={inputClass}
        />
      </div>

      <div>
        <label className="text-xs font-medium text-foreground mb-1 block">種別</label>
        <div className="flex gap-2">
          {(["practice", "match", "event"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => set("type", t)}
              className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                form.type === t
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-muted text-muted-foreground border-border hover:bg-secondary"
              }`}
            >
              {TYPE_LABELS[t]}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="min-w-0">
          <label className="text-xs font-medium text-foreground mb-1 block">タイトル</label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => set("title", e.target.value)}
            placeholder="例: 練習"
            className={inputClass}
          />
        </div>
        <div className="min-w-0">
          <label className="text-xs font-medium text-foreground mb-1 block">場所</label>
          <input
            type="text"
            value={form.location}
            onChange={(e) => set("location", e.target.value)}
            placeholder="例: コート面"
            className={inputClass}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="min-w-0">
          <label className="text-xs font-medium text-foreground mb-1 block">開始時間</label>
          <input
            type="time"
            value={form.start_time ?? ""}
            onChange={(e) => set("start_time", e.target.value || null)}
            className={inputClass}
          />
        </div>
        <div className="min-w-0">
          <label className="text-xs font-medium text-foreground mb-1 block">終了時間</label>
          <input
            type="time"
            value={form.end_time ?? ""}
            onChange={(e) => set("end_time", e.target.value || null)}
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <label className="text-xs font-medium text-foreground mb-1 block">詳細・時程</label>
        <textarea
          value={form.detail}
          onChange={(e) => set("detail", e.target.value)}
          rows={2}
          placeholder="詳細や時程..."
          className={`${inputClass} resize-none`}
        />
      </div>

      <div>
        <label className="text-xs font-medium text-foreground mb-1 block">持ち物</label>
        <textarea
          value={form.belongings}
          onChange={(e) => set("belongings", e.target.value)}
          rows={2}
          placeholder="例: ユニフォーム、シューズ"
          className={`${inputClass} resize-none`}
        />
      </div>

      {error && (
        <p className="text-xs text-destructive bg-destructive/10 px-3 py-2 rounded-lg">{error}</p>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="flex-1 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {saving && <Loader2 size={14} className="animate-spin" />}
          {saving ? "保存中..." : "保存"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 rounded-xl bg-muted text-muted-foreground text-sm font-semibold hover:bg-secondary transition-colors"
        >
          キャンセル
        </button>
      </div>
    </div>
  );
};

export default TemplateManager;
