// Sunday cron: weekly application recap for active users.
import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, content-type' }

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const url = Deno.env.get('SUPABASE_URL')!
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(url, key)

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  // Fetch all applications from last 7 days
  const { data: apps, error } = await supabase
    .from('profile_applications')
    .select('user_id, status, applied_on, created_at, status_updated_at')
    .gte('created_at', weekAgo)

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  // Group per user
  const grouped = new Map<string, { sent: number; awaiting: number }>()
  for (const a of apps || []) {
    const g = grouped.get(a.user_id) || { sent: 0, awaiting: 0 }
    g.sent++
    if (a.status === 'sent') g.awaiting++
    grouped.set(a.user_id, g)
  }

  if (grouped.size === 0) {
    return new Response(JSON.stringify({ ok: true, sent: 0, reason: 'no_active_users' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  const { data: { users } = { users: [] } } = await supabase.auth.admin.listUsers({ perPage: 1000 }) as any
  const emailMap = new Map<string, string>((users || []).map((u: any) => [u.id, u.email]).filter(([, e]: [string, string]) => !!e && !e.endsWith("@locus.internal")))

  const week = new Date().toISOString().slice(0, 10)
  let sent = 0
  for (const [userId, stats] of grouped.entries()) {
    const email = emailMap.get(userId)
    if (!email) continue
    const { error: invErr } = await supabase.functions.invoke('send-transactional-email', {
      body: {
        templateName: 'app-recap',
        recipientEmail: email,
        idempotencyKey: `app-recap-${userId}-${week}`,
        templateData: { sentCount: stats.sent, awaitingCount: stats.awaiting },
      },
    })
    if (!invErr) sent++
  }

  return new Response(JSON.stringify({ ok: true, sent, candidates: grouped.size }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
})
