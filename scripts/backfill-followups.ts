/**
 * Old leads: make the Leads table's "Follow-up 1 / 2 / 3" match the tries already made on each lead.
 * Before 2026-10-27, a call / WhatsApp saved from the lead page did not write a "follow-up 1" record, so the table
 * showed Pending although the lead page said "try 2 of 3".
 *
 *   npm run backfill:followups            — PREVIEW only: shows what would change, writes nothing
 *   npm run backfill:followups -- --apply — writes the missing / pending follow-up records as Done
 *
 * Uses MONGODB_URI from .env.local (make sure it is the same database as on Vercel). Safe to run more than once.
 * Only the follow-up records of real tries (saved, not cancelled, not "couldn't call now") are touched; leads,
 * calls, notes and statuses are never changed.
 */
import mongoose, { type Types } from 'mongoose'
import { requireMongoUri } from '@/lib/env'
import { connectDb } from '@/server/db/connection'
import { ContactAttempt, FollowUp, Lead } from '@/server/db/models'

const apply = process.argv.includes('--apply')
const MAX = 3

async function main() {
  const uri = requireMongoUri()
  const host = /@([^/?]+)/.exec(uri)?.[1] ?? /\/\/([^/?]+)/.exec(uri)?.[1] ?? 'unknown host'
  const dbName = /\.net\/([^?]+)/.exec(uri)?.[1] || /:\d+\/([^?]+)/.exec(uri)?.[1] || '(default)'
  console.log(`Database: ${host} / ${dbName}`)
  console.log(apply ? 'Mode: APPLY — records will be written.\n' : 'Mode: PREVIEW — nothing is written. Add -- --apply to write.\n')
  await connectDb(uri)

  const leads = await Lead.find({ deletedAt: null, attemptCount: { $gt: 0 } }).select('_id leadNo attemptCount reopenedAt assignment.agentId').lean()
  let leadsFixed = 0
  let records = 0
  for (const lead of leads) {
    // The real tries, oldest first (after a manager re-opened the lead, only the tries since then count).
    const tries = await ContactAttempt.find({
      leadId: lead._id,
      outcomeAt: { $ne: null },
      cancelled: { $ne: true },
      result: { $nin: [null, 'could_not_call'] },
      ...(lead.reopenedAt ? { serverTapAt: { $gte: lead.reopenedAt } } : {}),
    })
      .sort({ serverTapAt: 1 })
      .select('_id agentId outcomeAt result')
      .lean()
    const done = Math.min(lead.attemptCount ?? 0, MAX)
    const existing = await FollowUp.find({ leadId: lead._id, number: { $lte: MAX } }).select('number status').lean()
    const missing: number[] = []
    for (let n = 1; n <= done; n++) if (existing.find((f) => f.number === n)?.status !== 'done') missing.push(n)
    if (!missing.length) continue
    leadsFixed++
    records += missing.length
    console.log(`${lead.leadNo}: ${lead.attemptCount} tries → mark follow-up ${missing.join(', ')} Done`)
    if (!apply) continue
    for (const n of missing) {
      const t = tries[n - 1]
      const agentId = (t?.agentId ?? lead.assignment?.agentId) as Types.ObjectId | undefined
      if (!agentId) continue
      const at = t?.outcomeAt ?? new Date()
      await FollowUp.updateOne(
        { leadId: lead._id, number: n },
        { $set: { status: 'done', completedAt: at, ...(t ? { attemptId: t._id, outcome: t.result } : { outcome: 'completed' }) }, $setOnInsert: { agentId, dueAt: at } },
        { upsert: true },
      )
    }
  }
  console.log(`\n${leads.length} leads with tries checked · ${leadsFixed} need fixing · ${records} follow-up records ${apply ? 'written' : 'would be written'}.`)
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  })
  .finally(() => mongoose.disconnect())
