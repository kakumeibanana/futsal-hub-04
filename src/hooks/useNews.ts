import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { NewsItem } from "@/data/sampleData";

interface MicroCmsNewsItem {
  id: string;
  title: string;
  content: string;
  category: string;
  visibility: "public" | "member";
  date: string;
}

interface MicroCmsListResponse {
  contents: MicroCmsNewsItem[];
  totalCount: number;
}

function toNewsItem(item: MicroCmsNewsItem): NewsItem {
  return {
    id: item.id,
    title: item.title,
    content: item.content,
    category: item.category,
    visibility: item.visibility || "public",
    date: item.date?.slice(0, 10) || "",
  };
}

export function useNewsList() {
  return useQuery({
    queryKey: ["news"],
    queryFn: async (): Promise<NewsItem[]> => {
      const { data, error } = await supabase.functions.invoke("microcms-news");
      if (error) throw error;
      const res = data as MicroCmsListResponse;
      return (res.contents || []).map(toNewsItem);
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function useNewsDetail(id: string | undefined) {
  return useQuery({
    queryKey: ["news", id],
    queryFn: async (): Promise<NewsItem | null> => {
      if (!id) return null;
      const { data, error } = await supabase.functions.invoke("microcms-news", {
        body: undefined,
        headers: undefined,
      });
      // Use list and find by id since invoke doesn't support query params easily
      // Alternative: call via fetch directly
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/microcms-news?id=${id}`;
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
      });
      if (!res.ok) throw new Error("Failed to fetch news detail");
      const item = (await res.json()) as MicroCmsNewsItem;
      return toNewsItem(item);
    },
    enabled: !!id,
    staleTime: 1000 * 60 * 5,
  });
}
