import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const QuerySchema = z.object({
  id: z.string().optional(),
});

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get('MICROCMS_API_KEY');
    const serviceDomain = Deno.env.get('MICROCMS_SERVICE_DOMAIN');

    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'MICROCMS_API_KEY not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (!serviceDomain) {
      return new Response(JSON.stringify({ error: 'MICROCMS_SERVICE_DOMAIN not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const url = new URL(req.url);
    const parsed = QuerySchema.safeParse({ id: url.searchParams.get('id') || undefined });
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: parsed.error.flatten() }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { id } = parsed.data;

    // Normalize domain: strip protocol and trailing paths, keep just "xxx.microcms.io"
    let domain = serviceDomain.replace(/^https?:\/\//, '').replace(/\/.*$/, '');

    let endpoint: string;
    if (id) {
      endpoint = `https://${domain}/api/v1/news/${id}`;
    } else {
      endpoint = `https://${domain}/api/v1/news?orders=-date&limit=50`;
    }

    const response = await fetch(endpoint, {
      headers: { 'X-MICROCMS-API-KEY': apiKey },
    });

    if (!response.ok) {
      const body = await response.text();
      console.error(`MicroCMS API error [${response.status}]:`, body);
      return new Response(JSON.stringify({ error: `MicroCMS API error: ${response.status}` }), {
        status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching from MicroCMS:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
