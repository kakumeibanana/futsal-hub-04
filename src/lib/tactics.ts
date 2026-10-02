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

// 盤の上に置く書き込み。角が少し丸い、透けた紫の四角（文字入り）。
// x, y は左上、w, h は大きさ（どれも盤の座標＝メートル）。そのコマが表示されているときだけ出す。
// 作戦盤の blFit / blWrap / blLegacy と同じ計算にして、同じ見た目にする。
export interface Balloon {
  x: number;
  y: number;
  w: number;
  h: number;
  t: string;
}

export const BALLOON_MAX_TEXT = 30;
export const BALLOON_MAX_PER_FRAME = 8; // 作戦盤では5個まで。読む側は少し余裕を持つ
export const BALLOON_FILL = "rgba(124, 58, 237, 0.55)"; // 透けた紫
export const BALLOON_STROKE = "rgba(91, 33, 182, 0.95)";
export const BALLOON_HALO = "#3B0764";

// 基準の文字の大きさ（m）。作戦盤の BL_FS と同じ値
export const balloonFontSize = (court: Court) => (court === "half" ? 0.78 : 1.1);

const balloonMetrics = (court: Court) => {
  const fs0 = balloonFontSize(court);
  return { fs0, max: fs0 * 1.6, min: fs0 * 0.45, step: fs0 * 0.04, minW: fs0 * 2.4, minH: fs0 * 1.8, rx: fs0 * 0.3 };
};

const charW = (ch: string, fs: number) => (ch.charCodeAt(0) >= 0x2e80 ? fs : fs * 0.6);
const lineW = (l: string, fs: number) => {
  let w = 0;
  for (let k = 0; k < l.length; k++) w += charW(l.charAt(k), fs);
  return w;
};

// 幅（maxW）を超えたら折り返す（小数の誤差は許す）
const wrapText = (t: string, fs: number, maxW: number) => {
  const lines: string[] = [];
  let line = "";
  let w = 0;
  for (let k = 0; k < t.length; k++) {
    const ch = t.charAt(k);
    const cw = charW(ch, fs);
    if (w + cw > maxW + 1e-6 && line) {
      lines.push(line);
      line = "";
      w = 0;
    }
    line += ch;
    w += cw;
  }
  if (line) lines.push(line);
  return lines;
};

// 枠（w × h）に収まる、いちばん大きい文字の大きさを探す。入らなければ最小の大きさ
export const fitBalloon = (t: string, w: number, h: number, court: Court) => {
  const c = balloonMetrics(court);
  let last = { fs: c.max, lines: [] as string[] };
  for (let k = 0; ; k++) {
    const fs = c.max - k * c.step;
    if (fs < c.min - 1e-9) break;
    const lines = wrapText(t, fs, w - fs); // 左右の余白 = fs の半分ずつ
    const need = lines.length * fs * 1.3 + fs * 0.7; // 上下の余白 = fs の 0.35 ずつ
    last = { fs, lines };
    if (need <= h + 1e-6) return last;
  }
  return last;
};

type VBox = { x: number; y: number; w: number; h: number };
const clampN = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);

// 古い形式（しっぽの先の位置 x,y だけ。大きさが無い）を、枠に直す
const legacyBox = (b: { x: number; y: number; t: string }, vb: VBox, court: Court) => {
  const fs = balloonFontSize(court);
  const lines = wrapText(b.t, fs, fs * 11);
  const tw = Math.max(0, ...lines.map((l) => lineW(l, fs)));
  const w = tw + fs * 1.1;
  const h = lines.length * fs * 1.3 + fs * 0.8;
  const tail = fs * 0.95;
  const bx = clampN(b.x - w / 2, vb.x + 0.2, vb.x + vb.w - w - 0.2);
  const above = b.y - tail - h >= vb.y + 0.2;
  return { x: bx, y: above ? b.y - tail - h : b.y + tail, w, h };
};

// 外から来たデータは形と値域を検査してから通す。frames と同じ数にそろえる（足りなければ空）
const parseBalloons = (raw: any, n: number, vb: VBox, court: Court): Balloon[][] => {
  const c = balloonMetrics(court);
  return Array.from({ length: n }, (_, i) => {
    const src: any[] = Array.isArray(raw?.[i]) ? raw[i] : [];
    const out: Balloon[] = [];
    for (const b of src.slice(0, BALLOON_MAX_PER_FRAME)) {
      if (
        typeof b?.x !== "number" || typeof b?.y !== "number" || !Number.isFinite(b.x) || !Number.isFinite(b.y) ||
        typeof b?.t !== "string" || !b.t.trim()
      )
        continue;
      const t = b.t.trim().slice(0, BALLOON_MAX_TEXT);

      if (typeof b.w === "number" && typeof b.h === "number" && Number.isFinite(b.w) && Number.isFinite(b.h) && b.w > 0 && b.h > 0) {
        const w = clampN(b.w, c.minW, vb.w);
        const h = clampN(b.h, c.minH, vb.h);
        out.push({ x: clampN(b.x, vb.x, vb.x + vb.w - w), y: clampN(b.y, vb.y, vb.y + vb.h - h), w, h, t });
      } else {
        const lg = legacyBox(
          { x: clampN(b.x, vb.x, vb.x + vb.w), y: clampN(b.y, vb.y, vb.y + vb.h), t },
          vb,
          court,
        );
        const w = clampN(lg.w, c.minW, vb.w);
        const h = clampN(lg.h, c.minH, vb.h);
        out.push({ x: clampN(lg.x, vb.x, vb.x + vb.w - w), y: clampN(lg.y, vb.y, vb.y + vb.h - h), w, h, t });
      }
    }
    return out;
  });
};

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
    balloons: parseBalloons(raw.balloons, frames.length, vb, court),
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
