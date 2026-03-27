import { Link } from "react-router-dom";
import { CalendarDays, ArrowRight, Bell, ImageIcon, Users, Trophy, Target, Heart } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import ScheduleCard from "@/components/ScheduleCard";
import { scheduleEvents, newsItems } from "@/data/sampleData";
import heroImage from "@/assets/hero-futsal.jpg";
import trainingImg from "@/assets/training.jpg";
import matchImg from "@/assets/match-action.jpg";
import celebrationImg from "@/assets/celebration.jpg";
import teamPhoto from "@/assets/team-photo.jpg";

// パソコン/スマホから現在の日時を取得
const d = new Date();
// YYYY-MM-DD の形に自動で変換して today に入れる
const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const publicSchedule = scheduleEvents.filter((e) => e.type !== "practice");
const todayEvents = scheduleEvents.filter((e) => e.date === today);
const upcomingEvents = publicSchedule.filter((e) => e.date >= today);
const publicNews = newsItems.filter((n) => n.visibility === "public");

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.5 } }),
};

const stats = [
  { icon: Users, label: "部員数", value: "17名" },
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

const Index = () => (
  <div>
    {/* Hero */}
    <section className="relative h-[85vh] min-h-[520px] max-h-[800px] overflow-hidden">
      <img src={heroImage} alt="フットサル部" className="absolute inset-0 w-full h-full object-cover" width={1920} height={1080} />
      <div className="absolute inset-0 bg-gradient-hero" />
      
      {/* Decorative elements */}
      <div className="absolute top-1/4 right-[10%] w-64 h-64 rounded-full bg-primary/10 blur-[100px] hidden md:block" />
      <div className="absolute bottom-1/3 left-[5%] w-48 h-48 rounded-full bg-accent/10 blur-[80px] hidden md:block" />
      
      <div className="relative container h-full flex flex-col justify-center">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-2xl"
        >

          <h1 className="font-display font-black text-5xl sm:text-6xl md:text-7xl lg:text-8xl text-primary-foreground leading-[0.95] tracking-tight">
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

      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-background to-transparent" />
    </section>

    {/* Today's schedule */}
    <section className="container mt-8 sm:mt-12">
      <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} className="bg-purple-subtle rounded-2xl p-4 sm:p-6 md:p-8 border border-border">
        <div className="flex items-center gap-2 mb-4">
          <CalendarDays size={20} className="text-primary" />
          <h2 className="font-display font-bold text-lg sm:text-xl text-foreground">今日の予定</h2>
          <span className="ml-auto text-xs sm:text-sm text-muted-foreground font-medium">
            {new Date(today).toLocaleDateString("ja-JP", { month: "long", day: "numeric", weekday: "short" })}
          </span>
        </div>
        {todayEvents.length > 0 ? (
          <div className="space-y-3">
            {todayEvents.map((event, i) => (
              <motion.div key={event.id} custom={i} variants={fadeUp}>
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
      <SectionHeader icon={CalendarDays} title="直近の予定" />
      <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} className="space-y-3">
        {upcomingEvents.map((event, i) => (
          <motion.div key={event.id} custom={i} variants={fadeUp}>
            <ScheduleCard event={event} />
          </motion.div>
        ))}
      </motion.div>
    </section>

    {/* News */}
    <section id="news" className="container mt-12 sm:mt-16 scroll-mt-20">
      <SectionHeader icon={Bell} title="お知らせ" linkTo="/news" linkLabel="すべて見る" />
      <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} className="space-y-3">
        {publicNews.slice(0, 3).map((item, i) => (
          <motion.div key={item.id} custom={i} variants={fadeUp}>
            <Link to={`/news/${item.id}`} className="group flex items-start gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl border border-border bg-card hover:shadow-primary transition-all duration-300">
              <div className="flex-shrink-0">
                <span className="inline-block px-2 sm:px-2.5 py-0.5 rounded-full text-xs font-semibold bg-secondary text-secondary-foreground">
                  {item.category}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors truncate">{item.title}</p>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-1 hidden sm:block">{item.content}</p>
              </div>
              <span className="text-xs text-muted-foreground flex-shrink-0">{item.date.replace("2026-", "").replace("-", "/")}</span>
            </Link>
          </motion.div>
        ))}
      </motion.div>
    </section>

    {/* About section */}
    <section id="about" className="container mt-16 sm:mt-24 scroll-mt-20">
      <SectionHeader icon={Users} title="部活紹介" />
      
      <div className="grid md:grid-cols-2 gap-6 md:gap-10 items-center mb-10">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <img src={teamPhoto} alt="チーム写真" className="rounded-2xl w-full aspect-[4/3] object-cover shadow-primary" width={1280} height={854} />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.15 }}
        >
          <h3 className="font-display font-bold text-xl sm:text-2xl text-foreground mb-4">筑波大学附属高等学校フットサル部</h3>
          <p className="text-muted-foreground text-sm sm:text-base leading-relaxed mb-3">
            私たちは、フットサルを楽しみながら勝つことを目標に活動しています。
          </p>
          <p className="text-muted-foreground text-sm sm:text-base leading-relaxed">
            サッカー初心者もいれば、サッカーをしていたがブランクがある人もいて、幅広いレベルの部員が在籍しています。
          </p>
        </motion.div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-10">
        {stats.map(({ icon: Icon, label, value }, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
            className="text-center p-4 sm:p-6 rounded-xl border border-border bg-card"
          >
            <Icon size={22} className="mx-auto text-primary mb-2" />
            <div className="font-display font-bold text-lg sm:text-xl text-foreground">{value}</div>
            <div className="text-xs text-muted-foreground mt-1">{label}</div>
          </motion.div>
        ))}
      </div>

      {/* Activities */}
      <div className="grid sm:grid-cols-3 gap-3 sm:gap-4">
        {[
          { title: "練習", desc: "火・木・金・土の週4日、放課後に高校コート面で練習。基礎練習からゲーム形式まで。" },
          { title: "大会", desc: "年間を通じて複数の大会に出場。2026年度には大会で東京都3位にランクイン。" },
          { title: "練習試合", desc: "様々な高校と定期的に練習試合を行い、実戦経験を積んでいます。" },
        ].map((item, i) => (
          <motion.div
            key={item.title}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
            className="p-4 sm:p-5 rounded-xl bg-purple-subtle border border-border"
          >
            <h4 className="font-display font-semibold text-foreground mb-1.5">{item.title}</h4>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
          </motion.div>
        ))}
      </div>
    </section>

    {/* Photo preview */}
    <section className="container mt-12 sm:mt-16">
      <SectionHeader icon={ImageIcon} title="フォトギャラリー"/>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
        {[trainingImg, matchImg, celebrationImg, teamPhoto].map((src, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1, duration: 0.4 }}
            className="aspect-square rounded-xl overflow-hidden"
          >
            <img src={src} alt={`ギャラリー ${i + 1}`} className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" loading="lazy" />
          </motion.div>
        ))}
      </div>
    </section>
  </div>
);

export default Index;
