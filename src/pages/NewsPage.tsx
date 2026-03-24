import { newsItems } from "@/data/sampleData";
import { Bell } from "lucide-react";
import { motion } from "framer-motion";

const NewsPage = () => (
  <div className="container py-10">
    <h1 className="font-display font-bold text-3xl text-foreground flex items-center gap-2 mb-8">
      <Bell size={28} className="text-primary" />
      お知らせ
    </h1>
    <div className="space-y-4 max-w-2xl">
      {newsItems.map((item, i) => (
        <motion.article
          key={item.id}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.08 }}
          className="p-5 rounded-xl border border-border bg-card"
        >
          <div className="flex items-center gap-3 mb-2">
            <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-secondary text-secondary-foreground">
              {item.category}
            </span>
            <span className="text-xs text-muted-foreground">{item.date.replace("2026-", "").replace("-", "/")}</span>
          </div>
          <h2 className="font-display font-semibold text-foreground mb-2">{item.title}</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">{item.content}</p>
        </motion.article>
      ))}
    </div>
  </div>
);

export default NewsPage;
