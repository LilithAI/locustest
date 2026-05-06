// Daily 8am IST cron: emails subscribers a digest of newly approved Bar challenges.
import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, content-type' }

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const url = Deno.env.get('SUPABASE_URL')!
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(url, key)

  const { data: challenges, error: cErr } = await supabase
    .from('bar_challenges')
    .select('id, title, area_of_law, difficulty, approved_at')
    .eq('status', 'approved')
    .is('notified_at', null)
    .order('approved_at', { ascending: false })
    .limit(50)

  if (cErr) return new Response(JSON.stringify({ error: cErr.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  if (!challenges || challenges.length === 0) {
    return new Response(JSON.stringify({ ok: true, sent: 0, reason: 'no_new_challenges' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  const { data: { users } = { users: [] } } = await supabase.auth.admin.listUsers({ perPage: 1000 }) as any
  const emails: { id: string; email: string }[] = (users || []).filter((u: any) => u.email && !u.email.endsWith("@locus.internal")).map((u: any) => ({ id: u.id, email: u.email }))

  let sent = 0
  for (const r of emails) {
    const idem = `bar-digest-${new Date().toISOString().slice(0, 10)}-${r.id}`
    const { error } = await supabase.functions.invoke('send-transactional-email', {
      body: {
        templateName: 'bar-digest',
        recipientEmail: r.email,
        idempotencyKey: idem,
        templateData: { challenges: challenges.slice(0, 10) },
      },
    })
    if (!error) sent++
  }

  const ids = challenges.map(c => c.id)
  await supabase.from('bar_challenges').update({ notified_at: new Date().toISOString() }).in('id', ids)

  return new Response(JSON.stringify({ ok: true, sent, challengeCount: challenges.length }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
})
