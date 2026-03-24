import { ImageIcon } from "lucide-react";
import { motion } from "framer-motion";
import heroImg from "@/assets/hero-futsal.jpg";
import teamPhoto from "@/assets/team-photo.jpg";
import trainingImg from "@/assets/training.jpg";
import matchImg from "@/assets/match-action.jpg";
import celebrationImg from "@/assets/celebration.jpg";

const images = [
  { src: heroImg, alt: "試合風景" },
  { src: teamPhoto, alt: "チーム写真" },
  { src: trainingImg, alt: "練習風景" },
  { src: matchImg, alt: "アクションショット" },
  { src: celebrationImg, alt: "ゴール後の喜び" },
  { src: heroImg, alt: "試合風景 2" },
];

const GalleryPage = () => (
  <div className="container py-10">
    <h1 className="font-display font-bold text-3xl text-foreground flex items-center gap-2 mb-8">
      <ImageIcon size={28} className="text-primary" />
      ギャラリー
    </h1>
    <div className="columns-2 md:columns-3 gap-3 space-y-3">
      {images.map((img, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: i * 0.08 }}
          className="break-inside-avoid rounded-xl overflow-hidden"
        >
          <img src={img.src} alt={img.alt} className="w-full hover:scale-105 transition-transform duration-500" loading="lazy" />
        </motion.div>
      ))}
    </div>
  </div>
);

export default GalleryPage;
