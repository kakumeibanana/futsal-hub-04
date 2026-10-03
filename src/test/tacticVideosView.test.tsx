import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// サイトの動画の追加・削除は、主将・幹部（isStaff）だけ。保存先は supabase（ここでは、ニセモノに差し替える）
const STORAGE = "https://x.supabase.co/storage/v1/object/public/videos/";

const db = {
  rows: [] as any[],
  inserts: [] as any[],
  deletes: [] as string[],
  uploads: [] as string[],
  removes: [] as string[],
  insertError: false,
  existing: [] as any[], // 付ける先の作戦に、すでに付いている動画（tactic_id と url）
  others: [] as any[], // 同じファイルを使っている、ほかの行
};

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: (col: string) => {
          const res = { data: col === "storage_path" ? db.others : col === "url" ? [] : db.rows, error: null };
          return Object.assign(Promise.resolve(res), { order: () => Promise.resolve(res), limit: () => Promise.resolve(res) });
        },
        in: () => Promise.resolve({ data: db.existing, error: null }),
      }),
      insert: (v: any) => {
        if (Array.isArray(v)) db.inserts.push(...v);
        else db.inserts.push(v);
        return Promise.resolve({ error: db.insertError ? { message: "ng" } : null });
      },
      delete: () => ({
        eq: (_c: string, id: string) => {
          db.deletes.push(id);
          return Promise.resolve({ error: null });
        },
      }),
    }),
    storage: {
      from: () => ({
        upload: (path: string) => {
          db.uploads.push(path);
          return Promise.resolve({ error: null });
        },
        getPublicUrl: (p: string) => ({ data: { publicUrl: STORAGE + p } }),
        remove: (arr: string[]) => {
          db.removes.push(...arr);
          return Promise.resolve({});
        },
      }),
    },
  },
}));

import TacticVideos from "@/components/TacticVideos";

const row = (o: Partial<any> = {}) => ({
  id: "r1",
  tactic_id: "コーナー/右コーナー(テスト)",
  title: "",
  type: "link",
  url: "https://example.com/v",
  storage_path: null,
  created_by: "",
  ...o,
});

const renderIt = (props: Partial<React.ComponentProps<typeof TacticVideos>> = {}) => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <TacticVideos tacticId="コーナー/右コーナー(テスト)" fileVideos={[]} isStaff={false} memberName="そうた" {...props} />
    </QueryClientProvider>,
  );
};

beforeEach(() => {
  vi.stubEnv("VITE_SUPABASE_URL", "https://x.supabase.co");
  Object.assign(db, { rows: [], inserts: [], deletes: [], uploads: [], removes: [], insertError: false, existing: [], others: [] });
});
afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

const openDialog = async () => {
  fireEvent.click(screen.getByRole("button", { name: /動画を追加/ }));
  return await screen.findByRole("dialog");
};

describe("表示", () => {
  it("動画が無く、追加もできない人には、何も出さない", async () => {
    const { container } = renderIt({ isStaff: false });
    await waitFor(() => expect(container).toBeEmptyDOMElement());
  });

  it("サイトで追加した動画も、作戦のJSONの動画も、一緒に並ぶ（一般の部員にも見える。追加・外すボタンは出ない）", async () => {
    db.rows = [row({ id: "a", title: "ドライブの試合", type: "link", url: "https://example.com/a" })];
    renderIt({ fileVideos: [{ url: "https://example.com/json", title: "JSONの動画" }] });
    expect(await screen.findByText("ドライブの試合")).toBeInTheDocument();
    expect(screen.getByText("JSONの動画")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /動画を追加/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /を外す/ })).toBeNull();
  });

  it("YouTube は押すとその場で再生、ドライブも同じ、サイトにアップした動画は<video>、ほかはリンクだけ", async () => {
    db.rows = [
      row({ id: "y", title: "YT", type: "youtube", url: "https://youtu.be/dQw4w9WgXcQ" }),
      row({ id: "d", title: "DR", type: "drive", url: "https://drive.google.com/file/d/abc123/view" }),
      row({ id: "u", title: "UP", type: "upload", url: STORAGE + "tactics/1-a.mp4", storage_path: "tactics/1-a.mp4" }),
      row({ id: "l", title: "LK", type: "link", url: "https://example.com/page" }),
      row({ id: "x", title: "FAKE", type: "upload", url: "https://evil.example/x.mp4" }), // 自分たちのストレージ以外は<video>にしない
    ];
    const { container } = renderIt();
    await screen.findByText("YT");

    expect(container.querySelectorAll("iframe")).toHaveLength(0); // 最初は何も読み込まない
    expect(container.querySelectorAll("video")).toHaveLength(1);
    expect(container.querySelector("video")!.getAttribute("src")).toBe(STORAGE + "tactics/1-a.mp4");

    fireEvent.click(screen.getByRole("button", { name: /YT を再生/ }));
    expect(container.querySelector("iframe")!.getAttribute("src")).toContain("https://www.youtube.com/embed/dQw4w9WgXcQ");

    fireEvent.click(screen.getByRole("button", { name: /DR を再生/ }));
    const srcs = [...container.querySelectorAll("iframe")].map((f) => f.getAttribute("src"));
    expect(srcs).toContain("https://drive.google.com/file/d/abc123/preview");

    // リンクだけの2つ（LK と、自分たちのストレージではない FAKE）は、動画としては再生しない
    expect(container.querySelectorAll("video")).toHaveLength(1);
    for (const name of ["LK", "FAKE"]) {
      expect(screen.queryByRole("button", { name: new RegExp(`${name} を再生`) })).toBeNull();
    }
  });
});

describe("追加（主将・幹部）", () => {
  it("動画が無くても、追加ボタンが出る", async () => {
    renderIt({ isStaff: true });
    expect(await screen.findByText(/まだ動画がありません/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /動画を追加/ })).toBeInTheDocument();
  });

  it("リンクを追加すると、種類（YouTube/ドライブ/そのほか）を判定して保存する", async () => {
    renderIt({ isStaff: true });
    await openDialog();
    fireEvent.change(document.querySelector("#tv-url")!, { target: { value: "https://youtu.be/dQw4w9WgXcQ" } });
    fireEvent.change(document.querySelector("#tv-title")!, { target: { value: "本家" } });
    fireEvent.click(screen.getByRole("button", { name: "追加する" }));
    await waitFor(() => expect(db.inserts).toHaveLength(1));
    expect(db.inserts[0]).toMatchObject({
      tactic_id: "コーナー/右コーナー(テスト)",
      title: "本家",
      type: "youtube",
      url: "https://youtu.be/dQw4w9WgXcQ",
      created_by: "そうた",
    });
  });

  it("危険なURL（javascript: など）は、保存せずに、エラーを出す", async () => {
    renderIt({ isStaff: true });
    await openDialog();
    fireEvent.change(document.querySelector("#tv-url")!, { target: { value: "javascript:alert(1)" } });
    fireEvent.click(screen.getByRole("button", { name: "追加する" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/http/);
    expect(db.inserts).toHaveLength(0);
  });

  it("PCの動画ファイルをアップロードして付ける（保存名は日本語を使わない。元の名前はタイトルになる）", async () => {
    renderIt({ isStaff: true });
    await openDialog();
    fireEvent.mouseDown(screen.getByRole("tab", { name: "PCのファイル" }), { button: 0 });
    const file = new File(["x"], "本家のチョンドン.mp4", { type: "video/mp4" });
    fireEvent.change(document.querySelector("#tv-file")!, { target: { files: [file] } });
    expect((document.querySelector("#tv-title") as HTMLInputElement).value).toBe("本家のチョンドン");
    fireEvent.click(screen.getByRole("button", { name: "追加する" }));
    await waitFor(() => expect(db.inserts).toHaveLength(1));
    expect(db.uploads[0]).toMatch(/^tactics\/\d+-[a-z0-9]+\.mp4$/);
    expect(db.inserts[0]).toMatchObject({ type: "upload", title: "本家のチョンドン", storage_path: db.uploads[0] });
    expect(db.inserts[0].url).toBe(STORAGE + db.uploads[0]);
  });

  it("動画ファイルでないものは、選んだ時点で、はじく", async () => {
    renderIt({ isStaff: true });
    await openDialog();
    fireEvent.mouseDown(screen.getByRole("tab", { name: "PCのファイル" }), { button: 0 });
    fireEvent.change(document.querySelector("#tv-file")!, { target: { files: [new File(["x"], "memo.txt", { type: "text/plain" })] } });
    expect(await screen.findByRole("alert")).toHaveTextContent(/動画ファイル/);
    fireEvent.click(screen.getByRole("button", { name: "追加する" }));
    expect(db.uploads).toHaveLength(0);
  });

  it("アップロードしたあと、表に保存できなかったら、上げたファイルを消して残さない", async () => {
    db.insertError = true;
    renderIt({ isStaff: true });
    await openDialog();
    fireEvent.mouseDown(screen.getByRole("tab", { name: "PCのファイル" }), { button: 0 });
    fireEvent.change(document.querySelector("#tv-file")!, { target: { files: [new File(["x"], "a.mov", { type: "video/quicktime" })] } });
    fireEvent.click(screen.getByRole("button", { name: "追加する" }));
    await waitFor(() => expect(db.removes).toHaveLength(1));
    expect(db.removes[0]).toBe(db.uploads[0]);
    expect(await screen.findByRole("alert")).toHaveTextContent(/保存できませんでした/);
  });

  it("上限（10本）に達していたら、追加させない", async () => {
    db.rows = Array.from({ length: 10 }, (_, i) => row({ id: `r${i}`, url: `https://example.com/${i}`, title: `T${i}` }));
    renderIt({ isStaff: true });
    await screen.findByText("T0");
    await openDialog();
    fireEvent.change(document.querySelector("#tv-url")!, { target: { value: "https://example.com/new" } });
    fireEvent.click(screen.getByRole("button", { name: "追加する" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/10 本まで/);
    expect(db.inserts).toHaveLength(0);
  });
});

describe("外す（主将・幹部）", () => {
  it("確認してから、表から外す。アップロードした動画は、ストレージのファイルも消す", async () => {
    db.rows = [row({ id: "u", title: "UP", type: "upload", url: STORAGE + "tactics/9-z.mp4", storage_path: "tactics/9-z.mp4" })];
    vi.spyOn(window, "confirm").mockReturnValue(true);
    renderIt({ isStaff: true });
    fireEvent.click(await screen.findByRole("button", { name: /UP を外す/ }));
    await waitFor(() => expect(db.deletes).toEqual(["u"]));
    expect(db.removes).toEqual(["tactics/9-z.mp4"]);
  });

  it("確認で「いいえ」なら、何もしない。リンクの動画は、ファイルを消さない", async () => {
    db.rows = [row({ id: "l", title: "LK", type: "link" })];
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    renderIt({ isStaff: true });
    fireEvent.click(await screen.findByRole("button", { name: /LK を外す/ }));
    expect(confirm).toHaveBeenCalled();
    expect(db.deletes).toHaveLength(0);

    confirm.mockReturnValue(true);
    fireEvent.click(screen.getByRole("button", { name: /LK を外す/ }));
    await waitFor(() => expect(db.deletes).toEqual(["l"]));
    expect(db.removes).toHaveLength(0);
  });

  it("作戦のJSONに入っている動画は、サイトからは外せない（外すボタンが出ない）", async () => {
    renderIt({ isStaff: true, fileVideos: [{ url: "https://example.com/json", title: "JSONの動画" }] });
    expect(await screen.findByText("JSONの動画")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /JSONの動画 を外す/ })).toBeNull();
  });
});
describe("ほかの作戦にも付ける（主将・幹部）", () => {
  const openPicker = () => fireEvent.click(screen.getByRole("button", { name: /ほかの作戦にも付ける/ }));

  it("追加するとき、「ホシナ」で絞って「表示中をすべて選ぶ」→ 選んだ作戦ぜんぶに、同じ動画を付ける（いま見ている作戦も含む）", async () => {
    renderIt({ isStaff: true });
    await openDialog();
    fireEvent.change(document.querySelector("#tv-url")!, { target: { value: "https://youtu.be/dQw4w9WgXcQ" } });
    openPicker();
    fireEvent.change(screen.getByLabelText("作戦をさがす"), { target: { value: "ホシナ" } });
    fireEvent.click(screen.getByRole("button", { name: "表示中をすべて選ぶ" }));
    const n = screen.getAllByRole("checkbox").length;
    expect(n).toBeGreaterThan(1);
    expect(screen.getByText(`${n} 個の作戦を選んでいます`)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "追加する" }));
    await waitFor(() => expect(db.inserts).toHaveLength(n + 1));
    const ids = db.inserts.map((r) => r.tactic_id);
    expect(ids[0]).toBe("コーナー/右コーナー(テスト)");
    expect(new Set(ids).size).toBe(n + 1); // 重ならない
    expect(ids.slice(1).every((id: string) => id.includes("ホシナ"))).toBe(true);
    expect(new Set(db.inserts.map((r) => r.url)).size).toBe(1); // 同じ動画
  });

  it("PCのファイルは1回だけアップロードして、全部の作戦が同じファイルを指す", async () => {
    renderIt({ isStaff: true });
    await openDialog();
    fireEvent.mouseDown(screen.getByRole("tab", { name: "PCのファイル" }), { button: 0 });
    fireEvent.change(document.querySelector("#tv-file")!, { target: { files: [new File(["x"], "ホシナ解説.mp4", { type: "video/mp4" })] } });
    openPicker();
    fireEvent.change(screen.getByLabelText("作戦をさがす"), { target: { value: "ホシナ" } });
    fireEvent.click(screen.getByRole("button", { name: "表示中をすべて選ぶ" }));
    fireEvent.click(screen.getByRole("button", { name: "追加する" }));
    await waitFor(() => expect(db.inserts.length).toBeGreaterThan(1));
    expect(db.uploads).toHaveLength(1);
    expect(new Set(db.inserts.map((r) => r.storage_path))).toEqual(new Set([db.uploads[0]]));
    expect(db.removes).toHaveLength(0);
  });

  it("すでに付いている作戦・動画がいっぱい（10本）の作戦は、飛ばして、ほかには付ける", async () => {
    renderIt({ isStaff: true });
    await openDialog();
    fireEvent.change(document.querySelector("#tv-url")!, { target: { value: "https://example.com/v" } });
    openPicker();
    fireEvent.change(screen.getByLabelText("作戦をさがす"), { target: { value: "ホシナ" } });
    const boxes = screen.getAllByRole("checkbox");
    expect(boxes.length).toBeGreaterThan(2);
    fireEvent.click(screen.getByRole("button", { name: "表示中をすべて選ぶ" }));
    // 付ける先の最初の作戦は「もう付いている」、2つ目は「いっぱい」にする
    const picked = screen.getAllByRole("checkbox");
    const labels = picked.map((b) => b.closest("label")!.textContent);
    expect(labels.length).toBe(boxes.length);
    // 先にDBの状態を作ってから送る（実際のIDは、送る前に tactics から引く）
    const { tactics } = await import("@/lib/tactics");
    const targets = tactics.filter((t) => t.id.includes("ホシナ") && t.id !== "コーナー/右コーナー(テスト)");
    db.existing = [
      { tactic_id: targets[0].id, url: "https://example.com/v" },
      ...Array.from({ length: 10 }, (_, i) => ({ tactic_id: targets[1].id, url: `https://example.com/o${i}` })),
    ];
    fireEvent.click(screen.getByRole("button", { name: "追加する" }));
    await waitFor(() => expect(db.inserts.length).toBeGreaterThan(0));
    const ids = db.inserts.map((r) => r.tactic_id);
    expect(ids).not.toContain(targets[0].id);
    expect(ids).not.toContain(targets[1].id);
    expect(ids).toHaveLength(1 + targets.length - 2);
  });

  it("カードの「ほかの作戦にも付ける」から、すでにある動画を、あとで付け足せる（ファイルは増えない）", async () => {
    db.rows = [row({ id: "u", title: "UP", type: "upload", url: STORAGE + "tactics/5-q.mp4", storage_path: "tactics/5-q.mp4" })];
    renderIt({ isStaff: true });
    fireEvent.click(await screen.findByRole("button", { name: /UP をほかの作戦にも付ける/ }));
    const dlg = await screen.findByRole("dialog");
    const input = dlg.querySelector("input[aria-label='作戦をさがす']")!;
    fireEvent.change(input, { target: { value: "ホシナ" } });
    fireEvent.click(screen.getByRole("button", { name: "表示中をすべて選ぶ" }));
    const n = screen.getAllByRole("checkbox").length;
    fireEvent.click(screen.getByRole("button", { name: `${n} 個の作戦に付ける` }));
    await waitFor(() => expect(db.inserts).toHaveLength(n));
    expect(db.uploads).toHaveLength(0);
    expect(db.inserts.every((r) => r.storage_path === "tactics/5-q.mp4" && r.type === "upload" && r.title === "UP")).toBe(true);
  });

  it("一般の部員には「ほかの作戦にも付ける」は出ない", async () => {
    db.rows = [row({ id: "l", title: "LK", type: "link" })];
    renderIt({ isStaff: false });
    await screen.findByText("LK");
    expect(screen.queryByRole("button", { name: /ほかの作戦にも付ける/ })).toBeNull();
  });
});

describe("外す：共有している動画のファイル", () => {
  it("ほかの作戦も同じファイルを使っているあいだは、ストレージのファイルを消さない", async () => {
    db.rows = [row({ id: "u", title: "UP", type: "upload", url: STORAGE + "tactics/9-z.mp4", storage_path: "tactics/9-z.mp4" })];
    db.others = [{ id: "other" }];
    vi.spyOn(window, "confirm").mockReturnValue(true);
    renderIt({ isStaff: true });
    fireEvent.click(await screen.findByRole("button", { name: /UP を外す/ }));
    await waitFor(() => expect(db.deletes).toEqual(["u"]));
    expect(db.removes).toHaveLength(0);
  });
});
