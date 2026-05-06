// Cron: nudges users with incomplete profiles after 48 hours, once.
import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, content-type' }

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const url = Deno.env.get('SUPABASE_URL')!
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(url, key)

  // Find profiles created 48h+ ago that are incomplete (no college OR no cv OR no subjects)
  const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()

  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, college, cv_url, subjects_of_interest, created_at')
    .lte('created_at', cutoff)
    .limit(500)

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  const incomplete = (profiles || []).filter(p =>
    !p.college || !p.cv_url || !p.subjects_of_interest?.length
  )

  // Get already-nudged user_ids from notification_log
  const { data: alreadyNudged } = await supabase
    .from('notification_log')
    .select('user_id')
    .eq('stream', 'nudges')
    .eq('entity_id', 'profile-completion')

  const nudgedSet = new Set((alreadyNudged || []).map(n => n.user_id))
  const targets = incomplete.filter(p => !nudgedSet.has(p.id))

  // Map to emails
  const { data: { users } = { users: [] } } = await supabase.auth.admin.listUsers({ perPage: 1000 }) as any
  const emailMap = new Map<string, string>((users || []).map((u: any) => [u.id, u.email]).filter(([, e]: [string, string]) => !!e && !e.endsWith("@locus.internal")))

  let sent = 0
  for (const p of targets) {
    const email = emailMap.get(p.id)
    if (!email) continue
    const { error: invErr } = await supabase.functions.invoke('send-transactional-email', {
      body: {
        templateName: 'profile-nudge',
        recipientEmail: email,
        idempotencyKey: `profile-nudge-${p.id}`,
      },
    })
    if (!invErr) {
      sent++
      await supabase.from('notification_log').insert({
        user_id: p.id, recipient_email: email, stream: 'nudges', entity_id: 'profile-completion',
      })
    }
  }

  return new Response(JSON.stringify({ ok: true, sent, candidates: targets.length }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
})
