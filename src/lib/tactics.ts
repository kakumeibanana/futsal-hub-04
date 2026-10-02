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
export const HOLD_MS = 1600; // 最後のコマで止めてから頭に戻るまで（再生時間の単位。再生速度に応じて伸び縮みする）

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
  category: string; // フォルダ名（無ければ「その他」）
  court: Court;
  name: string; // JSON の名前。「右コーナー(オーサワ1番)」のように、頭の「右コーナー」は識別用
  label: string; // 画面に出す名前＝「( )」の中身。( ) が無ければ name そのまま
  side: "右" | "左" | null; // 名前の頭が 右/左 のとき。同じ label が並ぶときの見分けに使う
  note?: string;
  roster: { a: number; b: number };
  names: { a: string[]; b: string[] };
  nameScale: number; // 名前の文字の大きさの倍率（作戦盤で調整した値）
  balloons: Balloon[][]; // コマごとのふきだし。frames と同じ数・同じ並び
  pieces: Piece[];
  frames: { x: number; y: number }[][];
}

// 盤の上に置く書き込み。位置は盤の座標（メートル）。そのコマが表示されているときだけ出す。
export interface Balloon {
  x: number;
  y: number;
  t: string;
}

export const BALLOON_MAX_TEXT = 30;
export const BALLOON_MAX_PER_FRAME = 8; // 作戦盤では5個まで。読む側は少し余裕を持つ

// 文字の大きさ（m）。作戦盤の BL_FS と同じ値にして、同じ見た目にする
export const balloonFontSize = (court: Court) => (court === "half" ? 0.78 : 1.1);

const charW = (ch: string, fs: number) => (ch.charCodeAt(0) >= 0x2e80 ? fs : fs * 0.6);
const lineW = (l: string, fs: number) => {
  let w = 0;
  for (let k = 0; k < l.length; k++) w += charW(l.charAt(k), fs);
  return w;
};

// ふきだしの形と位置を決める。作戦盤の drawBalloons と同じ計算（折り返し・端の逃がし・上下の出し分け）
export const layoutBalloon = (b: Balloon, vb: { x: number; y: number; w: number; h: number }, fs: number) => {
  const maxLine = fs * 11;
  const lines: string[] = [];
  let line = "";
  let w0 = 0;
  for (let k = 0; k < b.t.length; k++) {
    const ch = b.t.charAt(k);
    const cw = charW(ch, fs);
    if (w0 + cw > maxLine && line) {
      lines.push(line);
      line = "";
      w0 = 0;
    }
    line += ch;
    w0 += cw;
  }
  if (line) lines.push(line);

  const tw = Math.max(0, ...lines.map((l) => lineW(l, fs)));
  const padX = fs * 0.55;
  const padY = fs * 0.4;
  const lh = fs * 1.3;
  const tail = fs * 0.95;
  const sw = fs * 0.1;
  const w = tw + padX * 2;
  const h = lines.length * lh + padY * 2;

  const bx = Math.min(Math.max(b.x - w / 2, vb.x + 0.2), vb.x + vb.w - w - 0.2);
  const above = b.y - tail - h >= vb.y + 0.2; // 上に出す。入らなければ下
  const by = above ? b.y - tail - h : b.y + tail;
  const baseY = above ? by + h : by;
  const tx1 = Math.min(Math.max(b.x - fs * 0.45, bx + fs * 0.5), bx + w - fs * 1.4);
  const tx2 = tx1 + fs * 0.9;

  return { lines, bx, by, w, h, padY, lh, sw, baseY, tx1, tx2, tailPoints: `${tx1},${baseY} ${tx2},${baseY} ${b.x},${b.y}` };
};

// 外から来たデータは形と値域を検査してから通す。frames と同じ数にそろえる（足りなければ空）
const parseBalloons = (raw: any, n: number, vb: { x: number; y: number; w: number; h: number }): Balloon[][] =>
  Array.from({ length: n }, (_, i) => {
    const src: any[] = Array.isArray(raw?.[i]) ? raw[i] : [];
    return src.slice(0, BALLOON_MAX_PER_FRAME).flatMap((b): Balloon[] =>
      typeof b?.x === "number" && typeof b?.y === "number" && Number.isFinite(b.x) && Number.isFinite(b.y) &&
      typeof b?.t === "string" && b.t.trim()
        ? [
            {
              x: Math.min(Math.max(b.x, vb.x), vb.x + vb.w),
              y: Math.min(Math.max(b.y, vb.y), vb.y + vb.h),
              t: b.t.trim().slice(0, BALLOON_MAX_TEXT),
            },
          ]
        : [],
    );
  });

export const buildPieces = (a: number, b: number): Piece[] => [
  ...Array.from({ length: b }, (_, i): Piece => ({ t: "b", n: i + 1 })),
  ...Array.from({ length: a }, (_, i): Piece => ({ t: "a", n: i + 1 })),
  { t: "ball" },
];

const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);
const team = (v: unknown) => (isNum(v) ? clamp(Math.floor(v), 1, 15) : 5);

// 形が合わないファイルは黙って落とさず null を返す（呼び出し側で警告する）
export const parseTactic = (id: string, raw: any, category = "その他"): Tactic | null => {
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

  const name: string = typeof raw.name === "string" && raw.name.trim() ? raw.name.trim().slice(0, 40) : "作戦";
  // 画面には「( )」の中身だけを出す（頭の「右コーナー」などは、どの作戦かを識別するための印）
  const m = name.match(/[（(]([^）)]+)[）)]/);
  const label = m && m[1].trim() ? m[1].trim() : name;
  const side = name.startsWith("右") ? "右" : name.startsWith("左") ? "左" : null;

  return {
    id,
    category,
    court,
    name,
    label,
    side,
    note: typeof raw.note === "string" ? raw.note : undefined,
    roster: { a, b },
    names: parseNames(raw.names),
    balloons: parseBalloons(raw.balloons, frames.length, vb),
    nameScale: isNum(raw.nameScale) ? Math.round(clamp(raw.nameScale, 0.5, 1.5) * 10) / 10 : 1,
    pieces,
    frames,
  };
};

// src/data/tactics/ の下のJSONを読む。ファイルを置くだけで増える。
// フォルダがカテゴリになる（例: tactics/コーナー/右コーナー(オーサワ1番).json → カテゴリ「コーナー」）。
// フォルダに入れなかったJSONは「その他」。
// フォルダ名・ファイル名の頭に数字を付けると、その順に並ぶ（例: 1_コーナー, 2_キックイン。表示では数字を外す）。
const modules = import.meta.glob("../data/tactics/**/*.json", { eager: true, import: "default" });

export const OTHER_CATEGORY = "その他";
const ROOT = "../data/tactics/";
const stripOrder = (s: string) => s.replace(/^\d+[_＿\-.．\s]+/, "");
const natural = (a: string, b: string) => a.localeCompare(b, "ja", { numeric: true });

export interface TacticCategory {
  name: string;
  tactics: Tactic[];
}

const loaded = Object.entries(modules).flatMap(([path, raw]) => {
  const rel = path.startsWith(ROOT) ? path.slice(ROOT.length) : path;
  const parts = rel.split("/");
  const file = parts[parts.length - 1].replace(/\.json$/, "");
  const folder = parts.length > 1 ? parts[0] : null;
  const category = folder ? stripOrder(folder) : OTHER_CATEGORY;
  const t = parseTactic(rel.replace(/\.json$/, ""), raw, category);
  if (!t) console.warn(`[tactics] ${rel} は作戦盤の形式として読めませんでした`);
  return t ? [{ t, folder, file }] : [];
});

// カテゴリはフォルダ名の順（「その他」は最後）。カテゴリの中はファイル名の順（1番,2番,10番 の自然順）。
export const categories: TacticCategory[] = (() => {
  const byFolder = new Map<string, { name: string; items: typeof loaded }>();
  for (const it of loaded) {
    const key = it.folder ?? "￿"; // 「その他」を最後にする
    if (!byFolder.has(key)) byFolder.set(key, { name: it.t.category, items: [] });
    byFolder.get(key)!.items.push(it);
  }
  return [...byFolder.entries()]
    .sort(([a], [b]) => natural(a, b))
    .map(([, g]) => ({
      name: g.name,
      tactics: g.items.sort((x, y) => natural(x.file, y.file)).map((x) => x.t),
    }));
})();

export const tactics: Tactic[] = categories.flatMap((c) => c.tactics);

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
