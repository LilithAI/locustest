/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Hr, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Vacancy { firm_name: string; role: string; location?: string; stipend?: string }
interface Props { vacancies?: Vacancy[]; siteUrl?: string }

const VacancyDigest = ({ vacancies = [], siteUrl = 'https://locus.legal' }: Props) => (
  <Html lang="en" dir="ltr">
    <Head /><Preview>{vacancies.length} fresh vacancies on Locus today</Preview>
    <Body style={main}><Container style={container}>
      <Text style={brand}>Loc<span style={accent}>us</span></Text>
      <Section style={card}>
        <Text style={eyebrow}>Daily digest</Text>
        <Heading style={h1}>{vacancies.length} new vacancies today.</Heading>
        {vacancies.slice(0, 10).map((v, i) => (
          <Section key={i} style={row}>
            <Text style={rowRole}>{v.role}</Text>
            <Text style={rowMeta}>{v.firm_name}{v.location ? ` · ${v.location}` : ''}{v.stipend ? ` · ${v.stipend}` : ''}</Text>
          </Section>
        ))}
        <Button style={button} href={`${siteUrl}/vacancies`}>View all vacancies</Button>
        <Hr style={hr} />
        <Text style={footer}>Daily 8am IST. Curated, never spammed.</Text>
      </Section>
    </Container></Body>
  </Html>
)

export const template = {
  component: VacancyDigest,
  subject: (d: Record<string, any>) => `${(d.vacancies?.length ?? 0)} new legal vacancies on Locus`,
  displayName: 'Vacancy daily digest',
  stream: 'vacancies',
  previewData: { vacancies: [{ firm_name: 'AZB', role: 'Litigation Intern', location: 'Mumbai', stipend: '₹15k' }] },
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
