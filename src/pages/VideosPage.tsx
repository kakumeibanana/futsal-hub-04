import { videoItems } from "@/data/sampleData";
import { Play, Video } from "lucide-react";
import { motion } from "framer-motion";
import matchImg from "@/assets/match-action.jpg";
import trainingImg from "@/assets/training.jpg";
import celebrationImg from "@/assets/celebration.jpg";

const thumbnails = [matchImg, trainingImg, celebrationImg];

const VideosPage = () => (
  <div className="container py-10">
    <h1 className="font-display font-bold text-3xl text-foreground flex items-center gap-2 mb-8">
      <Video size={28} className="text-primary" />
      試合動画
    </h1>
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {videoItems.map((vid, i) => (
        <motion.div
          key={vid.id}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
          className="group rounded-xl overflow-hidden border border-border bg-card cursor-pointer hover:shadow-primary transition-all duration-300"
        >
          <div className="relative aspect-video bg-muted">
            <img src={thumbnails[i % thumbnails.length]} alt={vid.title} className="w-full h-full object-cover" loading="lazy" />
            <div className="absolute inset-0 bg-foreground/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="w-12 h-12 rounded-full bg-primary/90 flex items-center justify-center">
                <Play size={20} className="text-primary-foreground ml-0.5" />
              </div>
            </div>
            <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-foreground/70 text-primary-foreground text-xs font-mono">
              {vid.duration}
            </span>
          </div>
          <div className="p-4">
            <h3 className="font-display font-semibold text-sm text-foreground">{vid.title}</h3>
            <p className="text-xs text-muted-foreground mt-1">{vid.date.replace("2026-", "").replace("-", "/")}</p>
          </div>
        </motion.div>
      ))}
    </div>
    <p className="text-center text-muted-foreground text-sm mt-10">
      動画は準備中です。公開までしばらくお待ちください。
    </p>
  </div>
);

export default VideosPage;
