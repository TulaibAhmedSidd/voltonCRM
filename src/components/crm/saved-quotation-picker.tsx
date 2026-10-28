'use client'

import { useEffect, useState } from 'react'
import { BookmarkCheck, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { deleteSavedQuotationAction } from '@/server/actions'
import type { QuotationInput } from '@/domain/quotation'
import type { SavedQuotationDetail, SavedQuotationItem } from '@/domain/view-models'
import { cn } from '@/lib/utils'

const control = 'h-11 w-full rounded-lg border border-input bg-card px-3 text-base md:text-sm'

async function loadSaved(): Promise<SavedQuotationItem[]> {
  try {
    const r = await fetch('/api/quotations/saved', { cache: 'no-store' })
    return r.ok ? (((await r.json()) as { rows?: SavedQuotationItem[] }).rows ?? []) : []
  } catch {
    return []
  }
}

/**
 * "Start from a saved quotation": every quotation made is saved automatically (without the customer); picking one fills
 * the whole form. `refreshKey` changes after a save so the list picks it up.
 */
export function SavedQuotationPicker({ onPick, refreshKey = 0 }: { onPick: (input: QuotationInput, name: string) => void; refreshKey?: number }) {
  const [rows, setRows] = useState<SavedQuotationItem[] | null>(null)
  const [picked, setPicked] = useState('')
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null)

  useEffect(() => {
    let live = true
    void loadSaved().then((r) => {
      if (live) setRows(r)
    })
    return () => {
      live = false
    }
  }, [refreshKey])

  async function pick(id: string) {
    setPicked(id)
    setNote(null)
    if (!id) return
    setBusy(true)
    try {
      const r = await fetch(`/api/quotations/saved/${id}`, { cache: 'no-store' })
      const saved = r.ok ? ((await r.json()) as { saved?: SavedQuotationDetail }).saved : undefined
      if (!saved) throw new Error('not found')
      onPick(saved.input, saved.name)
      setNote({ ok: true, text: `Filled from “${saved.name}”. Check the prices and the customer before you send.` })
    } catch {
      setNote({ ok: false, text: 'Could not open that saved quotation — try again.' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <fieldset className="space-y-2 rounded-xl bg-muted/30 p-3 ring-1 ring-foreground/10">
      <legend className="flex items-center gap-2 px-1 text-sm font-semibold">
        <BookmarkCheck className="size-4" aria-hidden />
        Start from a saved quotation
      </legend>
      <label className="block text-sm">
        <span className="sr-only">Saved quotation</span>
        <select value={picked} disabled={busy || !rows?.length} onChange={(e) => void pick(e.target.value)} className={control}>
          <option value="">
            {rows === null ? 'Loading saved quotations…' : rows.length ? `-- Choose one of ${rows.length} saved quotations --` : 'No saved quotations yet'}
          </option>
          {rows?.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} — by {s.madeBy}
              {s.useCount > 1 ? ` · used ${s.useCount}×` : ''}
            </option>
          ))}
        </select>
        <span className="mt-1 block text-xs text-muted-foreground">
          {busy ? 'Filling the form…' : 'Every quotation you make is saved here (without the customer), so the same setup is one tap next time.'}
        </span>
      </label>
      {note ? (
        <p role="status" className={cn('rounded-lg px-3 py-2 text-xs', note.ok ? 'bg-tone-success-soft text-tone-success-soft-foreground' : 'bg-tone-warning-soft text-tone-warning-soft-foreground')}>
          {note.text}
        </p>
      ) : null}
    </fieldset>
  )
}

/** Quotations → Saved → Remove (soft delete; quotations already made from it are not touched). */
export function SavedQuotationDeleteButton({ id, name }: { id: string; name: string }) {
  const [error, setError] = useState<string | null>(null)
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <ConfirmDialog
        trigger={
          <Button type="button" variant="ghost" size="touch" className="text-tone-danger-soft-foreground">
            <Trash2 aria-hidden />
            Remove
          </Button>
        }
        title="Remove this saved quotation?"
        description={`“${name}” will no longer be offered in the quotation form. Quotations already made from it stay as they are.`}
        confirmLabel="Remove"
        destructive
        onConfirm={async () => {
          const r = await deleteSavedQuotationAction(id)
          setError(r?.ok ? null : (r?.message ?? 'Could not remove it'))
        }}
      />
      {error ? <span className="text-xs text-tone-danger-soft-foreground">{error}</span> : null}
    </span>
  )
}
