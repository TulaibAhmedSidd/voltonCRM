import { PageHeader } from '@/components/common/page-header'
import { FilterBar, FilterChip } from '@/components/common/filter-bar'
import { PipelineBoard } from '@/components/crm/pipeline-board'
import { DEPARTMENTS, type Department } from '@/domain/constants'
import { DEPARTMENT_META } from '@/domain/ui-maps'
import { requireRole } from '@/server/auth/session'
import { pipelineColumns } from '@/server/services/queries'

export const metadata = { title: 'Pipeline' }

/** Read-only Kanban per department (stages change from the lead page / outcome sheet). */
export default async function PipelinePage(props: PageProps<'/pipeline'>) {
  const user = await requireRole('admin', 'manager')
  const sp = await props.searchParams
  const department: Department =
    user.role === 'manager' && user.departmentCode ? user.departmentCode : (DEPARTMENTS.find((d) => d === sp.department) ?? 'INSTALLATION')
  const { stages, leads } = await pipelineColumns(user, department)
  return (
    <>
      <PageHeader title="Pipeline" description="Each column is a stage. Tap a card to work the lead." />
      {user.role === 'admin' ? (
        <FilterBar>
          {DEPARTMENTS.map((d) => (
            <FilterChip key={d} label={DEPARTMENT_META[d].label} href={`/pipeline?department=${d}`} active={d === department} />
          ))}
        </FilterBar>
      ) : null}
      <PipelineBoard stages={stages} leads={leads} />
    </>
  )
}
