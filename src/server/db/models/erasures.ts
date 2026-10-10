import { Schema } from 'mongoose'
import { defineModel } from '@/server/db/plugins'

/**
 * A customer erased on request (privacy). No personal data — only a one-way hash of each phone number, so OLD data
 * that re-appears (a Meta catch-up sync, an old Sheet row, WhatsApp chat history) is not imported again.
 * A NEW enquiry from the same number after the erasure is accepted normally.
 */
const erasureSchema = new Schema(
  {
    phoneHash: { type: String, required: true, index: true },
    erasedAt: { type: Date, required: true },
    erasedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: false },
)

export const Erasure = defineModel('Erasure', erasureSchema)
