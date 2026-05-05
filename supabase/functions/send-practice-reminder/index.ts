import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY")!;
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") ?? "mailto:kakumei.banana@gmail.com";
const APP_URL = "https://futsal-hub-04.vercel.app";

const DAY_NAMES = ["日", "月", "火", "水", "木", "金", "土"];

// 曜日ごとのテンプレート（JST曜日番号）
const PRACTICE_TEMPLATES: Record<number, { startTime: string; endTime: string }> = {
  2: { startTime: "15:15", endTime: "17:30" }, // 火曜
  4: { startTime: "15:15", endTime: "17:30" }, // 木曜
  5: { startTime: "15:15", endTime: "17:30" }, // 金曜
  6: { startTime: "12:30", endTime: "16:00" }, // 土曜
};

Deno.serve(async (req) => {
  try {
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

    // body に practiceDate があればそれを使う、なければ今日+7日
    const body = await req.json().catch(() => ({}));
    let target: Date;
    if (body.practiceDate) {
      target = new Date(body.practiceDate + "T00:00:00Z");
    } else {
      const nowMs = Date.now() + 9 * 60 * 60 * 1000; // UTC→JST
      target = new Date(nowMs + 7 * 24 * 60 * 60 * 1000);
    }

    const dayOfWeek = target.getUTCDay();
    const template = PRACTICE_TEMPLATES[dayOfWeek];

    if (!template) {
      return new Response(
        JSON.stringify({ message: "今日は通知対象日ではありません" }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    const year = target.getUTCFullYear();
    const month = String(target.getUTCMonth() + 1).padStart(2, "0");
    const day = String(target.getUTCDate()).padStart(2, "0");
    const dateStr = `${year}-${month}-${day}`;
    const dayName = DAY_NAMES[dayOfWeek];

    const payload = JSON.stringify({
      title: "来週の日程を登録しよう",
      body: `${month}/${day}(${dayName}) 練習 ${template.startTime}〜${template.endTime}`,
      url: `${APP_URL}/schedule?practiceDate=${dateStr}`,
    });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: subs, error } = await supabase
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth")
      .eq("member_role", "captain");

    if (error) throw error;

    if (!subs || subs.length === 0) {
      return new Response(
        JSON.stringify({ message: "購読者なし" }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    let sent = 0;
    let failed = 0;

    for (const sub of subs) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload
        );
        sent++;
      } catch (err: unknown) {
        failed++;
        // 期限切れのサブスクリプションを削除
        if (typeof err === "object" && err !== null && "statusCode" in err && (err as { statusCode: number }).statusCode === 410) {
          await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, sent, failed }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
