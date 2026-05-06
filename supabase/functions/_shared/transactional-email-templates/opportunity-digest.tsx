/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Hr, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Item { title: string; subtitle?: string; meta?: string }
interface Props {
  stream: 'cfp' | 'moot' | 'competition'
  items?: Item[]
  siteUrl?: string
}

const STREAM_COPY: Record<Props['stream'], { eyebrow: string; subject: (n: number) => string; cta: string; preview: (n: number) => string }> = {
  cfp: {
    eyebrow: 'New calls for papers',
    subject: (n) => `${n} new calls for papers on Locus`,
    cta: 'View all CFPs',
    preview: (n) => `${n} fresh CFPs curated for you`,
  },
  moot: {
    eyebrow: 'New moots & advocacy comps',
    subject: (n) => `${n} new moots on Locus`,
    cta: 'View all moots',
    preview: (n) => `${n} fresh moot competitions curated for you`,
  },
  competition: {
    eyebrow: 'New competitions',
    subject: (n) => `${n} new legal competitions on Locus`,
    cta: 'View all competitions',
    preview: (n) => `${n} fresh competitions curated for you`,
  },
}

const OpportunityDigest = ({ stream = 'cfp', items = [], siteUrl = 'https://locus.legal' }: Props) => {
  const copy = STREAM_COPY[stream]
  return (
    <Html lang="en" dir="ltr">
      <Head /><Preview>{copy.preview(items.length)}</Preview>
      <Body style={main}><Container style={container}>
        <Text style={brand}>Loc<span style={accent}>us</span></Text>
        <Section style={card}>
          <Text style={eyebrow}>{copy.eyebrow}</Text>
          <Heading style={h1}>{items.length} new {stream === 'cfp' ? 'CFPs' : stream === 'moot' ? 'moots' : 'competitions'} today.</Heading>
          {items.slice(0, 10).map((it, i) => (
            <Section key={i} style={row}>
              <Text style={rowRole}>{it.title}</Text>
              {(it.subtitle || it.meta) && (
                <Text style={rowMeta}>
                  {it.subtitle ?? ''}{it.subtitle && it.meta ? ' · ' : ''}{it.meta ?? ''}
                </Text>
              )}
            </Section>
          ))}
          <Button style={button} href={`${siteUrl}/opportunities`}>{copy.cta}</Button>
          <Hr style={hr} />
          <Text style={footer}>Curated daily. Never spammed.</Text>
        </Section>
      </Container></Body>
    </Html>
  )
}

export const template = {
  component: OpportunityDigest,
  subject: (d: Record<string, any>) => {
    const stream = (d.stream ?? 'cfp') as Props['stream']
    return STREAM_COPY[stream].subject(d.items?.length ?? 0)
  },
  displayName: 'Opportunity daily digest',
  stream: 'opportunities',
  previewData: { stream: 'cfp', items: [{ title: 'NLSIR Vol. 38', subtitle: 'NLS Bangalore', meta: 'Peer-reviewed · 8000 words' }] },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Inter, Helvetica, Arial, sans-serif', margin: '0', padding: '32px 16px' }
const container = { maxWidth: '560px', margin: '0 auto', padding: '0' }
const brand = { fontFamily: 'Sora, Helvetica, Arial, sans-serif', fontSize: '28px', fontWeight: 'bold' as const, color: '#0A0A0A', margin: '0 0 18px' }
const accent = { backgroundColor: '#FFE600', padding: '0 4px' }
const card = { backgroundColor: '#ffffff', border: '3px solid #0A0A0A', boxShadow: '6px 6px 0 #0A0A0A', padding: '30px 26px' }
const eyebrow = { fontFamily: 'Sora, Helvetica, Arial, sans-serif', fontSize: '11px', fontWeight: 'bold' as const, color: '#0A0A0A', letterSpacing: '0.14em', margin: '0 0 12px', textTransform: 'uppercase' as const }
const h1 = { fontFamily: 'Sora, Helvetica, Arial, sans-serif', fontSize: '24px', fontWeight: 'bold' as const, color: '#0A0A0A', lineHeight: '1.2', margin: '0 0 16px' }
const row = { padding: '12px 0', borderBottom: '1px solid #E5E5E5' }
const rowRole = { fontFamily: 'Sora, Helvetica, Arial, sans-serif', fontSize: '15px', fontWeight: 'bold' as const, color: '#0A0A0A', margin: '0 0 4px' }
const rowMeta = { fontSize: '13px', color: '#666666', margin: '0' }
const button = { backgroundColor: '#FFE600', color: '#0A0A0A', fontFamily: 'Sora, Helvetica, Arial, sans-serif', fontSize: '15px', fontWeight: 'bold' as const, padding: '14px 24px', textDecoration: 'none', border: '3px solid #0A0A0A', borderRadius: '0', display: 'inline-block', boxShadow: '4px 4px 0 #0A0A0A', marginTop: '20px' }
const hr = { border: 'none', borderTop: '2px solid #0A0A0A', margin: '24px 0 16px' }
const footer = { fontSize: '12px', color: '#666666', lineHeight: '1.5', margin: '0' }
