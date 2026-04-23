import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LINE_TOKEN = Deno.env.get("LINE_CHANNEL_ACCESS_TOKEN") ?? "";
const GROUP_ID = Deno.env.get("LINE_GROUP_ID") ?? "";

interface ScheduleEvent {
  id: string;
  title: string;
  date: string;
  start_time: string | null;
  end_time: string | null;
  is_all_day: boolean;
  location: string;
  type: "match" | "practice" | "event";
  detail: string;
  belongings: string;
}

function buildMessage(event: ScheduleEvent): string {
  const [year, month, day] = event.date.split("-").map(Number);
  const d = new Date(year, month - 1, day);
  const days = ["日", "月", "火", "水", "木", "金", "土"];
  const dateStr = `${month}/${day}(${days[d.getDay()]})`;

  let header = "【お知らせ】";
  if (event.type === "match") header = "【MATCH DAY】";
  else if (event.type === "practice") header = "【TRAINING】";
  else if (event.type === "event") header = "//EVENT//";

  const location = event.location || "未定";
  const detail = event.detail || "特になし";
  const belongings = event.belongings || "特になし";

  let timeStr = "";
  if (!event.is_all_day && event.start_time) {
    const start = event.start_time.slice(0, 5);
    const end = event.end_time ? event.end_time.slice(0, 5) : "";
    timeStr = end ? `\n🕐 ${start} - ${end}` : `\n🕐 ${start}~`;
  }

  return `${header}\n${dateStr}${timeStr}\n@${location}\n\n★${event.title}\n\n★詳細・時程\n${detail}\n\n★持ち物\n${belongings}`;
}

async function sendLineMessage(text: string): Promise<void> {
  const res = await fetch("https://api.line.me/v2/bot/message/push", {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=UTF-8",
      Authorization: `Bearer ${LINE_TOKEN}`,
    },
    body: JSON.stringify({
      to: GROUP_ID,
      messages: [{ type: "text", text }],
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`LINE API error ${res.status}: ${body}`);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const body = await req.json().catch(() => ({}));

    if (body.event_id) {
      // 即時送信: 特定イベントをLINEへ
      const { data: event, error } = await supabase
        .from("schedule_events")
        .select("*")
        .eq("id", body.event_id)
        .single();

      if (error || !event) {
        return new Response(JSON.stringify({ error: "Event not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      await sendLineMessage(buildMessage(event as ScheduleEvent));
      await supabase.from("schedule_events").update({ line_sent: true }).eq("id", body.event_id);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } else {
      // 予約配信チェック: 送信時刻を過ぎた未送信イベントをまとめて送信
      const now = new Date().toISOString();
      const { data: events, error } = await supabase
        .from("schedule_events")
        .select("*")
        .eq("line_notify_type", "scheduled")
        .eq("line_sent", false)
        .lte("line_send_at", now);

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      let sent = 0;
      for (const event of events ?? []) {
        await sendLineMessage(buildMessage(event as ScheduleEvent));
        await supabase.from("schedule_events").update({ line_sent: true }).eq("id", event.id);
        sent++;
      }

      return new Response(JSON.stringify({ success: true, sent }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
