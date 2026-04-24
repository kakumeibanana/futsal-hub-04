import { useParams, useNavigate, Navigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useNewsDetail } from "@/hooks/useNews";
import { Skeleton } from "@/components/ui/skeleton";

const categoryColor: Record<string, string> = {
  重要: "bg-red-100 text-red-700",
  試合結果: "bg-blue-100 text-blue-700",
  連絡: "bg-yellow-100 text-yellow-700",
  その他: "bg-secondary text-secondary-foreground",
};

const NewsDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isLoggedIn, loading: authLoading } = useAuth();
  const { data: item, isLoading } = useNewsDetail(id);

  if (authLoading || isLoading) {
    return (
      <div className="container py-10 max-w-2xl">
        <Skeleton className="h-8 w-32 mb-6" />
        <Skeleton className="h-6 w-48 mb-4" />
        <Skeleton className="h-10 w-full mb-6" />
        <Skeleton className="h-40 w-full" />
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
          <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${categoryColor[item.category] ?? categoryColor["その他"]}`}>
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

        <div
          className="prose prose-sm max-w-none text-muted-foreground leading-relaxed [&_img]:max-w-full [&_img]:rounded-xl [&_img]:my-4"
          dangerouslySetInnerHTML={{ __html: item.content }}
        />
      </motion.article>
    </div>
  );
};

export default NewsDetailPage;
