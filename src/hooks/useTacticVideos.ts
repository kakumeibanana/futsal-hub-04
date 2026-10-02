import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { detectVideoType } from "@/lib/tactics";

// 作戦ごとの参考動画（サイトで追加・削除する）。保存先は tactic_videos テーブルと、videos バケット（tactics/ の下）。
// 作戦ID は「フォルダ/ファイル名」（例: コーナー/右コーナー(オーサワ1番)）。ファイル名を変えると、動画との結びつきが切れる。

export type TacticVideoType = "youtube" | "drive" | "link" | "upload";

export interface TacticVideoRow {
  id: string;
  tacticId: string;
  title: string;
  type: TacticVideoType;
  url: string;
  storagePath: string | null;
  createdBy: string;
}

export const DB_VIDEO_MAX = 10; // 1つの作戦に付けられる、サイトで追加した動画の数
export const TITLE_MAX = 60;
const BUCKET = "videos";
const PREFIX = "tactics";
const VIDEO_EXTS = ["mp4", "mov", "m4v", "webm"];

// 自分たちのストレージに上げたファイルの URL か（<video> で直接再生してよいのは、これだけ）
export const isOwnUpload = (url: string) => {
  const base = import.meta.env.VITE_SUPABASE_URL;
  return typeof base === "string" && base.length > 0 && url.startsWith(`${base}/storage/v1/object/public/${BUCKET}/`);
};

// http・https の URL だけ通す（javascript: などは受けない）
export const normalizeVideoUrl = (input: string): string | null => {
  const u = input.trim();
  return /^https?:\/\/\S+$/i.test(u) && u.length <= 600 ? u : null;
};

const fileExt = (file: File): string | null => {
  const m = file.name.toLowerCase().match(/\.([a-z0-9]{2,5})$/);
  if (m && VIDEO_EXTS.includes(m[1])) return m[1];
  const fromMime = file.type.match(/^video\/(mp4|webm|quicktime|x-m4v)$/);
  if (fromMime) return fromMime[1] === "quicktime" ? "mov" : fromMime[1] === "x-m4v" ? "m4v" : fromMime[1];
  return null;
};

export const isVideoFile = (file: File) => fileExt(file) !== null;

const toRow = (r: {
  id: string;
  tactic_id: string;
  title: string;
  type: string;
  url: string;
  storage_path: string | null;
  created_by: string;
}): TacticVideoRow => ({
  id: r.id,
  tacticId: r.tactic_id,
  title: r.title,
  type: (["youtube", "drive", "link", "upload"].includes(r.type) ? r.type : "link") as TacticVideoType,
  url: r.url,
  storagePath: r.storage_path,
  createdBy: r.created_by,
});

export async function fetchTacticVideos(tacticId: string): Promise<TacticVideoRow[]> {
  const { data, error } = await supabase
    .from("tactic_videos")
    .select("id, tactic_id, title, type, url, storage_path, created_by")
    .eq("tactic_id", tacticId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(toRow);
}

// リンク（YouTube・ドライブ・そのほか）を付ける
export async function addLinkVideo(args: { tacticId: string; url: string; title: string; createdBy: string }) {
  const url = normalizeVideoUrl(args.url);
  if (!url) throw new Error("http:// か https:// で始まるURLを入れてください");
  const { error } = await supabase.from("tactic_videos").insert({
    tactic_id: args.tacticId,
    title: args.title.trim().slice(0, TITLE_MAX),
    type: detectVideoType(url),
    url,
    created_by: args.createdBy.slice(0, 60),
  });
  if (error) throw new Error("保存できませんでした。もう一度お試しください");
}

// PCの動画ファイルをアップロードして付ける。保存に失敗したら、上げたファイルも消す。
export async function addUploadVideo(args: { tacticId: string; file: File; title: string; createdBy: string }) {
  const ext = fileExt(args.file);
  if (!ext) throw new Error("動画ファイル（mp4・mov・m4v・webm）を選んでください");

  // キー（保存名）には日本語を使わない。時刻と乱数だけにして、元のファイル名はタイトルに使う
  const path = `${PREFIX}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, args.file, {
    contentType: args.file.type || undefined,
    cacheControl: "31536000",
  });
  if (upErr) {
    const big = /size|large|exceed/i.test(upErr.message);
    throw new Error(
      big
        ? "ファイルが大きすぎて、アップロードできませんでした。YouTube（限定公開）やGoogleドライブのリンクを使ってください"
        : "アップロードできませんでした。もう一度お試しください",
    );
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  const { error } = await supabase.from("tactic_videos").insert({
    tactic_id: args.tacticId,
    title: args.title.trim().slice(0, TITLE_MAX),
    type: "upload",
    url: data.publicUrl,
    storage_path: path,
    created_by: args.createdBy.slice(0, 60),
  });
  if (error) {
    await supabase.storage.from(BUCKET).remove([path]); // 表に入らなかったファイルは、残さない
    throw new Error("保存できませんでした。もう一度お試しください");
  }
}

// 動画を外す。アップロードしたファイルなら、ストレージのファイルも消す（失敗しても、表からは外れる）
export async function removeTacticVideo(row: TacticVideoRow) {
  const { error } = await supabase.from("tactic_videos").delete().eq("id", row.id);
  if (error) throw new Error("外せませんでした。もう一度お試しください");
  if (row.type === "upload" && row.storagePath && row.storagePath.startsWith(`${PREFIX}/`)) {
    await supabase.storage.from(BUCKET).remove([row.storagePath]);
  }
}

export const tacticVideosKey = (tacticId: string) => ["tactic-videos", tacticId] as const;

export const useTacticVideos = (tacticId: string) =>
  useQuery({
    queryKey: tacticVideosKey(tacticId),
    queryFn: () => fetchTacticVideos(tacticId),
    staleTime: 30_000,
    retry: false,
  });
