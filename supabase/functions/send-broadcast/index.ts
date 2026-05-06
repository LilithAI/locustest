// Admin broadcast: send a markdown-rendered email to a chosen audience segment.
import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Tiny safe markdown→HTML (paragraphs, bold, italic, links, line breaks)
function mdToHtml(md: string): string {
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const blocks = md.trim().split(/\n{2,}/)
  return blocks.map(b => {
    let html = esc(b)
    html = html.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" style="color:#0A0A0A;text-decoration:underline">$1</a>')
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>')
    html = html.replace(/\n/g, '<br/>')
    return `<p style="margin:0 0 14px">${html}</p>`
  }).join('')
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const url = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  // Auth: caller must be admin
  const authHeader = req.headers.get('authorization') || ''
  const userClient = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } },
  })
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  const supabase = createClient(url, serviceKey)
  const { data: scopeOk } = await supabase.rpc('has_admin_scope', { uid: user.id, scope: 'broadcast_admin' })
  if (!scopeOk) {
    return new Response(JSON.stringify({ error: 'forbidden' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  const body = await req.json().catch(() => ({}))
  const { subject, bodyMarkdown, ctaLabel, ctaUrl, segment, broadcastId, testOnly } = body as {
    subject?: string; bodyMarkdown?: string; ctaLabel?: string; ctaUrl?: string;
    segment?: 'all' | 'beta' | 'applicants'; broadcastId?: string; testOnly?: boolean;
  }

  if (!subject || !bodyMarkdown) {
    return new Response(JSON.stringify({ error: 'subject_and_body_required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  const id = broadcastId || crypto.randomUUID()
  const bodyHtml = mdToHtml(bodyMarkdown)

  // ============ TEST-ONLY: send a single preview to the calling admin ============
  if (testOnly) {
    const adminEmail = user.email
    if (!adminEmail) {
      return new Response(JSON.stringify({ error: 'admin_email_missing' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
    const { error } = await supabase.functions.invoke('send-transactional-email', {
      body: {
        templateName: 'broadcast',
        recipientEmail: adminEmail,
        idempotencyKey: `broadcast-test-${crypto.randomUUID()}`,
        templateData: { subject: `[TEST] ${subject}`, bodyHtml, ctaLabel, ctaUrl },
      },
    })
    if (error) {
      return new Response(JSON.stringify({ error: 'test_send_failed', detail: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
    return new Response(JSON.stringify({ ok: true, test: true, sentTo: adminEmail }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  // ============ Build recipient userId list per segment ============
  let userIds: string[] = []
  if (segment === 'beta') {
    const { data } = await supabase.from('beta_testers').select('user_id').not('user_id', 'is', null)
    userIds = (data || []).map((r: any) => r.user_id).filter(Boolean)
  } else if (segment === 'applicants') {
    const { data } = await supabase.from('profiles').select('id').gt('applications_count', 0).limit(10000)
    userIds = (data || []).map((p: any) => p.id)
  } else {
    const { data } = await supabase.from('profiles').select('id').limit(10000)
    userIds = (data || []).map((p: any) => p.id)
  }

  // ============ Page through ALL auth users to build email map ============
  const emailMap = new Map<string, string>()
  const perPage = 1000
  let page = 1
  let safety = 0
  while (safety < 50) {
    safety++
    const res: any = await supabase.auth.admin.listUsers({ page, perPage })
    if (res.error) {
      console.error('listUsers error', res.error)
      return new Response(JSON.stringify({ error: 'recipient_lookup_failed', detail: res.error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
    const users = res.data?.users ?? []
    for (const u of users) {
      if (u?.email && !u.email.endsWith('@locus.internal')) {
        emailMap.set(u.id, u.email)
      }
    }
    if (users.length < perPage) break
    page++
  }

  console.log(`[send-broadcast] segment=${segment} userIds=${userIds.length} emailMap=${emailMap.size}`)

  if (userIds.length > 0 && emailMap.size === 0) {
    return new Response(JSON.stringify({ error: 'recipient_lookup_failed', detail: 'No emails resolved from auth users' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  let queued = 0
  let failed = 0
  let skippedNoEmail = 0
  let firstError: string | null = null
  for (const uid of userIds) {
    const email = emailMap.get(uid)
    if (!email) { skippedNoEmail++; continue }
    const { error } = await supabase.functions.invoke('send-transactional-email', {
      body: {
        templateName: 'broadcast',
        recipientEmail: email,
        idempotencyKey: `broadcast-${id}-${uid}`,
        templateData: { subject, bodyHtml, ctaLabel, ctaUrl },
      },
    })
    if (!error) {
      queued++
    } else {
      failed++
      if (!firstError) firstError = error.message || String(error)
    }
  }

  console.log(`[send-broadcast] queued=${queued} failed=${failed} skippedNoEmail=${skippedNoEmail} firstError=${firstError}`)

  // If everything failed, surface the downstream error
  if (queued === 0 && failed > 0) {
    return new Response(JSON.stringify({
      error: 'all_sends_failed', detail: firstError, failed, skippedNoEmail,
    }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  // Only log to history when we actually queued at least one send
  if (queued > 0) {
    await supabase.from('update_broadcasts').insert({
      id, subject, body_markdown: bodyMarkdown, body_html: bodyHtml,
      cta_label: ctaLabel, cta_url: ctaUrl, status: 'sent',
      sent_at: new Date().toISOString(), recipient_count: queued,
      created_by: user.id, sent_by: user.id,
    })
  }

  return new Response(JSON.stringify({ ok: true, queued, failed, skippedNoEmail, broadcastId: id, firstError }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
})
