/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface EmailChangeEmailProps {
  siteName: string
  oldEmail: string
  email: string
  newEmail: string
  confirmationUrl: string
}

export const EmailChangeEmail = ({ siteName, oldEmail, newEmail, confirmationUrl }: EmailChangeEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Confirm your new email for {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>Locus</Text>
        <Section style={card}>
          <Text style={eyebrow}>Email change</Text>
          <Heading style={h1}>Confirm new address</Heading>
          <Text style={text}>
            You requested to change the email on your {siteName} account from{' '}
            <Link href={`mailto:${oldEmail}`} style={fallbackLink}>{oldEmail}</Link>{' '}
            to{' '}
            <Link href={`mailto:${newEmail}`} style={fallbackLink}>{newEmail}</Link>.
          </Text>
          <Button style={button} href={confirmationUrl}>Confirm change</Button>
          <Text style={fallbackLabel}>Or paste this link into your browser:</Text>
          <Link href={confirmationUrl} style={fallbackLink}>{confirmationUrl}</Link>
          <Hr style={hr} />
          <Text style={footer}>
            Didn&apos;t request this change? Secure your account by resetting your password.
          </Text>
        </Section>
        <Text style={footerBrand}>Locus by LexRoot · locus.legal</Text>
      </Container>
    </Body>
  </Html>
)

export default EmailChangeEmail

const main = { backgroundColor: '#ffffff', fontFamily: 'Inter, Helvetica, Arial, sans-serif', margin: '0', padding: '32px 16px' }
const container = { maxWidth: '560px', margin: '0 auto', padding: '0' }
const brand = { fontFamily: 'Sora, Helvetica, Arial, sans-serif', fontSize: '28px', fontWeight: 'bold' as const, color: '#0A0A0A', margin: '0 0 18px' }
const card = { backgroundColor: '#ffffff', border: '3px solid #0A0A0A', boxShadow: '6px 6px 0 #0A0A0A', padding: '30px 26px' }
const eyebrow = { fontFamily: 'Sora, Helvetica, Arial, sans-serif', fontSize: '11px', fontWeight: 'bold' as const, color: '#0A0A0A', letterSpacing: '0.14em', margin: '0 0 12px', textTransform: 'uppercase' as const }
const h1 = { fontFamily: 'Sora, Helvetica, Arial, sans-serif', fontSize: '26px', fontWeight: 'bold' as const, color: '#0A0A0A', lineHeight: '1.2', margin: '0 0 16px' }
const text = { fontSize: '15px', color: '#2B2B2B', lineHeight: '1.6', margin: '0 0 22px' }
const button = { backgroundColor: '#FFE600', color: '#0A0A0A', fontFamily: 'Sora, Helvetica, Arial, sans-serif', fontSize: '15px', fontWeight: 'bold' as const, padding: '14px 24px', textDecoration: 'none', border: '3px solid #0A0A0A', borderRadius: '0', display: 'inline-block', boxShadow: '4px 4px 0 #0A0A0A' }
const fallbackLabel = { fontSize: '12px', color: '#666666', margin: '22px 0 6px' }
const fallbackLink = { fontSize: '12px', color: '#0A0A0A', textDecoration: 'underline', wordBreak: 'break-all' as const }
const hr = { border: 'none', borderTop: '2px solid #0A0A0A', margin: '24px 0 16px' }
const footer = { fontSize: '12px', color: '#666666', lineHeight: '1.5', margin: '0' }
const footerBrand = { fontFamily: 'Sora, Helvetica, Arial, sans-serif', fontSize: '11px', color: '#666666', textAlign: 'center' as const, letterSpacing: '0.08em', margin: '20px 0 0' }
