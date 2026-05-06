/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'

export interface TemplateEntry {
  component: React.ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  to?: string
  displayName?: string
  previewData?: Record<string, any>
  stream?: string
}

import { template as welcome } from './welcome.tsx'
import { template as profileNudge } from './profile-nudge.tsx'
import { template as appStatus } from './app-status.tsx'
import { template as vacancyDigest } from './vacancy-digest.tsx'
import { template as vacancyInstant } from './vacancy-instant.tsx'
import { template as barDigest } from './bar-digest.tsx'
import { template as broadcast } from './broadcast.tsx'
import { template as appRecap } from './app-recap.tsx'
import { template as opportunityDigest } from './opportunity-digest.tsx'

export const TEMPLATES: Record<string, TemplateEntry> = {
  'welcome': welcome,
  'profile-nudge': profileNudge,
  'app-status': appStatus,
  'vacancy-digest': vacancyDigest,
  'vacancy-instant': vacancyInstant,
  'bar-digest': barDigest,
  'broadcast': broadcast,
  'app-recap': appRecap,
  'opportunity-digest': opportunityDigest,
}
