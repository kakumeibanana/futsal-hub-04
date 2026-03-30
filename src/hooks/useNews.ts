import { useQuery } from "@tanstack/react-query";
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

const BASE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/microcms-news`;
const HEADERS = {
  Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
};

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
      const res = await fetch(BASE_URL, { headers: HEADERS });
      if (!res.ok) throw new Error("Failed to fetch news");
      const data = (await res.json()) as MicroCmsListResponse;
      return (data.contents || []).map(toNewsItem);
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function useNewsDetail(id: string | undefined) {
  return useQuery({
    queryKey: ["news", id],
    queryFn: async (): Promise<NewsItem | null> => {
      if (!id) return null;
      const res = await fetch(`${BASE_URL}?id=${id}`, { headers: HEADERS });
      if (!res.ok) throw new Error("Failed to fetch news detail");
      const item = (await res.json()) as MicroCmsNewsItem;
      return toNewsItem(item);
    },
    enabled: !!id,
    staleTime: 1000 * 60 * 5,
  });
}
