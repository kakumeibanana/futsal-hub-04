import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

// 「作戦盤を開く」ボタンは、戦術ページを見られる人なら誰にでも出る（主将・幹部でも、一般の部員でも）
const auth = { isStaff: false };
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => auth }));

import TacticsPage from "@/pages/TacticsPage";

describe("戦術ページの「作戦盤を開く」ボタン", () => {
  beforeEach(() => cleanup());

  it("一般の部員にも出て、作戦盤のサイトへ別タブで開く", () => {
    auth.isStaff = false;
    render(<TacticsPage />);
    const link = screen.getByRole("link", { name: /作戦盤を開く/ });
    expect(link).toHaveAttribute("href", "https://futsal-board-hazel.vercel.app/");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link.getAttribute("rel")).toContain("noopener");
  });

  it("主将・幹部にも出る", () => {
    auth.isStaff = true;
    render(<TacticsPage />);
    expect(screen.getByRole("link", { name: /作戦盤を開く/ })).toBeInTheDocument();
  });

  it("戦術ボードの見出しは、誰にでも出る", () => {
    auth.isStaff = false;
    render(<TacticsPage />);
    expect(screen.getByRole("heading", { name: "戦術ボード" })).toBeInTheDocument();
  });
});
