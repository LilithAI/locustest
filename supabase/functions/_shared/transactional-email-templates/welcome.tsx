/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Hr, Html, Link, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'Locus'

interface Props { siteUrl?: string }

const Welcome = ({ siteUrl = 'https://locus.legal' }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Welcome to Locus — your legal career, on merit.</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>Loc<span style={accent}>us</span></Text>
        <Section style={card}>
          <Text style={eyebrow}>Welcome aboard</Text>
          <Heading style={h1}>You're in.</Heading>
          <Text style={text}>
            {SITE_NAME} is built for law students who want a real shot — no connections required, no gatekeeping. Three quick wins to get started:
          </Text>
          <Text style={listItem}><strong>1.</strong> Complete your profile so firms can find you.</Text>
          <Text style={listItem}><strong>2.</strong> Browse open vacancies — fresh ones drop daily.</Text>
          <Text style={listItem}><strong>3.</strong> Sharpen your edge in The Bar — daily challenges, real points.</Text>
          <Button style={button} href={`${siteUrl}/dashboard`}>Open dashboard</Button>
          <Hr style={hr} />
          <Text style={footer}>
            Questions? Just reply to this email — it reaches a real person.
          </Text>
        </Section>
        <Text style={footerBrand}>Locus by LexRoot · {siteUrl}</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Welcome,
  subject: 'Welcome to Locus',
  displayName: 'Welcome email',
  stream: 'welcome',
  previewData: { siteUrl: 'https://locus.legal' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Inter, Helvetica, Arial, sans-serif', margin: '0', padding: '32px 16px' }
const container = { maxWidth: '560px', margin: '0 auto', padding: '0' }
const brand = { fontFamily: 'Sora, Helvetica, Arial, sans-serif', fontSize: '28px', fontWeight: 'bold' as const, color: '#0A0A0A', margin: '0 0 18px' }
const accent = { backgroundColor: '#FFE600', padding: '0 4px' }
const card = { backgroundColor: '#ffffff', border: '3px solid #0A0A0A', boxShadow: '6px 6px 0 #0A0A0A', padding: '30px 26px' }
const eyebrow = { fontFamily: 'Sora, Helvetica, Arial, sans-serif', fontSize: '11px', fontWeight: 'bold' as const, color: '#0A0A0A', letterSpacing: '0.14em', margin: '0 0 12px', textTransform: 'uppercase' as const }
const h1 = { fontFamily: 'Sora, Helvetica, Arial, sans-serif', fontSize: '28px', fontWeight: 'bold' as const, color: '#0A0A0A', lineHeight: '1.2', margin: '0 0 16px' }
const text = { fontSize: '15px', color: '#2B2B2B', lineHeight: '1.6', margin: '0 0 16px' }
const listItem = { fontSize: '15px', color: '#2B2B2B', lineHeight: '1.6', margin: '0 0 8px' }
const button = { backgroundColor: '#FFE600', color: '#0A0A0A', fontFamily: 'Sora, Helvetica, Arial, sans-serif', fontSize: '15px', fontWeight: 'bold' as const, padding: '14px 24px', textDecoration: 'none', border: '3px solid #0A0A0A', borderRadius: '0', display: 'inline-block', boxShadow: '4px 4px 0 #0A0A0A', marginTop: '16px' }
const hr = { border: 'none', borderTop: '2px solid #0A0A0A', margin: '24px 0 16px' }
const footer = { fontSize: '12px', color: '#666666', lineHeight: '1.5', margin: '0' }
const footerBrand = { fontFamily: 'Sora, Helvetica, Arial, sans-serif', fontSize: '11px', color: '#666666', textAlign: 'center' as const, letterSpacing: '0.08em', margin: '20px 0 0' }
