/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Hr, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Props { sentCount?: number; awaitingCount?: number; siteUrl?: string }

const AppRecap = ({ sentCount = 0, awaitingCount = 0, siteUrl = 'https://locus.legal' }: Props) => (
  <Html lang="en" dir="ltr">
    <Head /><Preview>Your week on Locus: {sentCount} apps sent, {awaitingCount} awaiting reply</Preview>
    <Body style={main}><Container style={container}>
      <Text style={brand}>Loc<span style={accent}>us</span></Text>
      <Section style={card}>
        <Text style={eyebrow}>Sunday recap</Text>
        <Heading style={h1}>Your week, in numbers.</Heading>
        <Text style={stat}><strong style={statNum}>{sentCount}</strong> applications sent</Text>
        <Text style={stat}><strong style={statNum}>{awaitingCount}</strong> awaiting reply</Text>
        <Button style={button} href={`${siteUrl}/applications`}>Open tracker</Button>
        <Hr style={hr} />
        <Text style={footer}>Bumping a recruiter after 14 days quietly works. Try it.</Text>
      </Section>
    </Container></Body>
  </Html>
)

export const template = {
  component: AppRecap,
  subject: 'Your Locus week — application recap',
  displayName: 'Sunday application recap',
  stream: 'applications',
  previewData: { sentCount: 5, awaitingCount: 2 },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Inter, Helvetica, Arial, sans-serif', margin: '0', padding: '32px 16px' }
const container = { maxWidth: '560px', margin: '0 auto', padding: '0' }
const brand = { fontFamily: 'Sora, Helvetica, Arial, sans-serif', fontSize: '28px', fontWeight: 'bold' as const, color: '#0A0A0A', margin: '0 0 18px' }
const accent = { backgroundColor: '#FFE600', padding: '0 4px' }
const card = { backgroundColor: '#ffffff', border: '3px solid #0A0A0A', boxShadow: '6px 6px 0 #0A0A0A', padding: '30px 26px' }
const eyebrow = { fontFamily: 'Sora, Helvetica, Arial, sans-serif', fontSize: '11px', fontWeight: 'bold' as const, color: '#0A0A0A', letterSpacing: '0.14em', margin: '0 0 12px', textTransform: 'uppercase' as const }
const h1 = { fontFamily: 'Sora, Helvetica, Arial, sans-serif', fontSize: '26px', fontWeight: 'bold' as const, color: '#0A0A0A', lineHeight: '1.2', margin: '0 0 20px' }
const stat = { fontSize: '15px', color: '#2B2B2B', lineHeight: '1.4', margin: '0 0 8px' }
const statNum = { fontFamily: 'Sora, Helvetica, Arial, sans-serif', fontSize: '22px', color: '#0A0A0A', marginRight: '8px' }
const button = { backgroundColor: '#FFE600', color: '#0A0A0A', fontFamily: 'Sora, Helvetica, Arial, sans-serif', fontSize: '15px', fontWeight: 'bold' as const, padding: '14px 24px', textDecoration: 'none', border: '3px solid #0A0A0A', borderRadius: '0', display: 'inline-block', boxShadow: '4px 4px 0 #0A0A0A', marginTop: '12px' }
const hr = { border: 'none', borderTop: '2px solid #0A0A0A', margin: '24px 0 16px' }
const footer = { fontSize: '12px', color: '#666666', lineHeight: '1.5', margin: '0' }
