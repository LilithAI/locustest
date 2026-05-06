/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Hr, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Props {
  firmName?: string
  role?: string
  location?: string
  stipend?: string
  opportunityType?: string
  siteUrl?: string
}

const VacancyInstant = ({
  firmName = 'A firm',
  role = 'Legal Intern',
  location,
  stipend,
  opportunityType,
  siteUrl = 'https://locus.legal',
}: Props) => {
  const meta = [location, stipend, opportunityType].filter(Boolean).join(' · ')
  return (
    <Html lang="en" dir="ltr">
      <Head /><Preview>{role} at {firmName} — just posted on Locus</Preview>
      <Body style={main}><Container style={container}>
        <Text style={brand}>Loc<span style={accent}>us</span></Text>
        <Section style={card}>
          <Text style={eyebrow}>New vacancy · just posted</Text>
          <Heading style={h1}>{role}</Heading>
          <Text style={firm}>{firmName}</Text>
          {meta ? <Text style={metaText}>{meta}</Text> : null}
          <Button style={button} href={`${siteUrl}/vacancies`}>View & apply</Button>
          <Hr style={hr} />
          <Text style={footer}>You get these the moment a vacancy goes live. Curated, never spammed.</Text>
        </Section>
      </Container></Body>
    </Html>
  )
}

export const template = {
  component: VacancyInstant,
  subject: (d: Record<string, any>) => `New vacancy: ${d.role ?? 'role'} at ${d.firmName ?? 'a firm'}`,
  displayName: 'Vacancy instant alert',
  stream: 'vacancies',
  previewData: { firmName: 'AZB & Partners', role: 'Litigation Intern', location: 'Mumbai', stipend: '₹15k', opportunityType: 'internship' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Inter, Helvetica, Arial, sans-serif', margin: '0', padding: '32px 16px' }
const container = { maxWidth: '560px', margin: '0 auto', padding: '0' }
const brand = { fontFamily: 'Sora, Helvetica, Arial, sans-serif', fontSize: '28px', fontWeight: 'bold' as const, color: '#0A0A0A', margin: '0 0 18px' }
const accent = { backgroundColor: '#FFE600', padding: '0 4px' }
const card = { backgroundColor: '#ffffff', border: '3px solid #0A0A0A', boxShadow: '6px 6px 0 #0A0A0A', padding: '30px 26px' }
const eyebrow = { fontFamily: 'Sora, Helvetica, Arial, sans-serif', fontSize: '11px', fontWeight: 'bold' as const, color: '#0A0A0A', letterSpacing: '0.14em', margin: '0 0 12px', textTransform: 'uppercase' as const }
const h1 = { fontFamily: 'Sora, Helvetica, Arial, sans-serif', fontSize: '24px', fontWeight: 'bold' as const, color: '#0A0A0A', lineHeight: '1.2', margin: '0 0 6px' }
const firm = { fontFamily: 'Sora, Helvetica, Arial, sans-serif', fontSize: '16px', fontWeight: 'bold' as const, color: '#0A0A0A', margin: '0 0 8px' }
const metaText = { fontSize: '14px', color: '#555555', margin: '0 0 12px' }
const button = { backgroundColor: '#FFE600', color: '#0A0A0A', fontFamily: 'Sora, Helvetica, Arial, sans-serif', fontSize: '15px', fontWeight: 'bold' as const, padding: '14px 24px', textDecoration: 'none', border: '3px solid #0A0A0A', borderRadius: '0', display: 'inline-block', boxShadow: '4px 4px 0 #0A0A0A', marginTop: '20px' }
const hr = { border: 'none', borderTop: '2px solid #0A0A0A', margin: '24px 0 16px' }
const footer = { fontSize: '12px', color: '#666666', lineHeight: '1.5', margin: '0' }
