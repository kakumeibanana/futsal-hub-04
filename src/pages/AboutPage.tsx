import { Users, Trophy, Target, Heart } from "lucide-react";
import { motion } from "framer-motion";
import teamPhoto from "@/assets/20260430_075513753_iOS.jpg";

const stats = [
  { icon: Users, label: "部員数", value: "22名" },
  { icon: Trophy, label: "創部", value: "2020年" },
  { icon: Target, label: "活動日", value: "週4日" },
  { icon: Heart, label: "モットー", value: "全力で楽しむ" },
];

const AboutPage = () => (
  <div className="container py-10">
    <h1 className="font-display font-bold text-3xl text-foreground mb-8">部活紹介</h1>

    <div className="grid md:grid-cols-2 gap-10 items-center mb-16">
      <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}>
        <img src={teamPhoto} alt="チーム写真" className="rounded-2xl w-full object-cover shadow-primary" width={1280} height={854} />
      </motion.div>
      <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.2 }}>
        <h2 className="font-display font-bold text-2xl text-foreground mb-4">〇〇高校フットサル部</h2>
        <p className="text-muted-foreground leading-relaxed mb-4">
          私たちは「全力で楽しむ」をモットーに、日々練習に励んでいます。フットサル未経験から始めた部員も多く、誰でも楽しめる環境を大切にしています。
        </p>
        <p className="text-muted-foreground leading-relaxed">
          技術の向上だけでなく、チームワークやコミュニケーション力も磨きながら、大会での上位進出を目指して活動しています。
        </p>
      </motion.div>
    </div>

    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {stats.map(({ icon: Icon, label, value }, i) => (
        <motion.div
          key={label}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
          className="text-center p-6 rounded-xl border border-border bg-card"
        >
          <Icon size={24} className="mx-auto text-primary mb-2" />
          <div className="font-display font-bold text-xl text-foreground">{value}</div>
          <div className="text-xs text-muted-foreground mt-1">{label}</div>
        </motion.div>
      ))}
    </div>

    <section className="mt-16 max-w-2xl">
      <h2 className="font-display font-bold text-2xl text-foreground mb-4">活動内容</h2>
      <div className="space-y-4 text-sm text-muted-foreground leading-relaxed">
        <div className="p-4 rounded-xl bg-purple-subtle border border-border">
          <h3 className="font-display font-semibold text-foreground mb-1">練習</h3>
          <p>月・水・金・土の週4日、放課後に第一体育館で練習を行っています。基礎練習からゲーム形式まで幅広く取り組んでいます。</p>
        </div>
        <div className="p-4 rounded-xl bg-purple-subtle border border-border">
          <h3 className="font-display font-semibold text-foreground mb-1">大会</h3>
          <p>春季大会・秋季大会・新人戦など、年間を通じて各種大会に出場しています。</p>
        </div>
        <div className="p-4 rounded-xl bg-purple-subtle border border-border">
          <h3 className="font-display font-semibold text-foreground mb-1">練習試合</h3>
          <p>近隣の高校と定期的に練習試合を行い、実戦経験を積んでいます。</p>
        </div>
      </div>
    </section>
  </div>
);

export default AboutPage;
