import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ExternalLink, Loader2, Play, Plus, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { type TacticVideo, driveId, isDirectVideoUrl, youtubeId } from "@/lib/tactics";
import {
  DB_VIDEO_MAX,
  TITLE_MAX,
  type TacticVideoRow,
  addLinkVideo,
  addUploadVideo,
  isOwnUpload,
  isVideoFile,
  removeTacticVideo,
  tacticVideosKey,
  useTacticVideos,
} from "@/hooks/useTacticVideos";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// 作戦の参考動画。
//   YouTube          … サムネイルを押すと、その場で再生（最初から全部は読み込まない）
//   Googleドライブ   … 同じく、押すと、その場で再生（共有が「リンクを知っている全員」のとき）
//   サイトにアップした動画ファイル … <video> でそのまま再生
//   それ以外         … リンクで開く
// 主将・幹部は、ここで追加・削除できる（サイトの他のページの編集と同じ isStaff の判定）。

type Kind = "youtube" | "drive" | "file" | "link";

interface Item {
  key: string;
  url: string;
  title: string;
  kind: Kind;
  row?: TacticVideoRow; // サイトで追加した動画（削除できる）
}

const hostOf = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
};

const kindOf = (url: string, upload: boolean): Kind => {
  if (youtubeId(url)) return "youtube";
  if (driveId(url)) return "drive";
  if ((upload && isOwnUpload(url)) || (!upload && isDirectVideoUrl(url))) return "file";
  return "link";
};

const VideoCard = ({ item, index, canRemove, onRemove }: { item: Item; index: number; canRemove: boolean; onRemove: () => void }) => {
  const yt = youtubeId(item.url);
  const dr = driveId(item.url);
  const [playing, setPlaying] = useState(false);
  const title = item.title || (item.kind === "link" ? hostOf(item.url) : `参考動画 ${index + 1}`);
  const openLabel = item.kind === "youtube" ? "YouTubeで開く" : item.kind === "drive" ? "ドライブで開く" : "動画を開く";

  const poster = (label: string, thumb?: string) => (
    <button type="button" onClick={() => setPlaying(true)} className="group absolute inset-0 w-full h-full bg-slate-900" aria-label={`${title} を再生`}>
      {thumb && <img src={thumb} alt="" loading="lazy" className="w-full h-full object-cover" />}
      <span className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/25 group-hover:bg-black/35 transition-colors">
        <span className="w-14 h-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg">
          <Play size={24} className="ml-0.5" />
        </span>
        {!thumb && <span className="text-xs font-medium text-white/90">{label}</span>}
      </span>
    </button>
  );

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {item.kind === "youtube" && yt && (
        <div className="relative aspect-video bg-black">
          {playing ? (
            <iframe
              src={`https://www.youtube.com/embed/${yt}?autoplay=1&rel=0`}
              title={title}
              className="absolute inset-0 w-full h-full"
              allowFullScreen
              allow="autoplay; encrypted-media; picture-in-picture"
            />
          ) : (
            poster("YouTube", `https://img.youtube.com/vi/${yt}/hqdefault.jpg`)
          )}
        </div>
      )}

      {item.kind === "drive" && dr && (
        <div className="relative aspect-video bg-black">
          {playing ? (
            <iframe src={`https://drive.google.com/file/d/${dr}/preview`} title={title} className="absolute inset-0 w-full h-full" allowFullScreen allow="autoplay" />
          ) : (
            poster("Googleドライブの動画")
          )}
        </div>
      )}

      {item.kind === "file" && (
        <video src={item.url} title={title} controls playsInline preload="metadata" className="w-full aspect-video bg-black" />
      )}

      <div className="flex items-center justify-between gap-3 px-3.5 py-3">
        <p className="text-sm font-bold text-foreground min-w-0 truncate">{title}</p>
        <div className="flex flex-shrink-0 items-center gap-2">
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            {openLabel}
            <ExternalLink size={12} />
          </a>
          {canRemove && (
            <button
              type="button"
              onClick={onRemove}
              className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-destructive transition-colors"
              aria-label={`${title} を外す`}
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const AddVideoDialog = ({
  open,
  onOpenChange,
  tacticId,
  memberName,
  count,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  tacticId: string;
  memberName: string;
  count: number;
}) => {
  const qc = useQueryClient();
  const [tab, setTab] = useState("link");
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const reset = () => {
    setUrl("");
    setTitle("");
    setFile(null);
    setError("");
  };

  const submit = async () => {
    setError("");
    if (count >= DB_VIDEO_MAX) return setError(`1つの作戦に追加できる動画は ${DB_VIDEO_MAX} 本までです`);
    setBusy(true);
    try {
      if (tab === "link") {
        await addLinkVideo({ tacticId, url, title, createdBy: memberName });
      } else {
        if (!file) throw new Error("動画ファイルを選んでください");
        await addUploadVideo({ tacticId, file, title, createdBy: memberName });
      }
      await qc.invalidateQueries({ queryKey: tacticVideosKey(tacticId) });
      toast.success("動画を追加しました");
      reset();
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "追加できませんでした");
    } finally {
      setBusy(false);
    }
  };

  const pickFile = (f: File | null) => {
    setError("");
    if (f && !isVideoFile(f)) {
      setFile(null);
      return setError("動画ファイル（mp4・mov・m4v・webm）を選んでください");
    }
    setFile(f);
    if (f && !title) setTitle(f.name.replace(/\.[^.]+$/, "").slice(0, TITLE_MAX));
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !busy && onOpenChange(v)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>参考動画を追加</DialogTitle>
          <DialogDescription>この作戦に付ける動画です。追加すると、部員全員に見えます。</DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => { setTab(v); setError(""); }}>
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="link">リンク</TabsTrigger>
            <TabsTrigger value="file">PCのファイル</TabsTrigger>
          </TabsList>

          <TabsContent value="link" className="space-y-3 mt-4">
            <div>
              <label className="text-xs font-semibold mb-1 block" htmlFor="tv-url">動画のURL（YouTube・Googleドライブなど）</label>
              <Input id="tv-url" value={url} onChange={(e) => { setUrl(e.target.value); setError(""); }} placeholder="https://youtu.be/…" inputMode="url" />
            </div>
          </TabsContent>

          <TabsContent value="file" className="space-y-3 mt-4">
            <label
              htmlFor="tv-file"
              className="flex flex-col items-center gap-2 rounded-xl border-2 border-dashed border-border px-4 py-6 text-sm text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors cursor-pointer"
            >
              <Upload size={22} />
              <span className="text-center break-all">{file ? file.name : "動画ファイルを選ぶ（mp4・mov・m4v・webm）"}</span>
            </label>
            <input id="tv-file" type="file" accept="video/*,.mp4,.mov,.m4v,.webm" className="sr-only" onChange={(e) => { pickFile(e.target.files?.[0] ?? null); e.target.value = ""; }} />
            <p className="text-xs text-muted-foreground leading-relaxed">
              ファイルが大きいと、アップロードできないことがあります（目安：50MBまで）。大きい動画は、YouTube（限定公開）かGoogleドライブに上げて、「リンク」で付けてください。
            </p>
          </TabsContent>
        </Tabs>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold mb-1 block" htmlFor="tv-title">タイトル（なくてもOK）</label>
            <Input id="tv-title" value={title} maxLength={TITLE_MAX} onChange={(e) => setTitle(e.target.value)} placeholder="例：本家のチョンドン" />
          </div>

          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}

          <Button type="button" onClick={submit} disabled={busy} className="w-full gap-2">
            {busy ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
            {busy ? (tab === "file" ? "アップロード中…" : "追加中…") : "追加する"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const TacticVideos = ({
  tacticId,
  fileVideos,
  isStaff,
  memberName,
}: {
  tacticId: string;
  fileVideos: TacticVideo[]; // 作戦のJSONに入っている動画（作戦盤で付けたもの）
  isStaff: boolean;
  memberName: string;
}) => {
  const qc = useQueryClient();
  const { data: rows = [], isError } = useTacticVideos(tacticId);
  const [dialogOpen, setDialogOpen] = useState(false);

  const items: Item[] = [
    ...fileVideos.map((v, i) => ({ key: `f${i}-${v.url}`, url: v.url, title: v.title, kind: kindOf(v.url, false) })),
    ...rows.map((r) => ({ key: r.id, url: r.url, title: r.title, kind: kindOf(r.url, r.type === "upload"), row: r })),
  ];

  const remove = async (row: TacticVideoRow) => {
    if (!window.confirm(`「${row.title || "この動画"}」を外しますか？`)) return;
    try {
      await removeTacticVideo(row);
      await qc.invalidateQueries({ queryKey: tacticVideosKey(tacticId) });
      toast.success("動画を外しました");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "外せませんでした");
    }
  };

  // 動画が無く、追加もできない人には、何も出さない
  if (items.length === 0 && !isStaff) return null;

  return (
    <section className="mt-8" aria-label="参考動画">
      <div className="flex items-center justify-between gap-3 mb-3">
        <h3 className="font-bold text-base">参考動画</h3>
        {isStaff && (
          <Button type="button" size="sm" variant="outline" className="gap-1.5" onClick={() => setDialogOpen(true)}>
            <Plus size={14} />
            動画を追加
          </Button>
        )}
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">まだ動画がありません。「動画を追加」から付けられます。</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {items.map((it, i) => (
            <VideoCard key={it.key} item={it} index={i} canRemove={isStaff && !!it.row} onRemove={() => it.row && remove(it.row)} />
          ))}
        </div>
      )}

      {isError && isStaff && <p className="mt-2 text-xs text-muted-foreground">サイトで追加した動画を読み込めませんでした。</p>}

      {isStaff && <AddVideoDialog open={dialogOpen} onOpenChange={setDialogOpen} tacticId={tacticId} memberName={memberName} count={rows.length} />}
    </section>
  );
};

export default TacticVideos;
