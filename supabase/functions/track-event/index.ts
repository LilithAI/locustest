// Public, fire-and-forget analytics ingest.
// verify_jwt = false; auth is opportunistic (we tag user_id if a valid bearer is present).
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANON = Deno.env.get('SUPABASE_ANON_KEY')!;

// In-memory rate limiter (per-anon, 60/min). Best-effort; resets on cold start.
const buckets = new Map<string, { ts: number; count: number }>();
function rateLimited(key: string): boolean {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || now - b.ts > 60_000) {
    buckets.set(key, { ts: now, count: 1 });
    return false;
  }
  b.count += 1;
  return b.count > 60;
}

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function clipString(v: unknown, max: number): string | null {
  if (typeof v !== 'string') return null;
  return v.slice(0, max);
}

function safeJson(v: unknown, maxBytes = 4096): Record<string, unknown> {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return {};
  try {
    const s = JSON.stringify(v);
    if (s.length > maxBytes) return {};
    return v as Record<string, unknown>;
  } catch {
    return {};
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'invalid json' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const events = Array.isArray(body.events) ? body.events : [body];

  // Resolve user (best-effort)
  let userId: string | null = null;
  const auth = req.headers.get('Authorization');
  if (auth?.startsWith('Bearer ')) {
    try {
      const sb = createClient(SUPABASE_URL, ANON, {
        global: { headers: { Authorization: auth } },
      });
      const { data } = await sb.auth.getClaims(auth.replace('Bearer ', ''));
      userId = (data?.claims?.sub as string) ?? null;
    } catch { /* ignore */ }
  }

  // IP + country
  const ip =
    req.headers.get('cf-connecting-ip') ||
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    'unknown';
  const country = req.headers.get('cf-ipcountry') || null;

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
  const { data: saltRow } = await admin.rpc('current_analytics_salt');
  const salt = (saltRow as string) ?? 'fallback';
  const ipHash = ip === 'unknown' ? null : await sha256Hex(ip + '|' + salt);

  const rows: Record<string, unknown>[] = [];
  for (const raw of events) {
    if (!raw || typeof raw !== 'object') continue;
    const e = raw as Record<string, unknown>;
    const event = clipString(e.event, 64);
    if (!event) continue;

    const anonId = clipString(e.anon_id, 64);
    const limiterKey = userId ?? anonId ?? ip;
    if (rateLimited(limiterKey)) continue;

    rows.push({
      event,
      user_id: userId,
      anon_id: anonId,
      session_id: clipString(e.session_id, 64),
      path: clipString(e.path, 256),
      referrer: clipString(e.referrer, 512),
      device: clipString(e.device, 16),
      utm: safeJson(e.utm, 1024),
      props: safeJson(e.props, 4096),
      ip_hash: ipHash,
      country,
    });
  }

  if (rows.length === 0) {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const { error } = await admin.from('analytics_events').insert(rows);
  if (error) {
    console.error('analytics insert failed', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  return new Response(null, { status: 204, headers: corsHeaders });
});
