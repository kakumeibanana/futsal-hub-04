import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY")!;
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") ?? "mailto:kakumei.banana@gmail.com";
const APP_URL = "https://futsal-hub-04.vercel.app";

Deno.serve(async (_req) => {
  try {
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // JST で今日の日付を取得
    const nowJST = new Date(Date.now() + 9 * 60 * 60 * 1000);
    const year = nowJST.getUTCFullYear();
    const month = String(nowJST.getUTCMonth() + 1).padStart(2, "0");
    const day = String(nowJST.getUTCDate()).padStart(2, "0");
    const todayStr = `${year}-${month}-${day}`;

    // 今日の試合を確認
    const { data: matches } = await supabase
      .from("schedule_events")
      .select("id, title")
      .eq("date", todayStr)
      .eq("type", "match");

    if (!matches || matches.length === 0) {
      return new Response(
        JSON.stringify({ message: "今日は試合がありません" }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    const { data: subs } = await supabase
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth");

    if (!subs || subs.length === 0) {
      return new Response(
        JSON.stringify({ message: "購読者なし" }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    const payload = JSON.stringify({
      title: "試合お疲れさまでした！",
      body: "試合結果・動画・お知らせを記録しましょう",
      url: `${APP_URL}/match-results`,
    });

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
