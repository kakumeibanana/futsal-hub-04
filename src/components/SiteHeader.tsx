import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const publicLinks = [
  { to: "/", label: "ホーム" },
];

const memberLinks = [
  { to: "/schedule", label: "日程" },
  { to: "/news", label: "お知らせ" },
  { to: "/videos", label: "動画" },
  { to: "/gallery", label: "ギャラリー" },
];

const SiteHeader = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  const linkClass = (to: string) =>
    `px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
      location.pathname === to
        ? "bg-secondary text-secondary-foreground"
        : "text-muted-foreground hover:text-foreground hover:bg-muted"
    }`;

  return (
    <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border">
      <div className="container flex items-center justify-between h-14 sm:h-16">
        <Link to="/" className="flex items-center gap-2 font-display font-bold text-lg sm:text-xl tracking-tight">
          <span className="bg-gradient-primary text-primary-foreground w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center text-xs sm:text-sm font-black">F</span>
          <span className="text-foreground">Futsal<span className="text-gradient-primary">Club</span></span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          {publicLinks.map((link) => (
            <Link key={link.to} to={link.to} className={linkClass(link.to)}>{link.label}</Link>
          ))}
          <span className="mx-1 w-px h-5 bg-border" />
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-semibold mr-1">部員</span>
          {memberLinks.map((link) => (
            <Link key={link.to} to={link.to} className={linkClass(link.to)}>{link.label}</Link>
          ))}
        </nav>

        {/* Mobile toggle */}
        <button
          className="md:hidden p-2 rounded-lg hover:bg-muted transition-colors"
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
            className="md:hidden overflow-hidden border-t border-border bg-background"
          >
            <div className="container py-3 flex flex-col gap-1">
              {publicLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setMobileOpen(false)}
                  className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    location.pathname === link.to
                      ? "bg-secondary text-secondary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              <div className="px-4 pt-2 pb-1">
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-semibold">部員向け</span>
              </div>
              {memberLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setMobileOpen(false)}
                  className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    location.pathname === link.to
                      ? "bg-secondary text-secondary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
};

export default SiteHeader;
