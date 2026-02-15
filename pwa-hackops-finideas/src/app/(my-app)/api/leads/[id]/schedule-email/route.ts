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
    })

    if (!lead) {
      return NextResponse.json(
        { success: false, message: 'Lead not found' },
        { status: 404 }
      )
    }

    let finalTemplateId = templateId

    // If no templateId, get default template based on lead priority
    if (!finalTemplateId) {
      const template = await getDefaultTemplate(lead.tags as 'hot' | 'warm' | 'cold', type || 'followup')
      if (template) {
        finalTemplateId = template.id
      }
    }

    if (!finalTemplateId) {
      return NextResponse.json(
        { success: false, message: 'No template found for this priority' },
        { status: 400 }
      )
    }

    // Create scheduled email
    const scheduled = await payload.create({
      collection: 'scheduled-emails',
      data: {
        lead: id,
        template: finalTemplateId,
        scheduledAt: new Date(scheduledAt).toISOString(),
        status: 'pending',
      },
    })

    // Update lead's next follow-up date
    await payload.update({
      collection: 'leads',
      id,
      data: {
        nextFollowUpDate: new Date(scheduledAt).toISOString(),
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Email scheduled successfully',
      data: scheduled,
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: 'Error scheduling email', error: error.message },
      { status: 500 }
    )
  }
}