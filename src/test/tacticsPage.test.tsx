import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// 「作戦盤を開く」ボタンは、戦術ページを見られる人なら誰にでも出る（主将・幹部でも、一般の部員でも）。
// 動画の「追加」ボタンは、主将・幹部だけ。
const auth = { isStaff: false, memberName: "そうた" };
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => auth }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({ select: () => ({ eq: () => ({ order: () => Promise.resolve({ data: [], error: null }) }) }) }),
  },
}));

import TacticsPage from "@/pages/TacticsPage";

const renderPage = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <TacticsPage />
    </QueryClientProvider>,
  );
};

describe("戦術ページの「作戦盤を開く」ボタン", () => {
  beforeEach(() => cleanup());

  it("一般の部員にも出て、作戦盤のサイトへ別タブで開く", () => {
    auth.isStaff = false;
    renderPage();
    const link = screen.getByRole("link", { name: /作戦盤を開く/ });
    expect(link).toHaveAttribute("href", "https://futsal-board-hazel.vercel.app/");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link.getAttribute("rel")).toContain("noopener");
  });

  it("主将・幹部にも出る", () => {
    auth.isStaff = true;
    renderPage();
    expect(screen.getByRole("link", { name: /作戦盤を開く/ })).toBeInTheDocument();
  });

  it("戦術ボードの見出しは、誰にでも出る", () => {
    auth.isStaff = false;
    renderPage();
    expect(screen.getByRole("heading", { name: "戦術ボード" })).toBeInTheDocument();
  });
});

describe("戦術ページの動画の追加ボタン", () => {
  beforeEach(() => cleanup());

  it("主将・幹部には「動画を追加」が出る", async () => {
    auth.isStaff = true;
    renderPage();
    expect(await screen.findByRole("button", { name: /動画を追加/ })).toBeInTheDocument();
  });

  it("一般の部員には出ない", async () => {
    auth.isStaff = false;
    renderPage();
    await screen.findByRole("heading", { name: "戦術ボード" });
    expect(screen.queryByRole("button", { name: /動画を追加/ })).toBeNull();
  });
});
