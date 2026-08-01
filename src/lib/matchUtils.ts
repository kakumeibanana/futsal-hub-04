// 相手のオウンゴールは得点者名としてこの固定値で保存する
export const OWN_GOAL_NAME = "オウンゴール";

// スコア入力の正規化: 数字以外を除去し、"01" のような先頭ゼロを解消する。
// 空文字は許容し（全消しできるように）、保存時に0として扱う。
export function normalizeScore(v: string): string {
  const digits = v.replace(/[^0-9]/g, "");
  if (digits === "") return "";
  return String(Number(digits));
}
