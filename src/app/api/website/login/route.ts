import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { websiteAccessOf } from '@/domain/website'
import type { Role } from '@/domain/constants'
import { getServerEnv } from '@/lib/env'
import { verifyPasswordOrDummy } from '@/server/auth/password'
import { connectDb } from '@/server/db/connection'
import { User } from '@/server/db/models'
import { websiteCallAllowed } from '@/server/lib/website-token'
import { clear, hit, isBlocked } from '@/server/services/rate-limit'

const body = z.object({ login: z.string().trim().toLowerCase().min(1).max(120), password: z.string().min(1).max(200) })

/**
 * voltonsolar.com admin login asks here: "is this CRM username/email + password right, and what may they do?"
 * Server-to-server only (Bearer WEBSITE_SSO_SECRET). Same lockout as the CRM sign-in: 5 wrong tries per user in 15 min.
 */
export async function POST(request: NextRequest) {
  if (!websiteCallAllowed(request.headers.get('authorization'), getServerEnv().WEBSITE_SSO_SECRET)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const parsed = body.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Enter your username or email and password' }, { status: 400 })
  const { login, password } = parsed.data
  await connectDb()
  const key = `login:user:${login}`
  const blocked = await isBlocked(key, 5)
  if (blocked.blocked) return NextResponse.json({ error: `Too many wrong tries. Wait ${blocked.retryAfterMin} minutes.` }, { status: 429 })
  const user = await User.findOne({ $or: [{ email: login }, { username: login }], deletedAt: null }).select('+passwordHash name email role jobTitle websiteAccess isActive createdAt').lean()
  const ok = (await verifyPasswordOrDummy(password, user?.passwordHash)) && !!user?.isActive
  if (!ok || !user) {
    await hit(key, 5, 15 * 60_000)
    // "unknown" lets the website try its own old admin accounts; a wrong CRM password is just "wrong".
    return NextResponse.json({ error: 'Wrong username or password', unknown: !user }, { status: 401 })
  }
  await clear(key)
  const access = websiteAccessOf({ role: user.role as Role, jobTitle: user.jobTitle, createdAt: user.createdAt, websiteAccess: user.websiteAccess })
  if (access === 'none') return NextResponse.json({ error: 'Your CRM account has no website access — ask your manager.' }, { status: 403 })
  return NextResponse.json({ user: { id: String(user._id), name: user.name, email: user.email, access } }, { headers: { 'Cache-Control': 'no-store' } })
}
