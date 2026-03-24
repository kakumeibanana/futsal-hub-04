import { Link } from "react-router-dom";

const SiteFooter = () => (
  <footer className="border-t border-border bg-muted/50 mt-20">
    <div className="container py-10">
      <div className="flex flex-col md:flex-row justify-between items-start gap-8">
        <div>
          <Link to="/" className="font-display font-bold text-lg tracking-tight">
            <span className="text-foreground">Futsal</span>
            <span className="text-gradient-primary">Club</span>
          </Link>
          <p className="text-muted-foreground text-sm mt-2 max-w-xs">
            〇〇高校フットサル部の公式Webサイトです。
          </p>
        </div>
        <div className="flex gap-10 text-sm">
          <div className="flex flex-col gap-2">
            <span className="font-display font-semibold text-foreground">ページ</span>
            <Link to="/schedule" className="text-muted-foreground hover:text-foreground transition-colors">日程</Link>
            <Link to="/news" className="text-muted-foreground hover:text-foreground transition-colors">お知らせ</Link>
            <Link to="/videos" className="text-muted-foreground hover:text-foreground transition-colors">動画</Link>
          </div>
          <div className="flex flex-col gap-2">
            <span className="font-display font-semibold text-foreground">その他</span>
            <Link to="/about" className="text-muted-foreground hover:text-foreground transition-colors">紹介</Link>
            <Link to="/gallery" className="text-muted-foreground hover:text-foreground transition-colors">ギャラリー</Link>
          </div>
        </div>
      </div>
      <div className="mt-8 pt-6 border-t border-border text-center text-xs text-muted-foreground">
        © 2026 〇〇高校フットサル部. All rights reserved.
      </div>
    </div>
  </footer>
);

export default SiteFooter;
