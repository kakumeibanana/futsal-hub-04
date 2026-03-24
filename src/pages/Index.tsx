import { Link } from "react-router-dom";
import { CalendarDays, ArrowRight, Bell, ImageIcon } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import ScheduleCard from "@/components/ScheduleCard";
import ScheduleTag from "@/components/ScheduleTag";
import { scheduleEvents, newsItems } from "@/data/sampleData";
import heroImage from "@/assets/hero-futsal.jpg";
import trainingImg from "@/assets/training.jpg";
import matchImg from "@/assets/match-action.jpg";
import celebrationImg from "@/assets/celebration.jpg";
import teamPhoto from "@/assets/team-photo.jpg";

const today = "2026-03-24";
const todayEvents = scheduleEvents.filter((e) => e.date === today);
const upcomingEvents = scheduleEvents.filter((e) => e.date >= today).slice(0, 5);

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.5 } }),
};

const SectionHeader = ({ icon: Icon, title, linkTo, linkLabel }: { icon: any; title: string; linkTo: string; linkLabel: string }) => (
  <div className="flex items-center justify-between mb-6">
    <h2 className="flex items-center gap-2 font-display font-bold text-xl text-foreground">
      <Icon size={20} className="text-primary" />
      {title}
    </h2>
    <Link to={linkTo} className="text-sm font-medium text-primary hover:underline inline-flex items-center gap-1">
      {linkLabel}<ArrowRight size={14} />
    </Link>
  </div>
);

const Index = () => (
  <div>
    {/* Hero */}
    <section className="relative h-[60vh] min-h-[400px] overflow-hidden">
      <img src={heroImage} alt="フットサル部" className="absolute inset-0 w-full h-full object-cover" width={1920} height={1080} />
      <div className="absolute inset-0 bg-gradient-hero" />
      <div className="relative container h-full flex flex-col justify-end pb-12">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
          <span className="inline-block px-3 py-1 rounded-full bg-primary/20 text-primary-foreground text-xs font-semibold mb-4 backdrop-blur-sm border border-primary-foreground/20">
            〇〇高校フットサル部
          </span>
          <h1 className="font-display font-black text-4xl md:text-6xl text-primary-foreground leading-tight max-w-2xl">
            Play with
            <br />
            <span className="text-primary-foreground/80">Passion.</span>
          </h1>
          <p className="mt-4 text-primary-foreground/70 max-w-md text-sm md:text-base">
            仲間と共に成長し、全力でプレーする。
            <br />
            私たちのフットサル部へようこそ。
          </p>
          <div className="mt-6 flex gap-3">
            <Button asChild className="bg-gradient-primary shadow-primary hover:opacity-90 transition-opacity">
              <Link to="/schedule">日程を見る</Link>
            </Button>
            <Button asChild variant="outline" className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10">
              <Link to="/about">部活紹介</Link>
            </Button>
          </div>
        </motion.div>
      </div>
    </section>

    {/* Today's schedule */}
    <section className="container mt-12">
      <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} className="bg-purple-subtle rounded-2xl p-6 md:p-8 border border-border">
        <div className="flex items-center gap-2 mb-4">
          <CalendarDays size={20} className="text-primary" />
          <h2 className="font-display font-bold text-xl text-foreground">今日の予定</h2>
          <span className="ml-auto text-sm text-muted-foreground font-medium">
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
    <section className="container mt-16">
      <SectionHeader icon={CalendarDays} title="直近の予定" linkTo="/schedule" linkLabel="すべての日程" />
      <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} className="space-y-3">
        {upcomingEvents.map((event, i) => (
          <motion.div key={event.id} custom={i} variants={fadeUp}>
            <ScheduleCard event={event} />
          </motion.div>
        ))}
      </motion.div>
    </section>

    {/* News */}
    <section className="container mt-16">
      <SectionHeader icon={Bell} title="お知らせ" linkTo="/news" linkLabel="すべて見る" />
      <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} className="space-y-3">
        {newsItems.slice(0, 3).map((item, i) => (
          <motion.div key={item.id} custom={i} variants={fadeUp}>
            <Link to="/news" className="group flex items-start gap-4 p-4 rounded-xl border border-border bg-card hover:shadow-primary transition-all duration-300">
              <div className="flex-shrink-0">
                <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-secondary text-secondary-foreground">
                  {item.category}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors truncate">{item.title}</p>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{item.content}</p>
              </div>
              <span className="text-xs text-muted-foreground flex-shrink-0">{item.date.replace("2026-", "").replace("-", "/")}</span>
            </Link>
          </motion.div>
        ))}
      </motion.div>
    </section>

    {/* Photo preview */}
    <section className="container mt-16">
      <SectionHeader icon={ImageIcon} title="フォトギャラリー" linkTo="/gallery" linkLabel="もっと見る" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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
