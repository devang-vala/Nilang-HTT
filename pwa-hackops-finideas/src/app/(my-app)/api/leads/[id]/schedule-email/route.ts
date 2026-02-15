import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '../../../../../../payload.config'
import { getDefaultTemplate } from '@/lib/emailService'
import { requireAuth } from '@/lib/auth'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAuth()
    if (!authResult.authenticated) {
      return NextResponse.json(
        { success: false, message: authResult.error },
        { status: authResult.status }
      )
    }

    const { id } = await params
    const body = await request.json()
    const { templateId, scheduledAt, type } = body

    if (!scheduledAt) {
      return NextResponse.json(
        { success: false, message: 'scheduledAt is required' },
        { status: 400 }
      )
    }

    const payload = await getPayload({ config })

    // Get lead
    const lead = await payload.findByID({
      collection: 'leads',
      id,
      overrideAccess: true,
    })

    if (!lead) {
      return NextResponse.json(
        { success: false, message: 'Lead not found' },
        { status: 404 }
      )
    }

    // Try to find a CMS template (optional)
    let finalTemplateId = templateId
    if (!finalTemplateId) {
      const template = await getDefaultTemplate(lead.tags as 'hot' | 'warm' | 'cold', type || 'followup')
      if (template) {
        finalTemplateId = template.id
      }
    }

    const emailType = type || 'followup'

    // Create scheduled email — template is optional, emailType is stored as fallback
    const scheduledData: Record<string, unknown> = {
      lead: id,
      emailType,
      scheduledAt: new Date(scheduledAt).toISOString(),
      status: 'pending',
    }
    if (finalTemplateId) {
      scheduledData.template = finalTemplateId
    }

    const scheduled = await payload.create({
      collection: 'scheduled-emails',
      data: scheduledData as any, // eslint-disable-line @typescript-eslint/no-explicit-any
      overrideAccess: true,
    })

    // Update lead's next follow-up date
    await payload.update({
      collection: 'leads',
      id,
      data: {
        nextFollowUpDate: new Date(scheduledAt).toISOString(),
      } as any, // eslint-disable-line @typescript-eslint/no-explicit-any
      overrideAccess: true,
    })

    return NextResponse.json({
      success: true,
      message: 'Email scheduled successfully',
      data: scheduled,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error scheduling email'
    return NextResponse.json(
      { success: false, message: 'Error scheduling email', error: message },
      { status: 500 }
    )
  }
}