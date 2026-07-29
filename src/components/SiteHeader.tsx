import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, X, LogIn, LogOut } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

// ✨ ここにロゴ画像をインポートする1行を追加！
import futsalLogo from "@/assets/futsalclubnew.jpg";

const memberLinks = [
  { to: "/schedule", label: "日程" },
  { to: "/adjust", label: "日程調整" },
  { to: "/match-results", label: "試合結果" },
  { to: "/scorers", label: "ランキング" },
  { to: "/members", label: "メンバー" },
  { to: "/news", label: "お知らせ" },
  { to: "/videos", label: "動画" },
  { to: "/gallery", label: "ギャラリー" },
];

const SiteHeader = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { isLoggedIn, memberName, logout } = useAuth();

  const linkClass = (to: string) =>
    `px-2.5 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
      location.pathname === to
        ? "bg-secondary text-secondary-foreground"
        : "text-muted-foreground hover:text-foreground hover:bg-muted"
    }`;

  const handleLogout = async () => {
    await logout();
    setMobileOpen(false);
    navigate("/");
  };

  return (
    <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border">
      <div className="container flex items-center justify-between h-14 sm:h-16">
        <Link to="/" className="flex items-center gap-2 font-display font-bold text-lg sm:text-xl tracking-tight flex-shrink-0 min-w-0">
          <img src={futsalLogo} alt="Futsal Club Logo" className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg object-cover flex-shrink-0" />
          <span className="whitespace-nowrap text-foreground">Tsukuba <span className="text-gradient-primary">Futsal Club</span></span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden xl:flex items-center gap-1 flex-nowrap">
          <Link to="/" className={linkClass("/")}>ホーム</Link>
          {isLoggedIn && (
            <>
              <span className="mx-1 w-px h-5 bg-border" />
              {memberLinks.map((link) => (
                <Link key={link.to} to={link.to} className={linkClass(link.to)}>{link.label}</Link>
              ))}
            </>
          )}
          <span className="mx-1 w-px h-5 bg-border" />
          {isLoggedIn ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{memberName}</span>
              <Button variant="ghost" size="sm" onClick={handleLogout} className="gap-1.5 text-muted-foreground">
                <LogOut size={14} />
                ログアウト
              </Button>
            </div>
          ) : (
            <Link to="/login">
              <Button variant="default" size="sm" className="gap-1.5">
                <LogIn size={14} />
                関係者ログイン
              </Button>
            </Link>
          )}
        </nav>

        {/* Mobile toggle */}
        <button
          className="xl:hidden p-2 rounded-lg hover:bg-muted transition-colors"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="メニュー"
        >
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile nav */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.nav
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="xl:hidden overflow-hidden border-t border-border bg-background"
          >
            <div className="container py-3 flex flex-col gap-1">
              <Link to="/" onClick={() => setMobileOpen(false)} className={linkClass("/")}>
                ホーム
              </Link>

              {isLoggedIn && (
                <>
                  <div className="px-3 pt-3 pb-1">
                    <span className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-semibold">部員向け</span>
                  </div>
                  {memberLinks.map((link) => (
                    <Link
                      key={link.to}
                      to={link.to}
                      onClick={() => setMobileOpen(false)}
                      className={linkClass(link.to)}
                    >
                      {link.label}
                    </Link>
                  ))}
                </>
              )}

              <div className="border-t border-border mt-2 pt-2">
                {isLoggedIn ? (
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
                  >
                    <LogOut size={14} />
                    ログアウト（{memberName}）
                  </button>
                ) : (
                  <Link
                    to="/login"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium bg-primary text-primary-foreground"
                  >
                    <LogIn size={14} />
                    関係者ログイン
                  </Link>
                )}
              </div>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
};

export default SiteHeader;
