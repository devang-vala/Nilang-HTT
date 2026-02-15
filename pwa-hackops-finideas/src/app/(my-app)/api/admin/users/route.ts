import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { requireAdmin } from '@/lib/auth'

// GET - List all users (admin only)
export async function GET() {
  try {
    const authResult = await requireAdmin()
    if (!authResult.authenticated) {
      return NextResponse.json(
        { success: false, message: authResult.error },
        { status: authResult.status }
      )
    }

    const payload = await getPayload({ config })

    const users = await payload.find({
      collection: 'users',
      limit: 100,
      sort: '-createdAt',
      overrideAccess: true,
    })

    const formattedUsers = users.docs.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    }))

    return NextResponse.json({
      success: true,
      data: formattedUsers,
      total: users.totalDocs,
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { success: false, message: 'Error fetching users', error: errorMessage },
      { status: 500 }
    )
  }
}

// PATCH - Update user role (admin only)
export async function PATCH(request: NextRequest) {
  try {
    const authResult = await requireAdmin()
    if (!authResult.authenticated) {
      return NextResponse.json(
        { success: false, message: authResult.error },
        { status: authResult.status }
      )
    }

    const { user: adminUser } = authResult
    const payload = await getPayload({ config })
    const body = await request.json()
    const { userId, role } = body as { userId: string; role: 'admin' | 'user' }

    if (!userId || !role) {
      return NextResponse.json(
        { success: false, message: 'userId and role are required' },
        { status: 400 }
      )
    }

    if (!['admin', 'user'].includes(role)) {
      return NextResponse.json(
        { success: false, message: 'Invalid role. Must be "admin" or "user"' },
        { status: 400 }
      )
    }

    // Prevent admin from demoting themselves
    if (userId === adminUser.id && role !== 'admin') {
      return NextResponse.json(
        { success: false, message: 'You cannot change your own role' },
        { status: 400 }
      )
    }

    const updatedUser = await payload.update({
      collection: 'users',
      id: userId,
      data: { role },
      overrideAccess: true,
    })

    return NextResponse.json({
      success: true,
      message: `User role updated to ${role}`,
      data: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
      },
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { success: false, message: 'Error updating user', error: errorMessage },
      { status: 500 }
    )
  }
}

// DELETE - Delete a user (admin only)
export async function DELETE(request: NextRequest) {
  try {
    const authResult = await requireAdmin()
    if (!authResult.authenticated) {
      return NextResponse.json(
        { success: false, message: authResult.error },
        { status: authResult.status }
      )
    }

    const { user: adminUser } = authResult
    const payload = await getPayload({ config })
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'userId is required' },
        { status: 400 }
      )
    }

    // Prevent admin from deleting themselves
    if (userId === adminUser.id) {
      return NextResponse.json(
        { success: false, message: 'You cannot delete your own account' },
        { status: 400 }
      )
    }

    await payload.delete({
      collection: 'users',
      id: userId,
      overrideAccess: true,
    })

    return NextResponse.json({
      success: true,
      message: 'User deleted successfully',
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { success: false, message: 'Error deleting user', error: errorMessage },
      { status: 500 }
    )
  }
}
