import { StatusBadge } from '@/components/common/status-badge'
import { sourceLabel } from '@/domain/lead-filters'
import type {
  AssignmentState,
  AttendanceStatus,
  CallResult,
  CustomerResponse,
  Department,
  LeadChannel,
  AdPlatform,
  LeadStatus,
  ProofFlag,
  ProofStatus,
  Role,
  Stage,
} from '@/domain/constants'
import {
  ASSIGNMENT_STATE_META,
  ATTENDANCE_STATUS_META,
  CALL_RESULT_META,
  CHANNEL_META,
  CUSTOMER_RESPONSE_META,
  DEPARTMENT_META,
  LEAD_STATUS_META,
  PROOF_FLAG_META,
  PROOF_STATUS_META,
  ROLE_META,
  STAGE_META,
} from '@/domain/ui-maps'

type Size = 'sm' | 'md'

export const StageBadge = ({ stage, size }: { stage: Stage; size?: Size }) => <StatusBadge {...STAGE_META[stage]} size={size} />
export const DepartmentBadge = ({ department, size }: { department: Department; size?: Size }) => (
  <StatusBadge {...DEPARTMENT_META[department]} size={size} />
)
export const LeadStatusBadge = ({ status, size }: { status: LeadStatus; size?: Size }) => <StatusBadge {...LEAD_STATUS_META[status]} size={size} />
export const RoleBadge = ({ role, size }: { role: Role; size?: Size }) => <StatusBadge {...ROLE_META[role]} size={size} />
export const AttendanceBadge = ({ status, size }: { status: AttendanceStatus; size?: Size }) => (
  <StatusBadge {...ATTENDANCE_STATUS_META[status]} size={size} />
)
export const AssignmentBadge = ({ state, size }: { state: AssignmentState; size?: Size }) => (
  <StatusBadge {...ASSIGNMENT_STATE_META[state]} size={size} />
)
export const CallResultBadge = ({ result, size }: { result: CallResult; size?: Size }) => <StatusBadge {...CALL_RESULT_META[result]} size={size} />
export const ResponseBadge = ({ response, size }: { response: CustomerResponse; size?: Size }) => (
  <StatusBadge {...CUSTOMER_RESPONSE_META[response]} size={size} />
)

/** Lead source: "Facebook form · Solar Home Oct", "WhatsApp ad · …", "Google Sheet" */
export function SourceBadge({ channel, detail, size, platform, isAd }: { channel: LeadChannel; detail?: string; size?: Size; platform?: AdPlatform; isAd?: boolean }) {
  const meta = CHANNEL_META[channel]
  const name = sourceLabel(channel, platform, isAd) ?? meta.label
  return <StatusBadge {...meta} label={detail ? `${name} · ${detail}` : name} title={detail ? `${name} · ${detail}` : name} size={size} className="max-w-64" />
}

/** Proof chip + the reasons it was flagged. */
export function ProofChip({ status, flags = [], size }: { status: ProofStatus; flags?: ProofFlag[]; size?: Size }) {
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      <StatusBadge {...PROOF_STATUS_META[status]} size={size} />
      {flags.map((flag) => (
        <StatusBadge key={flag} {...PROOF_FLAG_META[flag]} size="sm" variant="soft" />
      ))}
    </span>
  )
}
