'use client'

import { useState, useMemo } from 'react'
import { AlertTriangle, CheckCircle2, Clock, LogIn, LogOut, Search, UserX } from 'lucide-react'
import { AttendanceBadge, RoleBadge } from '@/components/crm/badges'
import { formatPktDateTime } from '@/lib/dates-pkt'
import type { AttendanceHistoryReport } from '@/server/services/queries'
import type { Role } from '@/domain/constants'
import { cn } from '@/lib/utils'

export function TeamAttendanceSection({ report }: { report: AttendanceHistoryReport }) {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'checked_in' | 'missing_checkout' | 'today'>('all')

  const todayKey = useMemo(() => {
    // Current date in PKT format YYYY-MM-DD
    const d = new Date()
    return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Karachi' })
  }, [])

  const filteredRecords = useMemo(() => {
    let list = report.records
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter((r) => r.userName.toLowerCase().includes(q))
    }
    if (filter === 'checked_in') {
      list = list.filter((r) => r.status === 'checked_in')
    } else if (filter === 'missing_checkout') {
      list = list.filter((r) => r.missingCheckOut)
    } else if (filter === 'today') {
      list = list.filter((r) => r.date === todayKey)
    }
    return list
  }, [report.records, search, filter, todayKey])

  return (
    <div className="space-y-6">
      {/* ── Summary & Alerts Cards ── */}
      <div className="grid gap-4 sm:grid-cols-3">
        {/* Missing Check-in Alert */}
        <div className="rounded-xl border border-border bg-card p-4 ring-1 ring-foreground/5">
          <div className="flex items-center gap-2 text-tone-danger">
            <UserX className="size-5 shrink-0" aria-hidden />
            <h3 className="font-semibold text-sm">Missing Check-in Today</h3>
          </div>
          <p className="mt-2 text-2xl font-bold text-foreground">
            {report.missingCheckInsToday.length}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {report.missingCheckInsToday.length === 0
              ? 'Everyone is checked in today'
              : `${report.missingCheckInsToday.map((u) => u.name).slice(0, 3).join(', ')}${report.missingCheckInsToday.length > 3 ? ` +${report.missingCheckInsToday.length - 3} more` : ''}`}
          </p>
        </div>

        {/* Missing Check-out Alert */}
        <div className="rounded-xl border border-border bg-card p-4 ring-1 ring-foreground/5">
          <div className="flex items-center gap-2 text-tone-warning">
            <AlertTriangle className="size-5 shrink-0" aria-hidden />
            <h3 className="font-semibold text-sm">Missing Past Check-outs</h3>
          </div>
          <p className="mt-2 text-2xl font-bold text-foreground">
            {report.missingCheckOutsCount}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {report.missingCheckOutsCount === 0
              ? 'No past shifts left open'
              : 'Left work without marking check-out'}
          </p>
        </div>

        {/* Checked in today */}
        <div className="rounded-xl border border-border bg-card p-4 ring-1 ring-foreground/5">
          <div className="flex items-center gap-2 text-tone-success">
            <CheckCircle2 className="size-5 shrink-0" aria-hidden />
            <h3 className="font-semibold text-sm">Currently on Duty</h3>
          </div>
          <p className="mt-2 text-2xl font-bold text-foreground">
            {report.checkedInTodayCount}{' '}
            <span className="text-sm font-normal text-muted-foreground">
              / {report.totalEmployeesCount}
            </span>
          </p>
          <p className="text-xs text-muted-foreground mt-1">Active team members checked in</p>
        </div>
      </div>

      {/* ── Filters & Search ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search employee name…"
            className="h-10 w-full rounded-lg border border-input bg-card ps-9 pe-3 text-sm outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>

        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={cn(
              'h-9 rounded-md px-3 text-xs font-medium transition-colors',
              filter === 'all'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80',
            )}
          >
            All Shifts ({report.records.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter('today')}
            className={cn(
              'h-9 rounded-md px-3 text-xs font-medium transition-colors',
              filter === 'today'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80',
            )}
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => setFilter('checked_in')}
            className={cn(
              'h-9 rounded-md px-3 text-xs font-medium transition-colors',
              filter === 'checked_in'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80',
            )}
          >
            On Duty
          </button>
          {report.missingCheckOutsCount > 0 ? (
            <button
              type="button"
              onClick={() => setFilter('missing_checkout')}
              className={cn(
                'h-9 rounded-md px-3 text-xs font-medium transition-colors',
                filter === 'missing_checkout'
                  ? 'bg-tone-warning text-tone-warning-foreground'
                  : 'bg-tone-warning-soft text-tone-warning-soft-foreground hover:bg-tone-warning-soft/80',
              )}
            >
              Missing Check-out ({report.missingCheckOutsCount})
            </button>
          ) : null}
        </div>
      </div>

      {/* ── Attendance Log Table ── */}
      <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
        <table className="w-full text-start text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              <th className="px-4 py-3 text-start">Employee</th>
              <th className="px-4 py-3 text-start">Date</th>
              <th className="px-4 py-3 text-start">Check In (PKT)</th>
              <th className="px-4 py-3 text-start">Check Out (PKT)</th>
              <th className="px-4 py-3 text-start">Duration</th>
              <th className="px-4 py-3 text-end">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filteredRecords.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-muted-foreground">
                  No attendance records found.
                </td>
              </tr>
            ) : (
              filteredRecords.map((r) => (
                <tr key={r.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-medium text-foreground">
                    <div>{r.userName}</div>
                    <div className="mt-0.5 flex items-center gap-1.5">
                      <RoleBadge role={r.userRole as Role} size="sm" />
                      {r.departmentCode ? (
                        <span className="text-[11px] text-muted-foreground">· {r.departmentCode}</span>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                    {r.date}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap font-mono text-xs">
                    {r.checkInAt ? (
                      <span className="flex items-center gap-1 text-tone-success">
                        <LogIn className="size-3.5 shrink-0" aria-hidden />
                        {formatPktDateTime(new Date(r.checkInAt)).split('·')[1]?.trim() || r.checkInAt}
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap font-mono text-xs">
                    {r.checkOutAt ? (
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <LogOut className="size-3.5 shrink-0" aria-hidden />
                        {formatPktDateTime(new Date(r.checkOutAt)).split('·')[1]?.trim() || r.checkOutAt}
                      </span>
                    ) : r.missingCheckOut ? (
                      <span className="flex items-center gap-1 text-tone-danger font-semibold">
                        <AlertTriangle className="size-3.5 shrink-0" aria-hidden />
                        Missing Check-out
                      </span>
                    ) : (
                      <span className="text-tone-success font-medium">Still Working</span>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-muted-foreground font-mono text-xs">
                    <span className="flex items-center gap-1">
                      <Clock className="size-3.5 shrink-0" aria-hidden />
                      {r.durationText}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-end whitespace-nowrap">
                    <AttendanceBadge status={r.status} size="sm" />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
