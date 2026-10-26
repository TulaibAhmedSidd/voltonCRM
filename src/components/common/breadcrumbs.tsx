import Link from 'next/link'
import { ChevronRight, Home } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface BreadcrumbItem {
  label: string
  href?: string
  current?: boolean
}

export function Breadcrumbs({ items, className }: { items: BreadcrumbItem[]; className?: string }) {
  if (!items || items.length === 0) return null

  return (
    <nav aria-label="Breadcrumb" className={cn('flex items-center text-xs text-muted-foreground', className)}>
      <ol className="flex flex-wrap items-center gap-1.5">
        <li className="flex items-center">
          <Link
            href="/dashboard"
            className="flex items-center gap-1 hover:text-foreground transition-colors"
            title="Dashboard"
          >
            <Home className="size-3.5" aria-hidden />
            <span className="sr-only">Dashboard</span>
          </Link>
        </li>

        {items.map((item, idx) => {
          const isLast = idx === items.length - 1 || item.current

          return (
            <li key={idx} className="flex items-center gap-1.5">
              <ChevronRight className="size-3 text-muted-foreground/60 rtl:rotate-180" aria-hidden />
              {isLast || !item.href ? (
                <span
                  className={cn(
                    'max-w-[220px] truncate font-medium',
                    isLast ? 'font-semibold text-foreground' : 'text-muted-foreground',
                  )}
                  aria-current={isLast ? 'page' : undefined}
                >
                  {item.label}
                </span>
              ) : (
                <Link
                  href={item.href}
                  className="max-w-[180px] truncate transition-colors hover:text-foreground hover:underline"
                >
                  {item.label}
                </Link>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
