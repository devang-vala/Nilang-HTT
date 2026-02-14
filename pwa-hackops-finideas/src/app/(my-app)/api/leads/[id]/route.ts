import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '../../../../../payload.config'
import { z } from 'zod'

interface Lead {
    id: string
    name: string
    companyName?: string | null
    contactNo: string
    email: string
    photo?: string | { id: string } | null
    voiceNote?: string | { id: string } | null
    tags: 'hot' | 'warm' | 'cold'
    createdAt: string
    updatedAt: string
}

const leadSchema = z.object({
    name: z
        .string({ required_error: 'Name is required' })
        .min(2, 'Name must be at least 2 characters')
        .max(100, 'Name cannot exceed 100 characters')
        .trim(),
    companyName: z
        .string()
        .max(150, 'Company name cannot exceed 150 characters')
        .trim()
        .optional()
        .nullable(),
    contactNo: z
        .string({ required_error: 'Contact number is required' })
        .regex(
            /^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,4}[-\s.]?[0-9]{1,9}$/,
            'Please provide a valid contact number'
        )
        .trim(),
    email: z
        .string({ required_error: 'Email is required' })
        .email('Please provide a valid email address')
        .toLowerCase()
        .trim(),
    photo: z.string().optional().nullable(),
    voiceNote: z.string().optional().nullable(),
    tags: z.enum(['hot', 'warm', 'cold'], {
        required_error: 'Tag is required',
    }),
})

// Helper function to format lead response
const formatLead = (lead: Lead): Lead => ({
    id: lead.id,
    name: lead.name,
    companyName: lead.companyName,
    contactNo: lead.contactNo,
    email: lead.email,
    photo: typeof lead.photo === 'string' ? lead.photo : lead.photo?.id || null,
    voiceNote: typeof lead.voiceNote === 'string' ? lead.voiceNote : lead.voiceNote?.id || null,
    tags: lead.tags,
    createdAt: lead.createdAt,
    updatedAt: lead.updatedAt,
})

// GET - Fetch single lead
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const payload = await getPayload({ config })
        const { id } = await params

        const lead = await payload.findByID({
            collection: 'leads',
            id,
        })

        if (!lead) {
            return NextResponse.json(
                {
                    success: false,
                    message: 'Lead not found',
                },
                { status: 404 }
            )
        }

        return NextResponse.json({
            success: true,
            message: 'Lead fetched successfully',
            data: formatLead(lead),
        })
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        return NextResponse.json(
            {
                success: false,
                message: 'Error fetching lead',
                error: errorMessage,
            },
            { status: 500 }
        )
    }
}

// PUT - Update lead
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const payload = await getPayload({ config })
        const { id } = await params
        const body = await request.json()

        // Validate input
        const result = leadSchema.safeParse(body)
        if (!result.success) {
            const errorMessages = result.error.errors.map((err) => ({
                field: err.path.join('.'),
                message: err.message,
            }))

            return NextResponse.json(
                {
                    success: false,
                    message: 'Validation failed',
                    errors: errorMessages,
                },
                { status: 400 }
            )
        }

        const lead = await payload.update({
            collection: 'leads',
            id,
            data: result.data,
        })

        return NextResponse.json({
            success: true,
            message: 'Lead updated successfully',
            data: formatLead(lead),
        })
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        return NextResponse.json(
            {
                success: false,
                message: 'Error updating lead',
                error: errorMessage,
            },
            { status: 500 }
        )
    }
}

// DELETE - Delete lead
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const payload = await getPayload({ config })
        const { id } = await params

        const lead = await payload.delete({
            collection: 'leads',
            id,
        })

        return NextResponse.json({
            success: true,
            message: 'Lead deleted successfully',
            data: formatLead(lead),
        })
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        return NextResponse.json(
            {
                success: false,
                message: 'Error deleting lead',
                error: errorMessage,
            },
            { status: 500 }
        )
    }
}