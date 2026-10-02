import { describe, it, expect } from "vitest";
import { parseTactic, parseVideos, youtubeId, VIDEO_MAX } from "@/lib/tactics";

const frame = (n = 11) => Array.from({ length: n }, (_, i) => [i, i]);

describe("youtubeId", () => {
  it("いろいろな形の YouTube URL から、動画IDを取り出す", () => {
    const id = "dQw4w9WgXcQ";
    expect(youtubeId(`https://www.youtube.com/watch?v=${id}`)).toBe(id);
    expect(youtubeId(`https://youtube.com/watch?feature=share&v=${id}`)).toBe(id);
    expect(youtubeId(`https://youtu.be/${id}?t=10`)).toBe(id);
    expect(youtubeId(`https://www.youtube.com/shorts/${id}`)).toBe(id);
    expect(youtubeId(`https://www.youtube.com/embed/${id}`)).toBe(id);
    expect(youtubeId(`https://www.youtube.com/live/${id}`)).toBe(id);
  });

  it("YouTube 以外は null（ドライブなどはリンクとして扱う）", () => {
    expect(youtubeId("https://drive.google.com/file/d/abc/view")).toBeNull();
    expect(youtubeId("https://example.com/watch?v=dQw4w9WgXcQ")).toBeNull();
  });
});

describe("parseVideos", () => {
  it("http・https の URL だけ通し、javascript: などは捨てる", () => {
    const out = parseVideos([
      { url: "https://youtu.be/dQw4w9WgXcQ", title: "  本家  " },
      { url: "javascript:alert(1)" },
      { url: "ftp://example.com/a.mp4" },
      { url: "data:text/html,<script>1</script>" },
      { url: 123 },
      null,
      "https://example.com",
    ]);
    expect(out).toEqual([{ url: "https://youtu.be/dQw4w9WgXcQ", title: "本家" }]);
  });

  it("タイトルが無ければ空、多すぎるぶんは捨てる、配列でなければ空", () => {
    const many = Array.from({ length: 10 }, (_, i) => ({ url: `https://example.com/${i}` }));
    const out = parseVideos(many);
    expect(out).toHaveLength(VIDEO_MAX);
    expect(out[0].title).toBe("");
    expect(parseVideos(undefined)).toEqual([]);
    expect(parseVideos({ url: "https://example.com" })).toEqual([]);
  });
});

describe("parseTactic の videos", () => {
  const base = { court: "half", roster: { a: 5, b: 5 }, frames: [frame(), frame()] };

  it("videos が無い（古い形式の）作戦も読めて、動画は空になる", () => {
    const t = parseTactic("x", { ...base, name: "右コーナー(テスト)" });
    expect(t?.videos).toEqual([]);
  });

  it("videos がある作戦は、複数の動画を持つ", () => {
    const t = parseTactic("x", {
      ...base,
      name: "右キックイン(チョンドン)",
      videos: [{ url: "https://youtu.be/dQw4w9WgXcQ", title: "本家" }, { url: "https://example.com/v" }],
    });
    expect(t?.videos).toHaveLength(2);
    expect(t?.videos[1]).toEqual({ url: "https://example.com/v", title: "" });
  });
});
