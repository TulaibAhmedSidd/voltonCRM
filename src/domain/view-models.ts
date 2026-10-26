/**
 * UI-facing data shapes. Services map Mongoose documents to these; components only ever receive these
 * (plain, serialisable — dates are ISO strings). Keeps components independent of the database.
 */
import type {
  AdPlatform,
  AssignmentState,
  AttemptChannel,
  AttendanceStatus,
  CallResult,
  CustomerResponse,
  Department,
  FollowUpStatus,
  KpiKey,
  LeadChannel,
  LeadStatus,
  MessageDirection,
  MessageSender,
  MessageStatus,
  ProofFlag,
  ProofStatus,
  ReviewStatus,
  Role,
  Stage,
} from '@/domain/constants'

export interface AgentRef {
  id: string
  name: string
}

export interface LeadSummary {
  id: string
  leadNo: string
  name: string
  /** E.164 */
  phone: string
  /** Show a masked number (agents, when masking is on). */
  maskPhone?: boolean
  department: Department
  stage: Stage
  status: LeadStatus
  channel: LeadChannel
  /** Campaign / ad / form name or WhatsApp-ad headline. */
  sourceDetail?: string
  /** Facebook / Instagram (Meta forms, Sheet rows from Meta) */
  platform?: AdPlatform
  /** WhatsApp lead that came from a Click-to-WhatsApp ad */
  isAd?: boolean
  agent?: AgentRef
  assignmentState: AssignmentState
  attemptCount: number
  nextFollowUpAt?: string
  /** Accept or first-contact deadline while one is running. */
  sla?: { startedAt: string; deadline: string }
  lostReason?: string
  receivedAt: string
  /** Table follow-up buttons 1, 2, 3 */
  followUps?: { number: number; status: 'pending' | 'done'; completedAt?: string; notes?: string }[]
  /** Controlled lead locking: true if agent has an earlier unfinished lead */
  isLocked?: boolean
  unlockRequested?: boolean
  unlockedForAgent?: boolean
  junkedBy?: { id: string; name: string; at: string; reason?: string }
  quotationSent?: boolean
  quotationSentAt?: string
}

export interface LeadDetail extends LeadSummary {
  altPhones: string[]
  city?: string
  area?: string
  campaignName?: string
  adName?: string
  formName?: string
  ctwaHeadline?: string
}

export interface AttemptView {
  id: string
  channel: AttemptChannel
  followUpNo: number
  agent: AgentRef
  tappedAt: string
  leftAt?: string
  returnedAt?: string
  loggedAt?: string
  result?: CallResult
  response?: CustomerResponse
  remarks?: string
  screenshotUrl?: string
  /** The screenshot existed but a manager cleared proof storage. */
  screenshotCleared?: boolean
  proofStatus: ProofStatus
  flags: ProofFlag[]
  reviewStatus: ReviewStatus
  /** "Tapped by mistake" — not a try. */
  cancelled?: boolean
}

/** An unsaved tap of the signed-in agent on a lead (the result sheet must be filled or the tap cancelled). */
export interface PendingTap {
  id: string
  channel: AttemptChannel
  tappedAt: string
}

export interface FollowUpView {
  id: string
  leadId: string
  leadName: string
  number: number
  dueAt: string
  status: FollowUpStatus
  isOverdue: boolean
}

export interface TeamMemberView {
  id: string
  name: string
  role: Role
  attendance: AttendanceStatus
  since?: string
  openLeads: number
  pendingAccept: number
  lastActionAt?: string
  departmentCode?: Department
}

export interface AssignableAgent {
  id: string
  name: string
  attendance?: AttendanceStatus
  departmentCode?: Department
}

export interface MessageView {
  id: string
  direction: MessageDirection
  sentFrom: MessageSender
  text: string
  at: string
  status: MessageStatus
  senderName?: string
}

export interface KpiItem {
  key: KpiKey
  value: string | number
  hint?: string
  comingIn?: number
}
