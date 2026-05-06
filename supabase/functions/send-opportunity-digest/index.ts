// Daily digest for CFPs / Moots / Competitions.
// Invoke via POST { stream: "cfp" | "moot" | "competition" }
import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
}

type Stream = 'cfp' | 'moot' | 'competition'
const TABLES: Record<Stream, string> = { cfp: 'cfps', moot: 'moots', competition: 'competitions' }

function shapeItem(stream: Stream, r: Record<string, any>): { title: string; subtitle?: string; meta?: string } {
  if (stream === 'cfp') {
    const wl = r.word_limit_min || r.word_limit_max ? `${r.word_limit_min ?? '—'}–${r.word_limit_max ?? '—'} words` : null
    return {
      title: r.publication_name,
      subtitle: r.publication_type,
      meta: [r.peer_reviewed ? 'Peer-reviewed' : null, wl, r.theme].filter(Boolean).join(' · ') || undefined,
    }
  }
  if (stream === 'moot') {
    return {
      title: r.competition_name,
      subtitle: r.organiser,
      meta: [r.mode, r.venue, r.prize_pool].filter(Boolean).join(' · ') || undefined,
    }
  }
  return {
    title: r.title,
    subtitle: r.organiser,
    meta: [r.category, r.mode, r.prize_or_stipend].filter(Boolean).join(' · ') || undefined,
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const url = Deno.env.get('SUPABASE_URL')!
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(url, key)

  let stream: Stream = 'cfp'
  try {
    const body = await req.json().catch(() => ({}))
    if (body?.stream && ['cfp', 'moot', 'competition'].includes(body.stream)) stream = body.stream
  } catch { /* default */ }

  const table = TABLES[stream]
  const { data: rows, error } = await supabase
    .from(table)
    .select('*')
    .eq('status', 'live')
    .is('notified_at', null)
    .order('posted_at', { ascending: false })
    .limit(50)

  if (error) {
    console.error(`${table} fetch failed`, error)
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
  if (!rows || rows.length === 0) {
    return new Response(JSON.stringify({ ok: true, sent: 0, reason: 'nothing_new' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  const items = rows.map((r) => shapeItem(stream, r))

  const { data: { users } = { users: [] } } = await supabase.auth.admin.listUsers({ perPage: 1000 }) as any
  const recipients: { id: string; email: string }[] = (users || [])
    .filter((u: any) => u.email && !u.email.endsWith('@locus.internal'))
    .map((u: any) => ({ id: u.id, email: u.email }))

  let sent = 0
  for (const r of recipients) {
    const idem = `${stream}-digest-${new Date().toISOString().slice(0, 10)}-${r.id}`
    const { error: invErr } = await supabase.functions.invoke('send-transactional-email', {
      body: {
        templateName: 'opportunity-digest',
        recipientEmail: r.email,
        idempotencyKey: idem,
        templateData: { stream, items: items.slice(0, 10) },
      },
    })
    if (!invErr) sent++
  }

  await supabase.from(table).update({ notified_at: new Date().toISOString() }).in('id', rows.map((r: any) => r.id))

  return new Response(JSON.stringify({ ok: true, stream, sent, count: rows.length }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
})
