import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

// 「作戦盤を開く」ボタンは、3役（主将・幹部＝isStaff）にだけ出す
const auth = { isStaff: false };
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => auth }));

import TacticsPage from "@/pages/TacticsPage";

describe("戦術ページの「作戦盤を開く」ボタン", () => {
  beforeEach(() => cleanup());

  it("3役（isStaff）には出て、作戦盤のサイトへ別タブで開く", () => {
    auth.isStaff = true;
    render(<TacticsPage />);
    const link = screen.getByRole("link", { name: /作戦盤を開く/ });
    expect(link).toHaveAttribute("href", "https://futsal-board-hazel.vercel.app/");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link.getAttribute("rel")).toContain("noopener");
  });

  it("一般の部員には出ない", () => {
    auth.isStaff = false;
    render(<TacticsPage />);
    expect(screen.queryByText(/作戦盤を開く/)).toBeNull();
  });

  it("戦術ボードの見出しは、誰にでも出る", () => {
    auth.isStaff = false;
    render(<TacticsPage />);
    expect(screen.getByRole("heading", { name: "戦術ボード" })).toBeInTheDocument();
  });
});
