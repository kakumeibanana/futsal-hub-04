import { useState, useEffect, useRef } from "react";
import { ImageIcon, Plus, Trash2, X, Loader2 } from "lucide-react";
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchImages = async () => {
    const { data } = await supabase
      .from("gallery_images")
      .select("*")
      .order("created_at", { ascending: false });
    setImages((data ?? []) as GalleryImage[]);
    setLoading(false);
  };

  useEffect(() => { fetchImages(); }, []);

  const handleUpload = async (files: FileList) => {
    setUploading(true);
    for (const file of Array.from(files)) {
      const ext = file.name.split(".").pop();
      const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from("news-images").upload(path, file);
      if (!error) {
        const { data } = supabase.storage.from("news-images").getPublicUrl(path);
        await supabase.from("gallery_images").insert({ url: data.publicUrl });
      }
    }
    await fetchImages();
    setUploading(false);
  };

  const handleDelete = async (img: GalleryImage) => {
    if (!confirm("この写真を削除しますか？")) return;
    await supabase.from("gallery_images").delete().eq("id", img.id);
    setImages((prev) => prev.filter((i) => i.id !== img.id));
    if (lightbox?.id === img.id) setLightbox(null);
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
              onChange={(e) => { if (e.target.files?.length) handleUpload(e.target.files); e.target.value = ""; }}
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
              onClick={() => setLightbox(img)}
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
              <img src={lightbox.url} alt={lightbox.caption} className="w-full rounded-2xl" />
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
    </div>
  );
};

export default GalleryPage;
