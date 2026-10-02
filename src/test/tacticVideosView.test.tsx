import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import TacticVideos from "@/components/TacticVideos";

describe("TacticVideos（参考動画の表示）", () => {
  it("動画が無いときは、何も出さない", () => {
    const { container } = render(<TacticVideos videos={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("YouTube は、サムネイルを押すと、その場で再生（iframe）になる。最初は iframe を読み込まない", () => {
    const { container } = render(
      <TacticVideos videos={[{ url: "https://youtu.be/dQw4w9WgXcQ", title: "本家のチョンドン" }]} />,
    );
    expect(container.querySelector("iframe")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /本家のチョンドン/ }));
    const frame = container.querySelector("iframe");
    expect(frame).not.toBeNull();
    expect(frame!.getAttribute("src")).toContain("https://www.youtube.com/embed/dQw4w9WgXcQ");
  });

  it("1つの作戦に複数の動画を並べられる。YouTube 以外はリンクで開く（iframe は作らない）", () => {
    const { container } = render(
      <TacticVideos
        videos={[
          { url: "https://youtu.be/dQw4w9WgXcQ", title: "" },
          { url: "https://drive.google.com/file/d/abc/view", title: "試合の動画" },
        ]}
      />,
    );
    expect(screen.getByText("参考動画 1")).toBeInTheDocument();
    expect(screen.getByText("試合の動画")).toBeInTheDocument();
    const link = screen.getByRole("link", { name: /動画を開く/ });
    expect(link).toHaveAttribute("href", "https://drive.google.com/file/d/abc/view");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link.getAttribute("rel")).toContain("noopener");
    expect(container.querySelectorAll("iframe")).toHaveLength(0);
  });
});
