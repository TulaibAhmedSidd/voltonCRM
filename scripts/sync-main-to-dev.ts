/**
 * Sync main production database (MONGODB_URI) into development database (MONGODB_URI_NEW_DEV).
 * Rule: NEVER modify or write to MONGODB_URI. This script ONLY reads from MONGODB_URI
 * and writes exclusively to MONGODB_URI_NEW_DEV.
 */
import { MongoClient } from 'mongodb'
import { config } from 'dotenv'

config()

async function syncMainToDev() {
  const prodUri = process.env.MONGODB_URI
  const devUri = process.env.MONGODB_URI_NEW_DEV

  if (!prodUri) throw new Error('MONGODB_URI not found in environment.')
  if (!devUri) throw new Error('MONGODB_URI_NEW_DEV not found in environment.')

  console.log('[sync] Connecting to production database (READ ONLY)...')
  const prodClient = new MongoClient(prodUri)
  await prodClient.connect()
  const prodDb = prodClient.db()

  console.log('[sync] Connecting to dev database (WRITE TARGET)...')
  const devClient = new MongoClient(devUri)
  await devClient.connect()
  const devDb = devClient.db()

  // Guardrail check: Make sure dev DB is not prod DB
  if (devDb.databaseName === prodDb.databaseName && devUri === prodUri) {
    throw new Error('FATAL SAFETY ERROR: Dev URI is identical to Prod URI! Aborting immediately.')
  }
  if (!devDb.databaseName.toLowerCase().includes('dev') && !devUri.toLowerCase().includes('dev')) {
    throw new Error(`FATAL SAFETY ERROR: Target database "${devDb.databaseName}" does not look like a dev DB. Aborting.`)
  }

  console.log(`[sync] Syncing from ${prodDb.databaseName} to ${devDb.databaseName}...`)

  const collections = await prodDb.listCollections().toArray()
  for (const colInfo of collections) {
    const colName = colInfo.name
    if (colName.startsWith('system.')) continue

    const prodCol = prodDb.collection(colName)
    const devCol = devDb.collection(colName)

    const count = await prodCol.countDocuments()
    console.log(`[sync] Collection "${colName}": copying ${count} documents...`)

    // Clear dev collection
    await devCol.deleteMany({})

    if (count > 0) {
      const cursor = prodCol.find({})
      const batchSize = 500
      let batch: Record<string, unknown>[] = []

      while (await cursor.hasNext()) {
        const doc = await cursor.next()
        if (doc) batch.push(doc)

        if (batch.length >= batchSize) {
          await devCol.insertMany(batch)
          batch = []
        }
      }

      if (batch.length > 0) {
        await devCol.insertMany(batch)
      }
    }

    // Sync indexes
    try {
      const indexes = await prodCol.indexes()
      for (const idx of indexes) {
        if (idx.name === '_id_') continue
        const { key, name, unique, sparse, partialFilterExpression, expireAfterSeconds } = idx as Record<string, unknown>
        const options: Record<string, unknown> = { name }
        if (unique) options.unique = true
        if (sparse) options.sparse = true
        if (partialFilterExpression) options.partialFilterExpression = partialFilterExpression
        if (expireAfterSeconds !== undefined) options.expireAfterSeconds = expireAfterSeconds

        await devCol.createIndex(key as never, options as never).catch((e: Error) => console.warn(`[sync] index notice on ${colName}.${String(name)}:`, e.message))
      }
    } catch (e: unknown) {
      console.warn(`[sync] Could not copy indexes for ${colName}:`, e instanceof Error ? e.message : String(e))
    }
  }

  console.log('[sync] Sync completed successfully!')
  await prodClient.close()
  await devClient.close()
}

syncMainToDev().catch((err) => {
  console.error('[sync] Error syncing database:', err)
  process.exit(1)
})
