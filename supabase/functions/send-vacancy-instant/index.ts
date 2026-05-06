// Triggered immediately when a vacancy goes live. Fans out one email per profile.
import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const url = Deno.env.get('SUPABASE_URL')!
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(url, key)

  let vacancyId: string | undefined
  try {
    const body = await req.json()
    vacancyId = body.vacancyId || body.vacancy_id
  } catch {
    return new Response(JSON.stringify({ error: 'invalid_json' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
  if (!vacancyId) {
    return new Response(JSON.stringify({ error: 'vacancyId_required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  // 1. Load the vacancy. Must be live + unnotified, else no-op.
  const { data: v, error: vErr } = await supabase
    .from('vacancies')
    .select('id, firm_name, role, location, stipend, opportunity_type, status, notified_at')
    .eq('id', vacancyId)
    .maybeSingle()

  if (vErr) {
    console.error('vacancy lookup failed', vErr)
    return new Response(JSON.stringify({ error: vErr.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
  if (!v) {
    return new Response(JSON.stringify({ ok: true, skipped: 'not_found' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
  if (v.status !== 'live') {
    return new Response(JSON.stringify({ ok: true, skipped: 'not_live', status: v.status }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
  if (v.notified_at) {
    return new Response(JSON.stringify({ ok: true, skipped: 'already_notified' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  // 2. Fetch recipients via auth admin, exclude @locus.internal
  const { data: usersResp, error: uErr } = await supabase.auth.admin.listUsers({ perPage: 1000 }) as any
  if (uErr) {
    console.error('listUsers failed', uErr)
    return new Response(JSON.stringify({ error: uErr.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
  const recipients: { id: string; email: string }[] = (usersResp?.users || [])
    .filter((u: any) => u.email && !u.email.endsWith('@locus.internal'))
    .map((u: any) => ({ id: u.id, email: u.email }))

  let enqueued = 0
  let failed = 0
  for (const r of recipients) {
    const idem = `vacancy-instant-${v.id}-${r.id}`
    const { error } = await supabase.functions.invoke('send-transactional-email', {
      body: {
        templateName: 'vacancy-instant',
        recipientEmail: r.email,
        idempotencyKey: idem,
        templateData: {
          firmName: v.firm_name,
          role: v.role,
          location: v.location,
          stipend: v.stipend,
          opportunityType: v.opportunity_type,
          siteUrl: 'https://locus.legal',
        },
      },
    })
    if (error) {
      failed++
      console.error('invoke send-transactional-email failed', { recipient: r.email, vacancyId: v.id, error })
    } else {
      enqueued++
    }
  }

  // 3. Mark notified ONLY if at least one enqueue succeeded — otherwise leave for retry.
  if (enqueued > 0) {
    const { error: updErr } = await supabase
      .from('vacancies')
      .update({ notified_at: new Date().toISOString() })
      .eq('id', v.id)
    if (updErr) console.error('failed to mark notified_at', updErr)
  }

  return new Response(
    JSON.stringify({ ok: true, vacancyId: v.id, recipients: recipients.length, enqueued, failed }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  )
})
