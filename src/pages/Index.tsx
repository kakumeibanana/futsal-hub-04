import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { CalendarDays, ArrowRight, Bell, Users, Trophy, Target, Heart, X, Clock, MapPin, Info, Briefcase, Swords } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import ScheduleCard from "@/components/ScheduleCard";
import { useNewsList } from "@/hooks/useNews";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import heroImage from "@/assets/hero-futsal.jpg";
import gasshukuImg from "@/assets/20260430_075513753_iOS.jpg";

const categoryColor: Record<string, string> = {
  重要: "bg-red-100 text-red-700",
  試合結果: "bg-blue-100 text-blue-700",
  連絡: "bg-yellow-100 text-yellow-700",
  その他: "bg-secondary text-secondary-foreground",
};

type EventType = "match" | "practice" | "event";
interface HomeEvent {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  type: EventType;
  detail: string;
  belongings: string;
}

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.5 } }),
};

const statsBase = [
  { icon: Trophy, label: "創部", value: "1996年" },
  { icon: Target, label: "活動日", value: "火、木、金、土" },
  { icon: Heart, label: "モットー", value: "楽しく勝つ" },
];

const SectionHeader = ({ icon: Icon, title, linkTo, linkLabel }: { icon: any; title: string; linkTo?: string; linkLabel?: string }) => (
  <div className="flex items-center justify-between mb-6">
    <h2 className="flex items-center gap-2 font-display font-bold text-lg sm:text-xl text-foreground">
      <Icon size={20} className="text-primary" />
      {title}
    </h2>
    {linkTo && linkLabel && (
      <Link to={linkTo} className="text-sm font-medium text-primary hover:underline inline-flex items-center gap-1">
        {linkLabel}<ArrowRight size={14} />
      </Link>
    )}
  </div>
);

const Index = () => {
  const { data: allNews = [], isLoading: newsLoading } = useNewsList();
  const publicNews = allNews.filter((n) => n.visibility === "public");

  const [todayEvents, setTodayEvents] = useState<HomeEvent[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<HomeEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<HomeEvent | null>(null);
  const [memberCount, setMemberCount] = useState<number | null>(null);
  const [recentMatches, setRecentMatches] = useState<{ id: string; title: string | null; opponent: string; match_date: string; score_us: number; score_them: number }[]>([]);
  const [matchesLoading, setMatchesLoading] = useState(true);

  useEffect(() => {
    const d = new Date();
    const todayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    const mapRows = (rows: any[]): HomeEvent[] =>
      rows.map((row) => {
        let time = "終日";
        if (!row.is_all_day && row.start_time) {
          const start = (row.start_time as string).slice(0, 5);
          const end = row.end_time ? (row.end_time as string).slice(0, 5) : "";
          time = end ? `${start} - ${end}` : `${start}~`;
        }
        return { id: row.id, title: row.title, date: row.date, time, location: row.location, type: row.type as EventType, detail: row.detail ?? "", belongings: row.belongings ?? "" };
      });

    const fetchAll = async () => {
      const [{ data: todayData }, { data: upcomingData }, { count }, { data: matchData }] = await Promise.all([
        supabase
          .from("schedule_events")
          .select("id, title, date, start_time, end_time, is_all_day, location, type, detail, belongings")
          .eq("date", todayStr)
          .order("date", { ascending: true }),
        supabase
          .from("schedule_events")
          .select("id, title, date, start_time, end_time, is_all_day, location, type, detail, belongings")
          .gt("date", todayStr)
          .order("date", { ascending: true }),
        supabase
          .from("members")
          .select("*", { count: "exact", head: true })
          .eq("hidden", false)
          .in("grade", ["1", "2"]),
        supabase
          .from("match_results")
          .select("id, title, opponent, match_date, score_us, score_them")
          .order("match_date", { ascending: false })
          .limit(3),
      ]);
      setTodayEvents(mapRows(todayData ?? []));
      setUpcomingEvents(mapRows(upcomingData ?? []));
      if (count !== null) setMemberCount(count);
      setRecentMatches(matchData ?? []);
      setEventsLoading(false);
      setMatchesLoading(false);
    };

    fetchAll();
  }, []);

  const stats = [
    { icon: Users, label: "部員数", value: memberCount !== null ? `${memberCount}名` : "---" },
    ...statsBase,
  ];

  return (
  <div>
    {/* Hero */}
    <section className="relative h-[85vh] min-h-[520px] max-h-[800px] overflow-hidden">
      <img src={heroImage} alt="フットサル部" className="absolute inset-0 w-full h-full object-cover" width={1920} height={1080} />
      <div className="absolute inset-0 bg-gradient-hero" />
      <div className="absolute top-1/4 right-[10%] w-64 h-64 rounded-full bg-primary/10 blur-[100px] hidden md:block" />
      <div className="absolute bottom-1/3 left-[5%] w-48 h-48 rounded-full bg-accent/10 blur-[80px] hidden md:block" />
      <div className="relative container h-full flex flex-col justify-center">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-2xl"
        >
          <h1 className="font-display font-black text-4xl sm:text-6xl md:text-7xl lg:text-8xl text-primary-foreground leading-[0.95] tracking-tight">
            TSUKUBA FUTSAL CLUB
            <br />
            <span className="text-gradient-hero-accent">136 - 137</span>
          </h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            className="mt-6 text-primary-foreground/60 max-w-md text-sm sm:text-base leading-relaxed"
          >
            楽しみながら勝ちを目指す、
            <br />
            フットサル部へようこそ。
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.5 }}
            className="mt-8 flex flex-wrap gap-3"
          >
            <Button asChild size="lg" className="bg-gradient-primary shadow-primary hover:opacity-90 transition-opacity text-sm sm:text-base px-6 sm:px-8">
              <a href="#news">お知らせ</a>
            </Button>
            <Button asChild variant="outline" size="lg" className="font-bold border-primary-foreground/20 text-[hsl(270,60%,52%)] hover:bg-primary-foreground/10 backdrop-blur-sm text-sm sm:text-base px-6 sm:px-8">
              <a href="#about">部活紹介</a>
            </Button>
          </motion.div>
        </motion.div>
      </div>
      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-background to-transparent" />
    </section>

    {/* Today's schedule */}
    <section className="container mt-8 sm:mt-12">
      <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} className="bg-purple-subtle rounded-2xl p-4 sm:p-6 md:p-8 border border-border">
        <div className="flex items-center gap-2 mb-4">
          <CalendarDays size={20} className="text-primary" />
          <h2 className="font-display font-bold text-lg sm:text-xl text-foreground">今日の予定</h2>
          <span className="ml-auto text-xs sm:text-sm text-muted-foreground font-medium">
            {new Date().toLocaleDateString("ja-JP", { month: "long", day: "numeric", weekday: "short" })}
          </span>
        </div>
        {eventsLoading ? (
          <Skeleton className="h-14 rounded-xl" />
        ) : todayEvents.length > 0 ? (
          <div className="space-y-3">
            {todayEvents.map((event, i) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08, duration: 0.4 }}
                onClick={() => setSelectedEvent(event)}
                className="cursor-pointer"
              >
                <ScheduleCard event={event} />
              </motion.div>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-sm py-4 text-center">今日の予定はありません</p>
        )}
      </motion.div>
    </section>

    {/* Upcoming */}
    <section className="container mt-12 sm:mt-16">
      <SectionHeader icon={CalendarDays} title="直近の予定" linkTo="/schedule" linkLabel="日程ページへ" />
      <div className="space-y-3">
        {eventsLoading ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)
        ) : upcomingEvents.length > 0 ? (
          upcomingEvents.slice(0, 5).map((event, i) => (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08, duration: 0.4 }}
              onClick={() => setSelectedEvent(event)}
              className="cursor-pointer"
            >
              <ScheduleCard event={event} />
            </motion.div>
          ))
        ) : (
          <p className="text-muted-foreground text-sm py-4 text-center border border-dashed rounded-xl border-border">直近の予定はありません</p>
        )}
        {upcomingEvents.length > 5 && (
          <Link to="/schedule" className="block text-center text-sm font-medium text-primary hover:underline pt-1 inline-flex items-center gap-1 justify-center w-full">
            他{upcomingEvents.length - 5}件を見る <ArrowRight size={14} />
          </Link>
        )}
      </div>
    </section>

    {/* Recent match results */}
    <section className="container mt-12 sm:mt-16">
      <SectionHeader icon={Swords} title="直近の試合結果" linkTo="/match-results" linkLabel="すべて見る" />
      <div className="space-y-3">
        {matchesLoading ? (
          Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)
        ) : recentMatches.length === 0 ? (
          <p className="text-muted-foreground text-sm py-4 text-center border border-dashed rounded-xl border-border">試合結果はまだありません</p>
        ) : (
          recentMatches.map((match, i) => {
            const result = match.score_us > match.score_them ? "win" : match.score_us < match.score_them ? "loss" : "draw";
            const resultLabel = result === "win" ? "勝利" : result === "loss" ? "敗北" : "引き分け";
            const resultColor = result === "win" ? "bg-green-100 text-green-700" : result === "loss" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700";
            return (
              <motion.div key={match.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08, duration: 0.4 }}>
                <Link to="/match-results" className="group flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl border border-border bg-card hover:shadow-primary transition-all duration-300">
                  <span className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-bold ${resultColor}`}>{resultLabel}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                      {match.title || `vs ${match.opponent}`}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">{match.opponent} 戦・{match.match_date.replace(/-/g, "/")}</p>
                  </div>
                  <div className="shrink-0 font-display font-black text-lg sm:text-xl text-foreground tabular-nums">
                    {match.score_us} <span className="text-muted-foreground font-normal text-sm">-</span> {match.score_them}
                  </div>
                </Link>
              </motion.div>
            );
          })
        )}
      </div>
    </section>

    {/* News */}
    <section id="news" className="container mt-12 sm:mt-16 scroll-mt-20">
      <SectionHeader icon={Bell} title="お知らせ" linkTo="/news" linkLabel="すべて見る" />
      <div className="space-y-3">
        {newsLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))
        ) : (
          publicNews.slice(0, 3).map((item, i) => (
            <motion.div key={item.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08, duration: 0.4 }}>
              <Link to={`/news/${item.id}`} className="group block p-3 sm:p-4 rounded-xl border border-border bg-card hover:shadow-primary transition-all duration-300">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${categoryColor[item.category] ?? categoryColor["その他"]}`}>
                    {item.category}
                  </span>
                  {item.visibility === "member" && (
                    <span className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary">部員限定</span>
                  )}
                  <span className="text-xs text-muted-foreground ml-auto">{item.date.replace("2026-", "").replace("-", "/")}</span>
                </div>
                <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2">{item.title}</p>
              </Link>
            </motion.div>
          ))
        )}
      </div>
    </section>

    {/* About section */}
    <section id="about" className="container mt-16 sm:mt-24 scroll-mt-20">
      <SectionHeader icon={Users} title="部活紹介" />
      <div className="grid md:grid-cols-2 gap-6 md:gap-10 items-center mb-10">
        <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}>
          <img src={gasshukuImg} alt="合宿写真" className="rounded-2xl w-full aspect-[4/3] object-cover shadow-primary" />
        </motion.div>
        <motion.div initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.15 }}>
          <h3 className="font-display font-bold text-xl sm:text-2xl text-foreground mb-4">筑波大学附属高等学校フットサル部</h3>
          <p className="text-muted-foreground text-sm sm:text-base leading-relaxed mb-3">
            私たちは、フットサルを楽しみながら勝つことを目標に活動しています。
          </p>
          <p className="text-muted-foreground text-sm sm:text-base leading-relaxed">
            サッカー初心者もいれば、サッカーをしていたがブランクがある人もいて、幅広いレベルの部員が在籍しています。
          </p>
        </motion.div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-10">
        {stats.map(({ icon: Icon, label, value }, i) => (
          <motion.div key={label} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
            className="text-center p-4 sm:p-6 rounded-xl border border-border bg-card">
            <Icon size={22} className="mx-auto text-primary mb-2" />
            <div className="font-display font-bold text-lg sm:text-xl text-foreground">{value}</div>
            <div className="text-xs text-muted-foreground mt-1">{label}</div>
          </motion.div>
        ))}
      </div>

      <div className="grid sm:grid-cols-3 gap-3 sm:gap-4">
        {[
          { title: "練習", desc: "火・木・金・土の週4日、放課後に高校コート面で練習。基礎練習からゲーム形式まで。" },
          { title: "大会", desc: "年間を通じて複数の大会に出場。2026年度には大会で東京都3位にランクイン。" },
          { title: "練習試合", desc: "様々な高校と定期的に練習試合を行い、実戦経験を積んでいます。" },
        ].map((item, i) => (
          <motion.div key={item.title} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
            className="p-4 sm:p-5 rounded-xl bg-purple-subtle border border-border">
            <h4 className="font-display font-semibold text-foreground mb-1.5">{item.title}</h4>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
          </motion.div>
        ))}
      </div>
    </section>
    {/* 詳細モーダル */}
    <AnimatePresence>
      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setSelectedEvent(null)}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-lg bg-card rounded-2xl shadow-2xl overflow-hidden border border-border"
          >
            <button
              onClick={() => setSelectedEvent(null)}
              className="absolute top-4 right-4 p-2 bg-muted/50 hover:bg-muted text-muted-foreground rounded-full transition-colors z-10"
            >
              <X size={20} />
            </button>
            <div className="p-6 sm:p-8">
              <div className="mb-4 inline-block px-3 py-1 bg-primary/10 text-primary text-xs font-bold rounded-full">
                {selectedEvent.type === "match" ? "試合" : selectedEvent.type === "practice" ? "練習" : "イベント"}
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-4">{selectedEvent.title}</h2>
              <div className="space-y-3 pb-6 border-b border-border">
                <div className="flex items-center gap-3 text-muted-foreground text-sm">
                  <Clock size={18} className="text-primary/70 shrink-0" />
                  <span>{selectedEvent.date.replace(/-/g, "/")} {selectedEvent.time}</span>
                </div>
                {selectedEvent.location && (
                  <div className="flex items-center gap-3 text-muted-foreground text-sm">
                    <MapPin size={18} className="text-primary/70 shrink-0" />
                    <span>{selectedEvent.location}</span>
                  </div>
                )}
              </div>
              <div className="pt-6 space-y-6">
                {selectedEvent.detail && (
                  <div>
                    <h3 className="flex items-center gap-2 font-bold text-foreground mb-2 text-sm">
                      <Info size={18} className="text-primary" /> 詳細・時程
                    </h3>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed bg-muted/30 p-4 rounded-xl">
                      {selectedEvent.detail}
                    </p>
                  </div>
                )}
                {selectedEvent.belongings && (
                  <div>
                    <h3 className="flex items-center gap-2 font-bold text-foreground mb-2 text-sm">
                      <Briefcase size={18} className="text-primary" /> 持ち物
                    </h3>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed bg-muted/30 p-4 rounded-xl">
                      {selectedEvent.belongings}
                    </p>
                  </div>
                )}
                {!selectedEvent.detail && !selectedEvent.belongings && (
                  <p className="text-sm text-muted-foreground italic text-center py-4">詳細情報は登録されていません。</p>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  </div>
  );
};

export default Index;
