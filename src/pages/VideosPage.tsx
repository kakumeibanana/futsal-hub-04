import { useState, useEffect, useRef } from "react";
import { Video, Plus, Trash2, X, Loader2, Youtube, Upload, Play, Edit2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface VideoItem {
  id: string;
  title: string;
  type: "youtube" | "upload";
  url: string;
  date: string;
}

function extractYoutubeId(url: string): string | null {
  const match = url.match(
    /(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  );
  return match ? match[1] : null;
}

function YoutubeThumbnail({ videoId }: { videoId: string }) {
  return (
    <img
      src={`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`}
      alt="thumbnail"
      className="w-full h-full object-cover"
      loading="lazy"
    />
  );
}

const AddVideoModal = ({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) => {
  const [tab, setTab] = useState<"youtube" | "upload">("youtube");
  const [title, setTitle] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const inputClass =
    "w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50";

  const handleYoutubeSave = async () => {
    if (!title.trim()) return setError("タイトルを入力してください");
    const videoId = extractYoutubeId(youtubeUrl);
    if (!videoId) return setError("正しいYouTube URLを入力してください");
    setUploading(true);
    await supabase.from("videos").insert({ title: title.trim(), type: "youtube", url: youtubeUrl, date });
    setUploading(false);
    onSaved();
    onClose();
  };

  const handleFileUpload = async (file: File) => {
    if (!title.trim()) return setError("タイトルを入力してください");
    setError("");
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error: uploadError } = await supabase.storage.from("videos").upload(path, file);
    if (uploadError) {
      setError("アップロードに失敗しました");
      setUploading(false);
      return;
    }
    const { data } = supabase.storage.from("videos").getPublicUrl(path);
    await supabase.from("videos").insert({ title: title.trim(), type: "upload", url: data.publicUrl, date });
    setUploading(false);
    onSaved();
    onClose();
  };

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
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-md bg-card rounded-2xl border border-border p-6 space-y-4 z-10"
      >
        <div className="flex items-center justify-between">
          <h2 className="font-display font-bold text-lg text-foreground">動画を追加</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* タブ */}
        <div className="flex gap-2 p-1 bg-muted rounded-xl">
          <button
            onClick={() => setTab("youtube")}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-colors ${tab === "youtube" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          >
            <Youtube size={15} />YouTube URL
          </button>
          <button
            onClick={() => setTab("upload")}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-colors ${tab === "upload" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          >
            <Upload size={15} />アップロード
          </button>
        </div>

        <div>
          <label className="text-xs font-semibold text-foreground mb-1 block">タイトル *</label>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="動画タイトル" className={inputClass} />
        </div>

        <div>
          <label className="text-xs font-semibold text-foreground mb-1 block">日付</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} />
        </div>

        {tab === "youtube" ? (
          <div>
            <label className="text-xs font-semibold text-foreground mb-1 block">YouTube URL *</label>
            <input
              type="text"
              value={youtubeUrl}
              onChange={(e) => { setYoutubeUrl(e.target.value); setError(""); }}
              placeholder="https://www.youtube.com/watch?v=..."
              className={inputClass}
            />
          </div>
        ) : (
          <div>
            <label className="text-xs font-semibold text-foreground mb-1 block">動画ファイル *</label>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="w-full py-8 rounded-xl border-2 border-dashed border-border text-muted-foreground text-sm hover:border-primary/50 hover:text-primary transition-colors disabled:opacity-50 flex flex-col items-center gap-2"
            >
              {uploading ? <Loader2 size={22} className="animate-spin" /> : <Upload size={22} />}
              {uploading ? "アップロード中..." : "クリックしてファイルを選択"}
            </button>
            <input ref={fileInputRef} type="file" accept="video/*" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); e.target.value = ""; }}
            />
          </div>
        )}

        {error && <p className="text-xs text-destructive">{error}</p>}

        {tab === "youtube" && (
          <button
            onClick={handleYoutubeSave}
            disabled={uploading}
            className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {uploading ? <Loader2 size={15} className="animate-spin" /> : null}
            {uploading ? "保存中..." : "保存する"}
          </button>
        )}
      </motion.div>
    </div>
  );
};

const EditVideoModal = ({ video, onClose, onSaved }: { video: VideoItem; onClose: () => void; onSaved: () => void }) => {
  const [title, setTitle] = useState(video.title);
  const [url, setUrl] = useState(video.url);
  const [date, setDate] = useState(video.date);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const inputClass =
    "w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50";

  const handleSave = async () => {
    if (!title.trim()) return setError("タイトルを入力してください");
    if (video.type === "youtube") {
      const videoId = extractYoutubeId(url);
      if (!videoId) return setError("正しいYouTube URLを入力してください");
    }
    setSaving(true);
    await supabase.from("videos").update({ title: title.trim(), url, date }).eq("id", video.id);
    setSaving(false);
    onSaved();
    onClose();
  };

  const handleReupload = async (file: File) => {
    setError("");
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error: uploadError } = await supabase.storage.from("videos").upload(path, file);
    if (uploadError) { setError("アップロードに失敗しました"); setUploading(false); return; }
    const { data } = supabase.storage.from("videos").getPublicUrl(path);
    setUrl(data.publicUrl);
    setUploading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative w-full max-w-md bg-card rounded-2xl border border-border p-6 space-y-4 z-10">
        <div className="flex items-center justify-between">
          <h2 className="font-display font-bold text-lg text-foreground">動画を編集</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted transition-colors"><X size={18} /></button>
        </div>

        <div>
          <label className="text-xs font-semibold text-foreground mb-1 block">タイトル *</label>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} />
        </div>

        <div>
          <label className="text-xs font-semibold text-foreground mb-1 block">日付</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} />
        </div>

        {video.type === "youtube" ? (
          <div>
            <label className="text-xs font-semibold text-foreground mb-1 block">YouTube URL</label>
            <input type="text" value={url} onChange={(e) => { setUrl(e.target.value); setError(""); }} className={inputClass} />
          </div>
        ) : (
          <div>
            <label className="text-xs font-semibold text-foreground mb-1 block">動画ファイル</label>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="w-full py-6 rounded-xl border-2 border-dashed border-border text-muted-foreground text-sm hover:border-primary/50 hover:text-primary transition-colors disabled:opacity-50 flex flex-col items-center gap-2"
            >
              {uploading ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
              {uploading ? "アップロード中..." : "ファイルを差し替える"}
            </button>
            {url !== video.url && <p className="text-xs text-green-600 mt-1">新しいファイルが選択されました</p>}
            <input ref={fileInputRef} type="file" accept="video/*" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleReupload(f); e.target.value = ""; }}
            />
          </div>
        )}

        {error && <p className="text-xs text-destructive">{error}</p>}

        <button
          onClick={handleSave}
          disabled={saving || uploading}
          className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {saving ? <Loader2 size={15} className="animate-spin" /> : null}
          {saving ? "保存中..." : "保存する"}
        </button>
      </motion.div>
    </div>
  );
};

const VideoPlayer = ({ video, onClose }: { video: VideoItem; onClose: () => void }) => {
  const youtubeId = video.type === "youtube" ? extractYoutubeId(video.url) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/85 backdrop-blur-sm"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="relative w-full max-w-3xl z-10"
      >
        <div className="aspect-video w-full rounded-2xl overflow-hidden bg-black">
          {youtubeId ? (
            <iframe
              src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1`}
              className="w-full h-full"
              allowFullScreen
              allow="autoplay; encrypted-media"
            />
          ) : (
            <video src={video.url} controls autoPlay className="w-full h-full" />
          )}
        </div>
        <p className="text-white/80 text-sm font-semibold mt-3 text-center">{video.title}</p>
        <button
          onClick={onClose}
          className="absolute -top-3 -right-3 p-2 bg-black/60 hover:bg-black/80 text-white rounded-full transition-colors"
        >
          <X size={18} />
        </button>
      </motion.div>
    </div>
  );
};

const VideosPage = () => {
  const { isStaff } = useAuth();
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<VideoItem | null>(null);
  const [playing, setPlaying] = useState<VideoItem | null>(null);

  const fetchVideos = async () => {
    const { data } = await supabase.from("videos").select("*").order("date", { ascending: false });
    setVideos((data ?? []) as VideoItem[]);
    setLoading(false);
  };

  useEffect(() => { fetchVideos(); }, []);

  const handleDelete = async (v: VideoItem) => {
    if (!confirm(`「${v.title}」を削除しますか？`)) return;
    await supabase.from("videos").delete().eq("id", v.id);
    if (v.type === "upload") {
      const path = v.url.split("/videos/")[1];
      if (path) await supabase.storage.from("videos").remove([path]);
    }
    setVideos((prev) => prev.filter((x) => x.id !== v.id));
    if (playing?.id === v.id) setPlaying(null);
  };

  return (
    <div className="container py-10">
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-display font-bold text-3xl text-foreground flex items-center gap-2">
          <Video size={28} className="text-primary" />
          試合動画
        </h1>
        {isStaff && (
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
          >
            <Plus size={16} />動画を追加
          </button>
        )}
      </div>

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-xl bg-muted animate-pulse aspect-video" />
          ))}
        </div>
      ) : videos.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground text-sm border border-dashed rounded-xl border-border bg-card/50">
          動画はまだありません
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {videos.map((v, i) => {
            const youtubeId = v.type === "youtube" ? extractYoutubeId(v.url) : null;
            return (
              <motion.div
                key={v.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                className="group rounded-xl overflow-hidden border border-border bg-card cursor-pointer hover:shadow-primary transition-all duration-300 relative"
                onClick={() => setPlaying(v)}
              >
                <div className="relative aspect-video bg-muted">
                  {youtubeId ? (
                    <YoutubeThumbnail videoId={youtubeId} />
                  ) : (
                    <video src={v.url} className="w-full h-full object-cover" preload="metadata" />
                  )}
                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-12 h-12 rounded-full bg-primary/90 flex items-center justify-center">
                      <Play size={20} className="text-primary-foreground ml-0.5" />
                    </div>
                  </div>
                  {v.type === "youtube" && (
                    <span className="absolute top-2 left-2 px-2 py-0.5 rounded bg-red-600 text-white text-xs font-bold flex items-center gap-1">
                      <Youtube size={10} />YouTube
                    </span>
                  )}
                </div>
                <div className="p-4 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-display font-semibold text-sm text-foreground truncate">{v.title}</h3>
                    <p className="text-xs text-muted-foreground mt-1">{v.date.replace(/^2026-/, "").replace("-", "/")}</p>
                  </div>
                  {isStaff && (
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                      <button
                        onClick={(e) => { e.stopPropagation(); setEditing(v); }}
                        className="p-1.5 rounded-lg bg-muted hover:bg-secondary text-muted-foreground transition-colors"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(v); }}
                        className="p-1.5 rounded-lg bg-muted hover:bg-red-100 text-muted-foreground hover:text-red-600 transition-colors"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      <AnimatePresence>
        {showAdd && (
          <AddVideoModal onClose={() => setShowAdd(false)} onSaved={fetchVideos} />
        )}
        {editing && (
          <EditVideoModal video={editing} onClose={() => setEditing(null)} onSaved={fetchVideos} />
        )}
        {playing && (
          <VideoPlayer video={playing} onClose={() => setPlaying(null)} />
        )}
      </AnimatePresence>
    </div>
  );
};

export default VideosPage;
