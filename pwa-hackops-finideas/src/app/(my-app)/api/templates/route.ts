import { NextResponse } from 'next/server'
import { getAllTemplates, getTemplate, Priority, EmailType } from '@/lib/emailTemplates'
import { requireAuth } from '@/lib/auth'

export async function GET() {
  try {
    const authResult = await requireAuth()
    if (!authResult.authenticated) {
      return NextResponse.json(
        { success: false, message: authResult.error },
        { status: authResult.status }
      )
    }

    const templates = getAllTemplates()

    return NextResponse.json({
      success: true,
      data: templates,
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { success: false, message: 'Error fetching templates', error: errorMessage },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { priority, type } = body as { priority: Priority; type: EmailType }

    if (!priority || !type) {
      return NextResponse.json(
        { success: false, message: 'priority and type are required' },
        { status: 400 }
      )
    }

    const template = getTemplate(priority, type)

    return NextResponse.json({
      success: true,
      data: template,
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { success: false, message: 'Error fetching template', error: errorMessage },
      { status: 500 }
    )
  }
}