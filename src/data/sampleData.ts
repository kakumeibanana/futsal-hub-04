export type EventType = "match" | "practice" | "event";

export interface ScheduleEvent {
  id: string;
  date: string;
  time: string;
  title: string;
  type: EventType;
  location: string;
  description?: string;
}

export type NewsVisibility = "public" | "member";

export interface NewsItem {
  id: string;
  date: string;
  title: string;
  content: string;
  category: string;
  visibility: NewsVisibility;
}

export const scheduleEvents: ScheduleEvent[] = [
  { id: "1", date: "2026-03-24", time: "16:00 - 18:30", title: "練習", type: "practice", location: "第一体育館" },
  { id: "2", date: "2026-03-24", time: "09:00 - 12:00", title: "練習試合 vs 東高校", type: "match", location: "市総合体育館" },
  { id: "3", date: "2026-03-26", time: "16:00 - 18:00", title: "練習", type: "practice", location: "第一体育館" },
  { id: "4", date: "2026-03-28", time: "10:00 - 17:00", title: "春季大会 1回戦", type: "match", location: "県立体育館" },
  { id: "5", date: "2026-03-30", time: "16:00 - 18:30", title: "練習", type: "practice", location: "第一体育館" },
  { id: "6", date: "2026-04-02", time: "16:00 - 18:00", title: "練習", type: "practice", location: "第一体育館" },
  { id: "7", date: "2026-04-05", time: "13:00 - 17:00", title: "合同練習会", type: "event", location: "市総合体育館" },
  { id: "8", date: "2026-04-10", time: "10:00 - 17:00", title: "春季大会 2回戦", type: "match", location: "県立体育館" },
];

export const newsItems: NewsItem[] = [
  { id: "1", date: "2026-03-23", title: "春季大会の組み合わせが決定しました", content: "3月28日より開催される春季大会の組み合わせが発表されました。初戦の相手は南高校です。応援よろしくお願いします！", category: "大会" },
  { id: "2", date: "2026-03-20", title: "新入部員募集のお知らせ", content: "4月より新入部員を募集します。フットサル経験の有無は問いません。興味のある方はぜひ体験に来てください。", category: "募集" },
  { id: "3", date: "2026-03-15", title: "練習試合の結果報告", content: "3月15日に行われた北高校との練習試合は 4-2 で勝利しました。チーム全体の守備が安定していました。", category: "試合結果" },
  { id: "4", date: "2026-03-10", title: "ユニフォーム注文について", content: "新ユニフォームの注文を受け付けています。希望者は3月25日までに顧問の先生に申し込んでください。", category: "連絡" },
];

export const videoItems = [
  { id: "1", title: "春季大会 ハイライト", date: "2026-03-15", thumbnail: "", duration: "3:42" },
  { id: "2", title: "練習風景 - パス回し", date: "2026-03-10", thumbnail: "", duration: "5:18" },
  { id: "3", title: "練習試合 vs 北高校", date: "2026-03-05", thumbnail: "", duration: "8:24" },
];
