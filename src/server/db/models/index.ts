export * from '@/server/db/models/org'
export * from '@/server/db/models/leads'
export * from '@/server/db/models/system'
export * from '@/server/db/models/quotations'
export * from '@/server/db/models/erasures'
export * from '@/server/db/models/work'

import { Attendance, Department, Session, Team, User } from '@/server/db/models/org'
import { Activity, Contact, ContactAttempt, FollowUp, Lead, LeadAssignment, Visit } from '@/server/db/models/leads'
import { Quotation } from '@/server/db/models/quotations'
import { Erasure } from '@/server/db/models/erasures'
import { Instruction, JobRole } from '@/server/db/models/work'
import {
  AuditLog,
  Counter,
  DocumentFile,
  IngestEvent,
  Job,
  Lock,
  RateLimit,
  SheetRow,
  Message,
  Notification,
  PushSubscription,
  Setting,
  WhatsAppNumber,
} from '@/server/db/models/system'

/** Every model — used by index sync and tests. */
export const ALL_MODELS = [
  Department,
  Team,
  User,
  Attendance,
  Session,
  Visit,
  Contact,
  Lead,
  LeadAssignment,
  Quotation,
  Erasure,
  JobRole,
  Instruction,
  ContactAttempt,
  FollowUp,
  Activity,
  AuditLog,
  Job,
  Lock,
  RateLimit,
  SheetRow,
  Notification,
  PushSubscription,
  DocumentFile,
  WhatsAppNumber,
  Message,
  Setting,
  IngestEvent,
  Counter,
] as const
