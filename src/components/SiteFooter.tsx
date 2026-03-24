import { Link } from "react-router-dom";

const SiteFooter = () => (
  <footer className="border-t border-border bg-muted/50 mt-16 sm:mt-20">
    <div className="container py-8 sm:py-10">
      <div className="flex flex-col sm:flex-row justify-between items-start gap-6 sm:gap-8">
        <div>
          <Link to="/" className="font-display font-bold text-lg tracking-tight">
            <span className="text-foreground">Futsal</span>
            <span className="text-gradient-primary">Club</span>
          </Link>
          <p className="text-muted-foreground text-xs sm:text-sm mt-2 max-w-xs">
            〇〇高校フットサル部の公式Webサイトです。
          </p>
        </div>
        <div className="flex gap-8 sm:gap-10 text-sm">
          <div className="flex flex-col gap-2">
            <span className="font-display font-semibold text-foreground text-xs sm:text-sm">部員向け</span>
            <Link to="/schedule" className="text-muted-foreground hover:text-foreground transition-colors text-xs sm:text-sm">日程</Link>
            <Link to="/news" className="text-muted-foreground hover:text-foreground transition-colors text-xs sm:text-sm">お知らせ</Link>
            <Link to="/videos" className="text-muted-foreground hover:text-foreground transition-colors text-xs sm:text-sm">動画</Link>
            <Link to="/gallery" className="text-muted-foreground hover:text-foreground transition-colors text-xs sm:text-sm">ギャラリー</Link>
          </div>
        </div>
      </div>
      <div className="mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-border text-center text-xs text-muted-foreground">
        © 2026 〇〇高校フットサル部. All rights reserved.
      </div>
    </div>
  </footer>
);

export default SiteFooter;
