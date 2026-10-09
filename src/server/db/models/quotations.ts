import { Schema, type InferSchemaType } from 'mongoose'
import { defineModel } from '@/server/db/plugins'

const { ObjectId, Mixed } = Schema.Types

/**
 * A quotation issued from a lead (PDF for the customer). Immutable snapshot: the PDF is rebuilt from these
 * fields, so it always shows exactly what was sent. A change = a new quotation (new number).
 */
const quotationSchema = new Schema(
  {
    quotationNo: { type: String, required: true, unique: true },
    leadId: { type: ObjectId, ref: 'Lead', required: true, index: true },
    contactId: { type: ObjectId, ref: 'Contact', required: true },
    departmentId: { type: ObjectId, ref: 'Department', default: null },
    leadNo: { type: String, required: true },
    customer: {
      name: { type: String, required: true },
      phone: { type: String, required: true },
      address: { type: String, default: '' },
    },
    preparedBy: {
      userId: { type: ObjectId, ref: 'User', required: true },
      name: { type: String, required: true },
      role: { type: String, required: true },
      phone: { type: String, default: '' },
    },
    /** The form as filled in (QuotationInput) */
    input: { type: Mixed, required: true },
    subtotal: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    total: { type: Number, required: true },
    systemKw: { type: Number, default: 0 },
    issuedAt: { type: Date, required: true },
    validUntil: { type: Date, required: true },
  },
  { timestamps: true },
)
quotationSchema.index({ leadId: 1, issuedAt: -1 })

export const Quotation = defineModel('Quotation', quotationSchema)
export type QuotationDoc = InferSchemaType<typeof quotationSchema>
