import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface NewsItem {
  id: string;
  title: string;
  content: string;
  category: string;
  visibility: "public" | "member";
  date: string;
}

async function fetchNewsList(): Promise<NewsItem[]> {
  const { data, error } = await supabase
    .from("news")
    .select("id, title, content, date, category, visibility")
    .order("date", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    content: row.content,
    category: row.category,
    visibility: row.visibility as "public" | "member",
    date: row.date,
  }));
}

async function fetchNewsDetail(id: string): Promise<NewsItem | null> {
  const { data, error } = await supabase
    .from("news")
    .select("id, title, content, date, category, visibility")
    .eq("id", id)
    .single();
  if (error) return null;
  return {
    id: data.id,
    title: data.title,
    content: data.content,
    category: data.category,
    visibility: data.visibility as "public" | "member",
    date: data.date,
  };
}

export function useNewsList() {
  return useQuery({
    queryKey: ["news"],
    queryFn: fetchNewsList,
    staleTime: 1000 * 60 * 2,
  });
}

export function useNewsDetail(id: string | undefined) {
  return useQuery({
    queryKey: ["news", id],
    queryFn: () => fetchNewsDetail(id!),
    enabled: !!id,
    staleTime: 1000 * 60 * 2,
  });
}
