import { useParams, useNavigate, Navigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { newsItems } from "@/data/sampleData";
import { useAuth } from "@/contexts/AuthContext";

const NewsDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isLoggedIn, loading } = useAuth();

  const item = newsItems.find((n) => n.id === id);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!item) {
    return (
      <div className="container py-10 text-center">
        <p className="text-muted-foreground">お知らせが見つかりませんでした</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate("/news")}>
          一覧へ戻る
        </Button>
      </div>
    );
  }

  // Member-only news requires login
  if (item.visibility === "member" && !isLoggedIn) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="container py-10 max-w-2xl">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate("/news")}
        className="mb-6 text-muted-foreground hover:text-foreground -ml-2"
      >
        <ArrowLeft size={16} className="mr-1" />
        一覧へ戻る
      </Button>

      <motion.article
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="flex items-center gap-3 mb-4">
          <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-secondary text-secondary-foreground">
            {item.category}
          </span>
          {item.visibility === "member" && (
            <span className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary">
              部員限定
            </span>
          )}
          <span className="text-xs text-muted-foreground">
            {item.date.replace("2026-", "").replace("-", "/")}
          </span>
        </div>

        <h1 className="font-display font-bold text-2xl sm:text-3xl text-foreground mb-6">
          {item.title}
        </h1>

        <div className="prose prose-sm max-w-none text-muted-foreground leading-relaxed space-y-4">
          <p>{item.content}</p>
          <p>
            これはお知らせの詳細ページです。今後、より詳細な内容がここに掲載される予定です。
            チームに関する最新情報や重要な連絡事項を、このページで確認することができます。
          </p>
        </div>
      </motion.article>
    </div>
  );
};

export default NewsDetailPage;
