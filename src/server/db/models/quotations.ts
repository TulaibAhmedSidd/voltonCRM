import { Schema, type InferSchemaType } from 'mongoose'
import { DEFAULT_QUOTATION_STATUS, QUOTATION_STATUSES } from '@/domain/constants'
import { auditFields, defineModel, softDelete } from '@/server/db/plugins'

const { ObjectId, Mixed } = Schema.Types

/**
 * A quotation issued from a lead or standalone (PDF for the customer). Immutable snapshot: the PDF is rebuilt from these
 * fields, so it always shows exactly what was sent. A change = a new quotation (new number).
 */
const quotationSchema = new Schema(
  {
    quotationNo: { type: String, required: true, unique: true },
    leadId: { type: ObjectId, ref: 'Lead', default: null, index: true },
    contactId: { type: ObjectId, ref: 'Contact', default: null },
    departmentId: { type: ObjectId, ref: 'Department', default: null },
    leadNo: { type: String, default: null },
    status: { type: String, enum: QUOTATION_STATUSES, default: DEFAULT_QUOTATION_STATUS },
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
quotationSchema.index({ issuedAt: -1 })
quotationSchema.index({ status: 1, issuedAt: -1 })

export const Quotation = defineModel('Quotation', quotationSchema)
export type QuotationDoc = InferSchemaType<typeof quotationSchema>

/**
 * A saved quotation: the filled form without the customer. Kept automatically every time a quotation is made (one per
 * identical setup per department; the same setup again only counts a use), or saved by hand from the form, so the next
 * customer who wants the same system starts from it.
 */
const savedQuotationSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 160 },
    /** sha256 of the setup. Set to "deleted:<id>" when removed, so the same setup can be saved again. */
    fingerprint: { type: String, required: true },
    departmentId: { type: ObjectId, ref: 'Department', default: null },
    /** QuotationInput without the customer note */
    input: { type: Mixed, required: true },
    systemType: { type: String, default: '' },
    systemKw: { type: Number, default: 0 },
    subtotal: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    total: { type: Number, required: true },
    madeBy: {
      userId: { type: ObjectId, ref: 'User', required: true },
      name: { type: String, required: true },
      role: { type: String, default: '' },
    },
    sourceQuotationId: { type: ObjectId, ref: 'Quotation', default: null },
    sourceQuotationNo: { type: String, default: null },
    useCount: { type: Number, default: 0 },
    lastUsedAt: { type: Date, default: null },
    lastUsedBy: { type: String, default: null },
  },
  { timestamps: true },
)
auditFields(savedQuotationSchema)
softDelete(savedQuotationSchema)
savedQuotationSchema.index({ departmentId: 1, fingerprint: 1 }, { unique: true })
savedQuotationSchema.index({ deletedAt: 1, updatedAt: -1 })

export const SavedQuotation = defineModel('SavedQuotation', savedQuotationSchema)
export type SavedQuotationDoc = InferSchemaType<typeof savedQuotationSchema>
