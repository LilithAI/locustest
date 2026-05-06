/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Hr, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Props { firmName?: string; role?: string; status?: string; siteUrl?: string }

const STATUS_COPY: Record<string, { eyebrow: string; headline: string; body: string }> = {
  interview_scheduled: { eyebrow: 'Status update', headline: 'Interview scheduled.', body: 'Time to prep. Open the application to log notes and next steps.' },
  interviewed: { eyebrow: 'Status update', headline: 'Interview done.', body: 'Mark how it went so we can nudge you on follow-up timing.' },
  offer: { eyebrow: 'Big news', headline: 'Offer received.', body: 'Congratulations. Mark it as accepted or declined when you know.' },
  rejected: { eyebrow: 'Status update', headline: 'Closed out — onto the next.', body: "We've logged this one. Your tracker still has live leads waiting." },
  accepted: { eyebrow: 'Locked in', headline: 'Offer accepted.', body: "We've updated your tracker. Best of luck." },
  acknowledged: { eyebrow: 'Status update', headline: 'They acknowledged.', body: 'A reply landed in your inbox. Keep the thread warm.' },
}

const AppStatus = ({ firmName = 'a firm', role = 'a role', status = 'interview_scheduled', siteUrl = 'https://locus.legal' }: Props) => {
  const copy = STATUS_COPY[status] ?? STATUS_COPY.interview_scheduled
  return (
    <Html lang="en" dir="ltr">
      <Head /><Preview>{copy.headline}</Preview>
      <Body style={main}><Container style={container}>
        <Text style={brand}>Loc<span style={accent}>us</span></Text>
        <Section style={card}>
          <Text style={eyebrow}>{copy.eyebrow}</Text>
          <Heading style={h1}>{copy.headline}</Heading>
          <Text style={text}><strong>{role}</strong> at <strong>{firmName}</strong></Text>
          <Text style={text}>{copy.body}</Text>
          <Button style={button} href={`${siteUrl}/applications`}>Open tracker</Button>
          <Hr style={hr} />
          <Text style={footer}>Sent because you logged this application on Locus.</Text>
        </Section>
      </Container></Body>
    </Html>
  )
}

export const template = {
  component: AppStatus,
  subject: (d: Record<string, any>) => `Application update: ${d.role ?? 'role'} at ${d.firmName ?? 'firm'}`,
  displayName: 'Application status update',
  stream: 'applications',
  previewData: { firmName: 'AZB & Partners', role: 'Litigation Intern', status: 'interviewing' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Inter, Helvetica, Arial, sans-serif', margin: '0', padding: '32px 16px' }
const container = { maxWidth: '560px', margin: '0 auto', padding: '0' }
const brand = { fontFamily: 'Sora, Helvetica, Arial, sans-serif', fontSize: '28px', fontWeight: 'bold' as const, color: '#0A0A0A', margin: '0 0 18px' }
const accent = { backgroundColor: '#FFE600', padding: '0 4px' }
const card = { backgroundColor: '#ffffff', border: '3px solid #0A0A0A', boxShadow: '6px 6px 0 #0A0A0A', padding: '30px 26px' }
const eyebrow = { fontFamily: 'Sora, Helvetica, Arial, sans-serif', fontSize: '11px', fontWeight: 'bold' as const, color: '#0A0A0A', letterSpacing: '0.14em', margin: '0 0 12px', textTransform: 'uppercase' as const }
const h1 = { fontFamily: 'Sora, Helvetica, Arial, sans-serif', fontSize: '26px', fontWeight: 'bold' as const, color: '#0A0A0A', lineHeight: '1.2', margin: '0 0 16px' }
const text = { fontSize: '15px', color: '#2B2B2B', lineHeight: '1.6', margin: '0 0 16px' }
const button = { backgroundColor: '#FFE600', color: '#0A0A0A', fontFamily: 'Sora, Helvetica, Arial, sans-serif', fontSize: '15px', fontWeight: 'bold' as const, padding: '14px 24px', textDecoration: 'none', border: '3px solid #0A0A0A', borderRadius: '0', display: 'inline-block', boxShadow: '4px 4px 0 #0A0A0A' }
const hr = { border: 'none', borderTop: '2px solid #0A0A0A', margin: '24px 0 16px' }
const footer = { fontSize: '12px', color: '#666666', lineHeight: '1.5', margin: '0' }
