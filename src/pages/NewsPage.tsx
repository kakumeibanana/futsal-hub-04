import { useState } from "react";
import { Link } from "react-router-dom";
import { Bell, Plus, Edit2, Trash2, X, Check, Loader2, ArrowLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useNewsList, type NewsItem } from "@/hooks/useNews";
import { Skeleton } from "@/components/ui/skeleton";
import RichEditor from "@/components/RichEditor";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

const CATEGORIES = ["試合結果", "連絡", "重要", "その他"] as const;

const categoryColor: Record<string, string> = {
  重要: "bg-red-100 text-red-700",
  試合結果: "bg-blue-100 text-blue-700",
  連絡: "bg-yellow-100 text-yellow-700",
  その他: "bg-secondary text-secondary-foreground",
};

interface NewsFormData {
  title: string;
  content: string;
  date: string;
  category: string;
  visibility: "public" | "member";
}

const emptyForm = (): NewsFormData => ({
  title: "",
  content: "",
  date: new Date().toISOString().split("T")[0],
  category: "その他",
  visibility: "public",
});

const inputClass =
  "w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50";

interface NewsFormProps {
  initial?: NewsFormData;
  onSave: (data: NewsFormData) => Promise<void>;
  onCancel: () => void;
  loading: boolean;
}

const NewsForm = ({ initial, onSave, onCancel, loading }: NewsFormProps) => {
  const [form, setForm] = useState<NewsFormData>(initial ?? emptyForm());

  const set = (key: keyof NewsFormData, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  return (
    <div className="p-5 rounded-xl border-2 border-primary/20 bg-card space-y-4">
      <div>
        <label className="text-xs font-semibold text-foreground mb-1 block">タイトル *</label>
        <input type="text" value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="タイトルを入力" className={inputClass} />
      </div>

      <div>
        <label className="text-xs font-semibold text-foreground mb-1 block">内容</label>
        <RichEditor content={form.content} onChange={(html) => set("content", html)} placeholder="内容を入力..." />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="text-xs font-semibold text-foreground mb-1 block">日付</label>
          <input type="date" value={form.date} onChange={(e) => set("date", e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className="text-xs font-semibold text-foreground mb-1 block">カテゴリ</label>
          <select value={form.category} onChange={(e) => set("category", e.target.value)} className={inputClass}>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-foreground mb-1 block">公開範囲</label>
          <select value={form.visibility} onChange={(e) => set("visibility", e.target.value as "public" | "member")} className={inputClass}>
            <option value="public">全体公開</option>
            <option value="member">部員限定</option>
          </select>
        </div>
      </div>

      <div className="flex gap-3 pt-1">
        <button
          onClick={() => onSave(form)}
          disabled={loading || !form.title.trim()}
          className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
          {loading ? "保存中..." : "保存する"}
        </button>
        <button onClick={onCancel} className="px-4 py-2.5 rounded-xl border border-border text-sm font-semibold text-muted-foreground hover:bg-muted transition-colors flex items-center gap-1">
          <X size={15} />キャンセル
        </button>
      </div>
    </div>
  );
};

const NewsPage = () => {
  const { isLoggedIn, isStaff, memberName } = useAuth();
  const { data: newsItems = [], isLoading } = useNewsList();
  const queryClient = useQueryClient();

  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<NewsItem | null>(null);
  const [saving, setSaving] = useState(false);

  const visibleNews = isLoggedIn
    ? newsItems
    : newsItems.filter((n) => n.visibility === "public");

  const handleCreate = async (data: NewsFormData) => {
    if (!data.title.trim()) return;
    setSaving(true);
    await supabase.from("news").insert({ ...data, created_by: memberName });
    await queryClient.invalidateQueries({ queryKey: ["news"] });
    setSaving(false);
    setShowForm(false);
  };

  const handleUpdate = async (data: NewsFormData) => {
    if (!editingItem || !data.title.trim()) return;
    setSaving(true);
    await supabase.from("news").update(data).eq("id", editingItem.id);
    await queryClient.invalidateQueries({ queryKey: ["news"] });
    setSaving(false);
    setEditingItem(null);
  };

  const handleDelete = async (item: NewsItem) => {
    if (!confirm(`「${item.title}」を削除しますか？`)) return;
    await supabase.from("news").delete().eq("id", item.id);
    await queryClient.invalidateQueries({ queryKey: ["news"] });
  };

  return (
    <div className="container py-10">
      <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6 -ml-1 px-2 py-1 rounded-lg hover:bg-muted">
        <ArrowLeft size={15} />
        ホームへ戻る
      </Link>
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-display font-bold text-3xl text-foreground flex items-center gap-2">
          <Bell size={28} className="text-primary" />
          お知らせ
        </h1>
        {isStaff && !showForm && !editingItem && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
          >
            <Plus size={16} />投稿する
          </button>
        )}
      </div>

      <div className="space-y-4 max-w-2xl">
        <AnimatePresence>
          {showForm && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              <NewsForm onSave={handleCreate} onCancel={() => setShowForm(false)} loading={saving} />
            </motion.div>
          )}
        </AnimatePresence>

        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))
        ) : (
          visibleNews.map((item, i) => (
            <motion.article
              key={item.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              {editingItem?.id === item.id ? (
                <NewsForm
                  initial={{ title: item.title, content: item.content, date: item.date, category: item.category, visibility: item.visibility }}
                  onSave={handleUpdate}
                  onCancel={() => setEditingItem(null)}
                  loading={saving}
                />
              ) : (
                <div className="relative group block p-5 rounded-xl border border-border bg-card hover:shadow-primary transition-all duration-300">
                  <Link to={`/news/${item.id}`} className="block">
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${categoryColor[item.category] ?? categoryColor["その他"]}`}>
                        {item.category}
                      </span>
                      {item.visibility === "member" && (
                        <span className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary">
                          部員限定
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {item.date.replace(/^2026-/, "").replace("-", "/")}
                      </span>
                    </div>
                    <h2 className="font-display font-semibold text-foreground mb-2">{item.title}</h2>
                    <div
                      className="text-sm text-muted-foreground leading-relaxed line-clamp-2 prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ __html: item.content }}
                    />
                  </Link>
                  {isStaff && (
                    <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => { e.preventDefault(); setShowForm(false); setEditingItem(item); }}
                        className="p-1.5 rounded-lg bg-muted hover:bg-secondary text-muted-foreground transition-colors"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        onClick={(e) => { e.preventDefault(); handleDelete(item); }}
                        className="p-1.5 rounded-lg bg-muted hover:bg-red-100 text-muted-foreground hover:text-red-600 transition-colors"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </motion.article>
          ))
        )}

        {!isLoading && visibleNews.length === 0 && (
          <div className="text-center py-16 text-muted-foreground text-sm border border-dashed rounded-xl border-border bg-card/50">
            お知らせはありません
          </div>
        )}
      </div>
    </div>
  );
};

export default NewsPage;
