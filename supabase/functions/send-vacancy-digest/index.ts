// Daily 8am IST cron: emails subscribers a digest of new vacancies posted since last run.
import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, content-type' }

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const url = Deno.env.get('SUPABASE_URL')!
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(url, key)

  // 1. Pull all live, unnotified vacancies
  const { data: vacancies, error: vErr } = await supabase
    .from('vacancies')
    .select('id, firm_name, role, location, stipend, posted_at')
    .eq('status', 'live')
    .is('notified_at', null)
    .order('posted_at', { ascending: false })
    .limit(50)

  if (vErr) {
    console.error('vacancy fetch failed', vErr)
    return new Response(JSON.stringify({ error: vErr.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  if (!vacancies || vacancies.length === 0) {
    return new Response(JSON.stringify({ ok: true, sent: 0, reason: 'no_new_vacancies' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  // 2. Get all profile emails (everyone — they can opt out per stream)
  const { data: recipients, error: rErr } = await supabase
    .from('profiles')
    .select('id')
    .limit(10000)

  if (rErr || !recipients) {
    return new Response(JSON.stringify({ error: rErr?.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  // Fetch emails via auth admin (need service role)
  const { data: { users } = { users: [] } } = await supabase.auth.admin.listUsers({ perPage: 1000 }) as any
  const emails: { id: string; email: string }[] = (users || [])
    .filter((u: any) => u.email && !u.email.endsWith("@locus.internal"))
    .map((u: any) => ({ id: u.id, email: u.email }))

  let sent = 0
  for (const r of emails) {
    const idem = `vacancy-digest-${new Date().toISOString().slice(0, 10)}-${r.id}`
    const { error } = await supabase.functions.invoke('send-transactional-email', {
      body: {
        templateName: 'vacancy-digest',
        recipientEmail: r.email,
        idempotencyKey: idem,
        templateData: { vacancies: vacancies.slice(0, 10) },
      },
    })
    if (!error) sent++
  }

  // 3. Mark vacancies as notified
  const ids = vacancies.map(v => v.id)
  await supabase.from('vacancies').update({ notified_at: new Date().toISOString() }).in('id', ids)

  return new Response(JSON.stringify({ ok: true, sent, vacancyCount: vacancies.length }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
})
