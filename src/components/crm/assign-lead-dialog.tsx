'use client'

import { useState } from 'react'
import { UserCheck } from 'lucide-react'
import { Button, type buttonVariants } from '@/components/ui/button'
import type { VariantProps } from 'class-variance-authority'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { ActionForm } from '@/components/common/action-form'
import { SelectField } from '@/components/common/fields'
import { assignLeadAction } from '@/server/actions'
import { en } from '@/i18n/en'
import type { Department } from '@/domain/constants'
import type { AssignableAgent } from '@/domain/view-models'

export type { AssignableAgent }

type ButtonVariant = NonNullable<VariantProps<typeof buttonVariants>['variant']>
type ButtonSize = NonNullable<VariantProps<typeof buttonVariants>['size']>

export function AssignLeadDialog({
  leadId,
  leadNo,
  customerName,
  department,
  currentAgentId,
  agents,
  triggerLabel = en.lead.assignToMember,
  triggerVariant = 'outline',
  triggerSize = 'xs',
  className,
}: {
  leadId: string
  leadNo: string
  customerName: string
  department?: Department
  currentAgentId?: string
  agents: AssignableAgent[]
  triggerLabel?: string
  triggerVariant?: ButtonVariant
  triggerSize?: ButtonSize
  className?: string
}) {
  const [open, setOpen] = useState(false)

  // Filter agents by department if specified
  const filteredAgents = department
    ? agents.filter((a) => !a.departmentCode || a.departmentCode === department)
    : agents

  const agentOptions = [
    { value: 'auto', label: en.lead.nextInOrderAuto },
    ...filteredAgents.map((a) => {
      const statusText =
        a.attendance === 'checked_in'
          ? ` (${en.attendanceStatus.checked_in})`
          : a.attendance === 'on_break'
            ? ` (${en.attendanceStatus.on_break})`
            : a.attendance === 'checked_out'
              ? ` (${en.attendanceStatus.checked_out})`
              : ''
      return {
        value: a.id,
        label: `${a.name}${statusText}`,
      }
    }),
  ]

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={triggerVariant} size={triggerSize} className={className}>
          <UserCheck data-icon="inline-start" aria-hidden />
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{en.lead.assignDialogTitle}</DialogTitle>
          <DialogDescription>
            {en.lead.assignDialogDescription(leadNo, customerName)}
          </DialogDescription>
        </DialogHeader>

        <ActionForm
          action={assignLeadAction}
          onSuccess={() => {
            setTimeout(() => setOpen(false), 600)
          }}
          className="space-y-4 pt-2"
        >
          <input type="hidden" name="leadId" value={leadId} />

          <SelectField
            label={en.lead.assignToTeamMember}
            name="agentId"
            defaultValue={currentAgentId ?? (agentOptions.length > 1 ? agentOptions[1].value : 'auto')}
            options={agentOptions}
            required
          />

          <p className="text-xs text-muted-foreground">
            {en.lead.assignedImmediatelyHint}
          </p>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" size="touch" onClick={() => setOpen(false)}>
              {en.common.cancel}
            </Button>
            <Button type="submit" size="touch">
              {triggerLabel === en.lead.reassign ? en.lead.reassign : en.lead.assignToMember}
            </Button>
          </div>
        </ActionForm>
      </DialogContent>
    </Dialog>
  )
}
