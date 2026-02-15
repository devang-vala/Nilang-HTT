import { headers as nextHeaders } from 'next/headers'
import { getPayload } from 'payload'
import config from '@/payload.config'

export interface AuthUser {
  id: string
  email: string
  name: string
  role: 'admin' | 'user'
}

/**
 * Get the currently authenticated user from server-side context.
 * Uses Payload's JWT cookie (`payload-token`) to verify the session.
 * Returns null if unauthenticated.
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const headersList = await nextHeaders()
    const payload = await getPayload({ config })

    // Payload stores the JWT in a cookie called `payload-token`
    const cookieHeader = headersList.get('cookie') || ''

    // Extract the token from cookie header
    const tokenMatch = cookieHeader.match(/payload-token=([^;]+)/)
    if (!tokenMatch) return null

    const token = tokenMatch[1]

    // Verify with Payload's built-in auth
    const { user } = await payload.auth({ headers: new Headers({ Authorization: `JWT ${token}` }) })

    if (!user) return null

    return {
      id: user.id as string,
      email: user.email as string,
      name: (user as unknown as Record<string, unknown>).name as string,
      role: ((user as unknown as Record<string, unknown>).role as 'admin' | 'user') || 'user',
    }
  } catch {
    return null
  }
}

export type AuthResult =
  | { authenticated: true; user: AuthUser }
  | { authenticated: false; error: string; status: number }

/**
 * Require authentication - returns error response info if not authenticated.
 */
export async function requireAuth(): Promise<AuthResult> {
  const user = await getCurrentUser()
  if (!user) {
    return { authenticated: false, error: 'Authentication required', status: 401 }
  }
  return { authenticated: true, user }
}

/**
 * Require admin role - returns error if not admin.
 */
export async function requireAdmin(): Promise<AuthResult> {
  const result = await requireAuth()
  if (!result.authenticated) return result
  if (result.user.role !== 'admin') {
    return { authenticated: false, error: 'Admin access required', status: 403 }
  }
  return { authenticated: true, user: result.user }
}
