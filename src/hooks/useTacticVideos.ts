import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { detectVideoType } from "@/lib/tactics";

// 作戦ごとの参考動画（サイトで追加・削除する）。保存先は tactic_videos テーブルと、videos バケット（tactics/ の下）。
// 作戦ID は「フォルダ/ファイル名」（例: コーナー/右コーナー(オーサワ1番)）。ファイル名を変えると、動画との結びつきが切れる。
//
// 1つの動画を、複数の作戦に付けられる（右と左、ホシナ2番①と②、など）。
// そのとき、動画ファイルは1つのまま、作戦ごとに tactic_videos の行を1つずつ持つ（同じ url・storage_path）。
// 外すときは、その作戦の行だけを消し、ファイルは、ほかの作戦に付いている間は消さない。

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

// 付ける動画そのもの（どの作戦に付けるかは別）
export interface VideoSource {
  title: string;
  type: TacticVideoType;
  url: string;
  storagePath: string | null;
}

export interface AttachResult {
  added: string[]; // 付けた作戦のID
  skipped: { id: string; reason: "already" | "full" }[]; // 付けなかった作戦（すでに付いている／いっぱい）
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

// 同じ動画（同じURL）が付いている作戦のID
export async function fetchTacticIdsWithUrl(url: string): Promise<string[]> {
  const { data, error } = await supabase.from("tactic_videos").select("tactic_id").eq("url", url);
  if (error) throw error;
  return [...new Set((data ?? []).map((r) => r.tactic_id))];
}

// 動画を、いくつかの作戦にまとめて付ける。
// すでに同じ動画が付いている作戦と、動画がいっぱい（10本）の作戦は、飛ばす。付けた作戦と飛ばした作戦を返す。
export async function attachVideo(args: { tacticIds: string[]; video: VideoSource; createdBy: string }): Promise<AttachResult> {
  const ids = [...new Set(args.tacticIds)];
  const { data: existing, error } = await supabase.from("tactic_videos").select("tactic_id, url").in("tactic_id", ids);
  if (error) throw new Error("保存できませんでした。もう一度お試しください");

  const count: Record<string, number> = {};
  const has = new Set<string>();
  for (const r of existing ?? []) {
    count[r.tactic_id] = (count[r.tactic_id] ?? 0) + 1;
    if (r.url === args.video.url) has.add(r.tactic_id);
  }

  const rows: { tactic_id: string; title: string; type: string; url: string; storage_path: string | null; created_by: string }[] = [];
  const skipped: AttachResult["skipped"] = [];
  for (const id of ids) {
    if (has.has(id)) skipped.push({ id, reason: "already" });
    else if ((count[id] ?? 0) >= DB_VIDEO_MAX) skipped.push({ id, reason: "full" });
    else
      rows.push({
        tactic_id: id,
        title: args.video.title.trim().slice(0, TITLE_MAX),
        type: args.video.type,
        url: args.video.url,
        storage_path: args.video.storagePath,
        created_by: args.createdBy.slice(0, 60),
      });
  }

  if (rows.length > 0) {
    const { error: e2 } = await supabase.from("tactic_videos").insert(rows); // 1回で全部入れる（途中までにならない）
    if (e2) throw new Error("保存できませんでした。もう一度お試しください");
  }
  return { added: rows.map((r) => r.tactic_id), skipped };
}

// リンク（YouTube・ドライブ・そのほか）を付ける。alsoTo に、ほかの作戦のIDを入れると、まとめて付ける。
export async function addLinkVideo(args: {
  tacticId: string;
  alsoTo?: string[];
  url: string;
  title: string;
  createdBy: string;
}): Promise<AttachResult> {
  const url = normalizeVideoUrl(args.url);
  if (!url) throw new Error("http:// か https:// で始まるURLを入れてください");
  return attachVideo({
    tacticIds: [args.tacticId, ...(args.alsoTo ?? [])],
    video: { title: args.title, type: detectVideoType(url), url, storagePath: null },
    createdBy: args.createdBy,
  });
}

// PCの動画ファイルをアップロードして付ける（ファイルは1回だけ上げる）。
// どこにも付けられなかったとき・保存に失敗したときは、上げたファイルも消す。
export async function addUploadVideo(args: {
  tacticId: string;
  alsoTo?: string[];
  file: File;
  title: string;
  createdBy: string;
}): Promise<AttachResult> {
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
  try {
    const result = await attachVideo({
      tacticIds: [args.tacticId, ...(args.alsoTo ?? [])],
      video: { title: args.title, type: "upload", url: data.publicUrl, storagePath: path },
      createdBy: args.createdBy,
    });
    if (result.added.length === 0) await supabase.storage.from(BUCKET).remove([path]); // どこにも付かなかったファイルは残さない
    return result;
  } catch (e) {
    await supabase.storage.from(BUCKET).remove([path]); // 表に入らなかったファイルは、残さない
    throw e;
  }
}

// 動画を、その作戦から外す。アップロードしたファイルは、ほかの作戦に付いていなければ、ストレージからも消す
// （失敗しても、表からは外れる）。
export async function removeTacticVideo(row: TacticVideoRow) {
  const { error } = await supabase.from("tactic_videos").delete().eq("id", row.id);
  if (error) throw new Error("外せませんでした。もう一度お試しください");

  if (row.type === "upload" && row.storagePath && row.storagePath.startsWith(`${PREFIX}/`)) {
    const { data: others } = await supabase.from("tactic_videos").select("id").eq("storage_path", row.storagePath).limit(1);
    if (!others || others.length === 0) {
      await supabase.storage.from(BUCKET).remove([row.storagePath]);
    }
  }
}

export const tacticVideosKey = (tacticId: string) => ["tactic-videos", tacticId] as const;
export const TACTIC_VIDEOS_ALL_KEY = ["tactic-videos"] as const; // どの作戦の動画も、まとめて更新したいとき

export const useTacticVideos = (tacticId: string) =>
  useQuery({
    queryKey: tacticVideosKey(tacticId),
    queryFn: () => fetchTacticVideos(tacticId),
    staleTime: 30_000,
    retry: false,
  });
