import { NextResponse, type NextRequest } from 'next/server'
import { getServerEnv } from '@/lib/env'
import { websiteTeam } from '@/server/services/website-team'
import { websiteCallAllowed } from '@/server/lib/website-token'

/** For the website's Team page: active people with job title, department and who they report to. No phones / emails. */
export async function GET(request: NextRequest) {
  if (!websiteCallAllowed(request.headers.get('authorization'), getServerEnv().WEBSITE_SSO_SECRET)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  return NextResponse.json({ team: await websiteTeam() }, { headers: { 'Cache-Control': 'no-store' } })
}
