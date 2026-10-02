import { useState } from "react";
import { ExternalLink, Play } from "lucide-react";
import { type TacticVideo, youtubeId } from "@/lib/tactics";

// 作戦の参考動画。YouTube はサムネイルを押すと、その場で再生する（最初から全部読み込まない）。
// YouTube 以外（Google ドライブなど）は、リンクとして開く。
const hostOf = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
};

const VideoCard = ({ video, index }: { video: TacticVideo; index: number }) => {
  const id = youtubeId(video.url);
  const [playing, setPlaying] = useState(false);
  const title = video.title || (id ? `参考動画 ${index + 1}` : hostOf(video.url));

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {id ? (
        <div className="relative aspect-video bg-black">
          {playing ? (
            <iframe
              src={`https://www.youtube.com/embed/${id}?autoplay=1&rel=0`}
              title={title}
              className="absolute inset-0 w-full h-full"
              allowFullScreen
              allow="autoplay; encrypted-media; picture-in-picture"
            />
          ) : (
            <button
              type="button"
              onClick={() => setPlaying(true)}
              className="group absolute inset-0 w-full h-full"
              aria-label={`${title} を再生`}
            >
              <img
                src={`https://img.youtube.com/vi/${id}/hqdefault.jpg`}
                alt=""
                loading="lazy"
                className="w-full h-full object-cover"
              />
              <span className="absolute inset-0 flex items-center justify-center bg-black/25 group-hover:bg-black/35 transition-colors">
                <span className="w-14 h-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg">
                  <Play size={24} className="ml-0.5" />
                </span>
              </span>
            </button>
          )}
        </div>
      ) : null}

      <div className="flex items-center justify-between gap-3 px-3.5 py-3">
        <p className="text-sm font-bold text-foreground min-w-0 truncate">{title}</p>
        <a
          href={video.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex flex-shrink-0 items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          {id ? "YouTubeで開く" : "動画を開く"}
          <ExternalLink size={12} />
        </a>
      </div>
    </div>
  );
};

const TacticVideos = ({ videos }: { videos: TacticVideo[] }) => {
  if (videos.length === 0) return null;
  return (
    <section className="mt-8" aria-label="参考動画">
      <h3 className="font-bold text-base mb-3">参考動画</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        {videos.map((v, i) => (
          <VideoCard key={v.url} video={v} index={i} />
        ))}
      </div>
    </section>
  );
};

export default TacticVideos;
