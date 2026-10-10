import { NextResponse, type NextRequest } from 'next/server'
import { websiteAccessOf } from '@/domain/website'
import { getServerEnv } from '@/lib/env'
import { getSessionUser } from '@/server/auth/session'
import { connectDb } from '@/server/db/connection'
import { User } from '@/server/db/models'
import { oid } from '@/server/services/common'
import { makeWebsitePass } from '@/server/lib/website-token'

/** CRM menu → "Website admin": opens voltonsolar.com/admin already signed in (60-second signed pass in the URL hash). */
export async function GET(request: NextRequest) {
  const user = await getSessionUser()
  if (!user) return NextResponse.redirect(new URL('/login?next=/api/website/sso', request.url))
  const { WEBSITE_SSO_SECRET, WEBSITE_URL } = getServerEnv()
  if (!WEBSITE_SSO_SECRET || !WEBSITE_URL) return NextResponse.json({ error: 'The website connection is not set up yet (WEBSITE_SSO_SECRET / WEBSITE_URL).' }, { status: 503 })
  await connectDb()
  const me = await User.findById(oid(user.id)).select('name email role jobTitle websiteAccess createdAt isActive').lean()
  const access = me?.isActive ? websiteAccessOf({ role: me.role, jobTitle: me.jobTitle, createdAt: me.createdAt, websiteAccess: me.websiteAccess }) : 'none'
  if (!me || access === 'none') return NextResponse.json({ error: 'Your account has no website access — ask your manager.' }, { status: 403 })
  const pass = makeWebsitePass({ id: String(me._id), name: me.name, email: me.email, access }, WEBSITE_SSO_SECRET)
  return NextResponse.redirect(`${WEBSITE_URL.replace(/\/$/, '')}/admin/sso#pass=${pass}`, { headers: { 'Cache-Control': 'no-store' } })
}
