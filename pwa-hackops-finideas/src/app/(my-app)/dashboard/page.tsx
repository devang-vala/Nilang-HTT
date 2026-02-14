import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { getPayloadClient } from '@/lib/payload'
import DashboardClient from '@/app/(my-app)/dashboard/dashboard-client'

export default async function DashboardPage() {
  const payload = await getPayloadClient()
  const headersList = await headers()

  // Get the current user server-side — no fetch needed, direct DB call
  let user = null
  try {
    const { user: authUser } = await payload.auth({ headers: headersList })
    user = authUser
  } catch {
    // Not authenticated
  }

  if (!user) {
    redirect('/auth')
  }

  // Pass the user data directly — no loading spinner needed
  return <DashboardClient user={user} />
}