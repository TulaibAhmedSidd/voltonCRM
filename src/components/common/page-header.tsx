import { Breadcrumbs, type BreadcrumbItem } from '@/components/common/breadcrumbs'
import { SmartBackButton } from '@/components/common/smart-back-button'
import { cn } from '@/lib/utils'

export interface PageHeaderProps {
  title: string
  description?: string
  actions?: React.ReactNode
  backHref?: string
  breadcrumbs?: BreadcrumbItem[]
  className?: string
}

export function PageHeader({ title, description, actions, backHref, breadcrumbs, className }: PageHeaderProps) {
  return (
    <header className={cn('flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between', className)}>
      <div className="min-w-0 space-y-1">
        {breadcrumbs && breadcrumbs.length > 0 ? (
          <Breadcrumbs items={breadcrumbs} className="pb-1" />
        ) : null}

        {backHref ? (
          <SmartBackButton fallbackHref={backHref} />
        ) : null}

        <h1 className="font-heading text-xl font-semibold md:text-2xl">{title}</h1>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </header>
  )
}
