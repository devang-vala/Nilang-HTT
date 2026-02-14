import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, password } = body

    // Validate input
    if (!email || !password || !name) {
      return NextResponse.json(
        { errors: [{ message: 'Name, email, and password are required' }] },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { errors: [{ message: 'Password must be at least 6 characters' }] },
        { status: 400 }
      )
    }

    const payload = await getPayload({ config })

    // Check if user already exists
    const existingUsers = await payload.find({
      collection: 'users',
      where: { email: { equals: email.toLowerCase() } },
      limit: 1,
      overrideAccess: true,
    })

    if (existingUsers.docs.length > 0) {
      return NextResponse.json(
        { errors: [{ message: 'A user with this email already exists' }] },
        { status: 409 }
      )
    }

    // Create user via Payload Local API — overrideAccess bypasses all access control
    const user = await payload.create({
      collection: 'users',
      data: {
        name,
        email: email.toLowerCase(),
        password,
        role: 'user',
      },
      overrideAccess: true, // This is the key — bypasses the 403
    })

    return NextResponse.json(
      {
        message: 'User created successfully',
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      },
      { status: 201 }
    )
  } catch (error: unknown) {
    console.error('Registration error:', error)

    const message =
      error instanceof Error ? error.message : 'Registration failed'

    return NextResponse.json(
      { errors: [{ message }] },
      { status: 500 }
    )
  }
}