import { useState, useEffect, useRef } from "react";
import { ImageIcon, Plus, Trash2, X, Loader2, Edit2, Check, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface GalleryImage {
  id: string;
  url: string;
  caption: string;
  created_at: string;
}

const GalleryPage = () => {
  const { isStaff } = useAuth();
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [lightbox, setLightbox] = useState<GalleryImage | null>(null);
  const [editingCaption, setEditingCaption] = useState(false);
  const [captionInput, setCaptionInput] = useState("");
  const [replaceUploading, setReplaceUploading] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<FileList | null>(null);
  const [pendingCaption, setPendingCaption] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);

  const fetchImages = async () => {
    const { data } = await supabase
      .from("gallery_images")
      .select("*")
      .order("created_at", { ascending: false });
    setImages((data ?? []) as GalleryImage[]);
    setLoading(false);
  };

  useEffect(() => { fetchImages(); }, []);

  const handleUpload = async (files: FileList, caption: string) => {
    setUploading(true);
    for (const file of Array.from(files)) {
      const ext = file.name.split(".").pop();
      const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from("news-images").upload(path, file);
      if (!error) {
        const { data } = supabase.storage.from("news-images").getPublicUrl(path);
        await supabase.from("gallery_images").insert({ url: data.publicUrl, caption: caption.trim() || null });
      }
    }
    await fetchImages();
    setUploading(false);
  };

  const handleConfirmUpload = async () => {
    if (!pendingFiles) return;
    setPendingFiles(null);
    await handleUpload(pendingFiles, pendingCaption);
    setPendingCaption("");
  };

  const handleDelete = async (img: GalleryImage) => {
    if (!confirm("この写真を削除しますか？")) return;
    await supabase.from("gallery_images").delete().eq("id", img.id);
    setImages((prev) => prev.filter((i) => i.id !== img.id));
    if (lightbox?.id === img.id) setLightbox(null);
  };

  const handleSaveCaption = async () => {
    if (!lightbox) return;
    await supabase.from("gallery_images").update({ caption: captionInput }).eq("id", lightbox.id);
    const updated = { ...lightbox, caption: captionInput };
    setImages((prev) => prev.map((i) => (i.id === lightbox.id ? updated : i)));
    setLightbox(updated);
    setEditingCaption(false);
  };

  const handleReplace = async (files: FileList) => {
    if (!files[0] || !lightbox) return;
    setReplaceUploading(true);
    const file = files[0];
    const ext = file.name.split(".").pop();
    const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage.from("news-images").upload(path, file);
    if (!error) {
      const { data } = supabase.storage.from("news-images").getPublicUrl(path);
      await supabase.from("gallery_images").update({ url: data.publicUrl }).eq("id", lightbox.id);
      const updated = { ...lightbox, url: data.publicUrl };
      setImages((prev) => prev.map((i) => (i.id === lightbox.id ? updated : i)));
      setLightbox(updated);
    }
    setReplaceUploading(false);
  };

  return (
    <div className="container py-10">
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-display font-bold text-3xl text-foreground flex items-center gap-2">
          <ImageIcon size={28} className="text-primary" />
          ギャラリー
        </h1>
        {isStaff && (
          <>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {uploading ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
              {uploading ? "アップロード中..." : "写真を追加"}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => { if (e.target.files?.length) { setPendingFiles(e.target.files); setPendingCaption(""); } e.target.value = ""; }}
            />
          </>
        )}
      </div>

      {loading ? (
        <div className="columns-2 md:columns-3 gap-3 space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="break-inside-avoid rounded-xl bg-muted animate-pulse h-48" />
          ))}
        </div>
      ) : images.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground text-sm border border-dashed rounded-xl border-border bg-card/50">
          写真はまだありません
        </div>
      ) : (
        <div className="columns-2 md:columns-3 gap-3 space-y-3">
          {images.map((img, i) => (
            <motion.div
              key={img.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.04 }}
              className="break-inside-avoid rounded-xl overflow-hidden relative group cursor-pointer"
              onClick={() => { setLightbox(img); setCaptionInput(img.caption || ""); setEditingCaption(false); }}
            >
              <img
                src={img.url}
                alt={img.caption || "ギャラリー画像"}
                className="w-full hover:scale-105 transition-transform duration-500"
                loading="lazy"
              />
              {isStaff && (
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(img); }}
                  className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                >
                  <Trash2 size={13} />
                </button>
              )}
            </motion.div>
          ))}
        </div>
      )}

      {/* ライトボックス */}
      <AnimatePresence>
        {lightbox && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setLightbox(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative max-w-3xl w-full"
            >
              <img src={lightbox.url} alt={lightbox.caption} className="w-full rounded-t-2xl" />

              {/* Caption + staff controls */}
              <div className="bg-black/70 backdrop-blur-sm rounded-b-2xl px-4 py-3">
                {isStaff && editingCaption ? (
                  <div className="flex items-center gap-2">
                    <input
                      autoFocus
                      value={captionInput}
                      onChange={(e) => setCaptionInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") handleSaveCaption(); if (e.key === "Escape") setEditingCaption(false); }}
                      placeholder="キャプションを入力..."
                      className="flex-1 bg-white/10 text-white placeholder-white/40 text-sm px-3 py-1.5 rounded-lg border border-white/20 focus:outline-none focus:border-white/50"
                    />
                    <button onClick={handleSaveCaption} className="p-1.5 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"><Check size={15} /></button>
                    <button onClick={() => setEditingCaption(false)} className="p-1.5 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors"><X size={15} /></button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 min-h-[28px]">
                    <p className="flex-1 text-sm text-white/80">{lightbox.caption || (isStaff ? "キャプションを追加..." : "")}</p>
                    {isStaff && (
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button
                          onClick={() => setEditingCaption(true)}
                          className="p-1.5 bg-white/10 hover:bg-white/20 text-white/70 hover:text-white rounded-lg transition-colors"
                          title="キャプション編集"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => replaceInputRef.current?.click()}
                          disabled={replaceUploading}
                          className="flex items-center gap-1 px-2.5 py-1.5 bg-white/10 hover:bg-white/20 text-white/70 hover:text-white rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
                          title="写真を差し替え"
                        >
                          {replaceUploading ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
                          差し替え
                        </button>
                        <input
                          ref={replaceInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => { if (e.target.files?.length) handleReplace(e.target.files); e.target.value = ""; }}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>

              <button
                onClick={() => setLightbox(null)}
                className="absolute top-3 right-3 p-2 bg-black/50 hover:bg-black/70 text-white rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* アップロード前キャプション入力 */}
      <AnimatePresence>
        {pendingFiles && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => { setPendingFiles(null); setPendingCaption(""); }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              className="relative w-full max-w-sm bg-card rounded-2xl shadow-2xl border border-border p-6"
            >
              <h3 className="font-bold text-foreground mb-1">キャプションを追加</h3>
              <p className="text-xs text-muted-foreground mb-4">
                {pendingFiles.length}枚の写真をアップロードします（任意）
              </p>
              <input
                autoFocus
                value={pendingCaption}
                onChange={(e) => setPendingCaption(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleConfirmUpload(); if (e.key === "Escape") { setPendingFiles(null); setPendingCaption(""); } }}
                placeholder="例: 春季大会、練習風景..."
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 mb-4"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleConfirmUpload}
                  className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
                >
                  アップロード
                </button>
                <button
                  onClick={() => { setPendingFiles(null); setPendingCaption(""); }}
                  className="px-4 py-2.5 rounded-xl border border-border text-sm text-muted-foreground hover:bg-muted transition-colors"
                >
                  キャンセル
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default GalleryPage;
