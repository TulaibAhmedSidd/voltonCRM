import 'server-only'
import mongoose from 'mongoose'
import { attachDatabasePool } from '@vercel/functions'
import { requireMongoUri } from '@/lib/env'

declare global {
  var __voltonMongoose: Promise<typeof mongoose> | undefined
  var __voltonUnlockedOldLeads: boolean | undefined
}

/**
 * One cached connection per server instance (survives hot reload and warm serverless invocations).
 * attachDatabasePool lets Vercel close idle sockets before a function is suspended (no-op elsewhere).
 */
export function connectDb(uri?: string): Promise<typeof mongoose> {
  if (!globalThis.__voltonMongoose) {
    globalThis.__voltonMongoose = mongoose
      .connect(uri ?? requireMongoUri(), { maxPoolSize: 20, maxIdleTimeMS: 60_000, serverSelectionTimeoutMS: 10_000 })
      .then((connected) => {
        attachDatabasePool(connected.connection.getClient())
        if (!globalThis.__voltonUnlockedOldLeads) {
          globalThis.__voltonUnlockedOldLeads = true
          import('@/server/services/leads')
            .then((m) => m.unlockAllPreviousLeads())
            .catch((e) => console.error('[db] unlock previous leads error', e))
        }
        return connected
      })
      .catch((error: unknown) => {
        globalThis.__voltonMongoose = undefined
        throw error
      })
  }
  return globalThis.__voltonMongoose
}
