import { Schema, type InferSchemaType } from 'mongoose'
import { INSTRUCTION_PRIORITIES, INSTRUCTION_STATUSES } from '@/domain/constants'
import { defineModel } from '@/server/db/plugins'

const { ObjectId } = Schema.Types

/**
 * A custom role made by a manager / admin (e.g. "Installer", "Accounts", "Designer").
 * autoLeads = people in this role get leads in turn like call agents (permission role "agent");
 * otherwise they are "staff" (no leads). instructions = they can be given work instructions.
 */
const jobRoleSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 60 },
    autoLeads: { type: Boolean, required: true },
    instructions: { type: Boolean, required: true },
    /** null = company-wide (made by an admin) */
    departmentId: { type: ObjectId, ref: 'Department', default: null },
    createdBy: { type: ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
)
jobRoleSchema.index({ departmentId: 1, name: 1 }, { unique: true })

const instructionUpdateSchema = new Schema(
  {
    at: { type: Date, required: true },
    by: { type: ObjectId, ref: 'User', required: true },
    status: { type: String, enum: INSTRUCTION_STATUSES, default: null },
    note: { type: String, trim: true, maxlength: 1000, default: '' },
  },
  { _id: false },
)

/** A work instruction (task) given to one person. Both the giver and the person doing it update it. */
const instructionSchema = new Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 140 },
    details: { type: String, trim: true, maxlength: 4000, default: '' },
    assigneeId: { type: ObjectId, ref: 'User', required: true, index: true },
    createdBy: { type: ObjectId, ref: 'User', required: true, index: true },
    departmentId: { type: ObjectId, ref: 'Department', default: null, index: true },
    status: { type: String, enum: INSTRUCTION_STATUSES, default: 'todo', index: true },
    priority: { type: String, enum: INSTRUCTION_PRIORITIES, default: 'normal' },
    dueAt: { type: Date, default: null },
    leadId: { type: ObjectId, ref: 'Lead', default: null },
    completedAt: { type: Date, default: null },
    updates: { type: [instructionUpdateSchema], default: [] },
  },
  { timestamps: true },
)

export const JobRole = defineModel('JobRole', jobRoleSchema)
export const Instruction = defineModel('Instruction', instructionSchema)
export type InstructionDoc = InferSchemaType<typeof instructionSchema>
