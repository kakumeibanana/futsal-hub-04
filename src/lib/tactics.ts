// 作戦盤（フットサル作戦盤）が書き出すJSONを、サイトで再生するための読み込み処理。
// 座標は作戦盤と同じく実寸メートル。コマの並びは 青1..N → 赤1..N → ボール。

// full = 全面（縦向き 20×40m）／ half = 半面（ゴールが上。20×20m + 余白）
export type Court = "full" | "half";

export const VBS = {
  full: { x: -1.6, y: -2.2, w: 23.2, h: 44.4 },
  half: { x: -1.6, y: -2.2, w: 23.2, h: 23.8 },
} as const;

// コマの実寸半径。半面は盤が大きく映るので、全面版と画面上の大きさが揃うよう小さくする
export const RADII = {
  full: { player: 1.3, ball: 0.85 },
  half: { player: 0.7, ball: 0.45 },
} as const;
export const SEG_MS = 900; // コマ間の再生時間（作戦盤と同じ）
export const HOLD_MS = 1600; // 最後のコマで止めてから頭に戻るまで（再生時間の単位。速度に応じて伸び縮みする）
export const SPEEDS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75] as const;

export interface Piece {
  t: "a" | "b" | "ball";
  n?: number;
}

// 番号ごとの名前（作戦盤の「選手」で入れたもの）。a=赤・b=青。無ければ空
export const NAME_MAX = 8;
const parseNames = (raw: any): { a: string[]; b: string[] } => {
  const pick = (v: unknown) =>
    Array.isArray(v) ? v.slice(0, 15).map((x) => (typeof x === "string" ? x.slice(0, NAME_MAX) : "")) : [];
  return { a: pick(raw?.a), b: pick(raw?.b) };
};

export interface Tactic {
  id: string;
  court: Court;
  name: string;
  note?: string;
  roster: { a: number; b: number };
  names: { a: string[]; b: string[] };
  pieces: Piece[];
  frames: { x: number; y: number }[][];
}

export const buildPieces = (a: number, b: number): Piece[] => [
  ...Array.from({ length: b }, (_, i): Piece => ({ t: "b", n: i + 1 })),
  ...Array.from({ length: a }, (_, i): Piece => ({ t: "a", n: i + 1 })),
  { t: "ball" },
];

const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);
const team = (v: unknown) => (isNum(v) ? clamp(Math.floor(v), 1, 15) : 5);

// 形が合わないファイルは黙って落とさず null を返す（呼び出し側で警告する）
export const parseTactic = (id: string, raw: any): Tactic | null => {
  if (!raw || typeof raw !== "object" || !Array.isArray(raw.frames) || raw.frames.length < 1) return null;

  const court: Court = raw.court === "half" ? "half" : "full";
  const vb = VBS[court];
  const a = team(raw.roster?.a);
  const b = team(raw.roster?.b);
  const pieces = buildPieces(a, b);

  const frames: Tactic["frames"] = [];
  for (const f of raw.frames) {
    if (!Array.isArray(f) || f.length !== pieces.length) return null;
    const frame: { x: number; y: number }[] = [];
    for (let j = 0; j < f.length; j++) {
      const p = f[j];
      const x = Array.isArray(p) ? p[0] : p?.x;
      const y = Array.isArray(p) ? p[1] : p?.y;
      if (!isNum(x) || !isNum(y)) return null;
      const r = pieces[j].t === "ball" ? RADII[court].ball : RADII[court].player;
      frame.push({
        x: clamp(x, vb.x + r, vb.x + vb.w - r),
        y: clamp(y, vb.y + r, vb.y + vb.h - r),
      });
    }
    frames.push(frame);
  }

  return {
    id,
    court,
    name: typeof raw.name === "string" && raw.name.trim() ? raw.name.trim().slice(0, 40) : "作戦",
    note: typeof raw.note === "string" ? raw.note : undefined,
    roster: { a, b },
    names: parseNames(raw.names),
    pieces,
    frames,
  };
};

// src/data/tactics/*.json をファイル名順に読む。ファイルを置くだけで増える。
const modules = import.meta.glob("../data/tactics/*.json", { eager: true, import: "default" });

export const tactics: Tactic[] = Object.entries(modules)
  .sort(([p], [q]) => p.localeCompare(q))
  .flatMap(([path, raw]) => {
    const id = path.split("/").pop()!.replace(/\.json$/, "");
    const t = parseTactic(id, raw);
    if (!t) console.warn(`[tactics] ${id}.json は作戦盤の形式として読めませんでした`);
    return t ? [t] : [];
  });

// 作戦盤と同じイーズ（cubic in-out）
export const ease = (u: number) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);

// clock(ms) 時点の全コマの位置
export const positionsAt = (frames: Tactic["frames"], clock: number) => {
  if (frames.length < 2) return frames[0];
  const total = (frames.length - 1) * SEG_MS;
  const c = clamp(clock, 0, total);
  const seg = Math.min(Math.floor(c / SEG_MS), frames.length - 2);
  const u = ease((c - seg * SEG_MS) / SEG_MS);
  const A = frames[seg];
  const B = frames[seg + 1];
  return A.map((p, i) => ({ x: p.x + (B[i].x - p.x) * u, y: p.y + (B[i].y - p.y) * u }));
};
