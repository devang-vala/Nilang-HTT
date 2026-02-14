import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '../../../../payload.config'
import { z } from 'zod'

// Zod validation schema
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

// GET - Fetch all leads
export async function GET(request: NextRequest) {
    try {
        const payload = await getPayload({ config })
        const { searchParams } = new URL(request.url)

        const page = parseInt(searchParams.get('page') || '1')
        const limit = parseInt(searchParams.get('limit') || '10')
        const tags = searchParams.get('tags')

        const where: Record<string, { equals: string }> = {}
        if (tags) {
            where.tags = { equals: tags }
        }

        const leads = await payload.find({
            collection: 'leads',
            where,
            page,
            limit,
            sort: '-createdAt',
        })

        // Format response to include id
        const formattedLeads = leads.docs.map((lead) => ({
            id: lead.id,
            name: lead.name,
            companyName: lead.companyName,
            contactNo: lead.contactNo,
            email: lead.email,
            photo: lead.photo,
            voiceNote: lead.voiceNote,
            tags: lead.tags,
            createdAt: lead.createdAt,
            updatedAt: lead.updatedAt,
        }))

        return NextResponse.json({
            success: true,
            message: 'Leads fetched successfully',
            data: formattedLeads,
            pagination: {
                currentPage: leads.page,
                totalPages: leads.totalPages,
                totalLeads: leads.totalDocs,
                limit: leads.limit,
            },
        })
    } catch (error: unknown) {
        return NextResponse.json(
            {
                success: false,
                message: 'Error fetching leads',
                error: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        )
    }
}

// POST - Create a new lead
export async function POST(request: NextRequest) {
    try {
        const payload = await getPayload({ config })
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

        const lead = await payload.create({
            collection: 'leads',
            data: result.data,
        })

        // Format response to include id
        const formattedLead = {
            id: lead.id,
            name: lead.name,
            companyName: lead.companyName,
            contactNo: lead.contactNo,
            email: lead.email,
            photo: lead.photo,
            voiceNote: lead.voiceNote,
            tags: lead.tags,
            createdAt: lead.createdAt,
            updatedAt: lead.updatedAt,
        }

        return NextResponse.json(
            {
                success: true,
                message: 'Lead created successfully',
                data: formattedLead,
            },
            { status: 201 }
        )
    } catch (error: unknown) {
        // Handle duplicate email
        if (error instanceof Error && error.message?.includes('duplicate')) {
            return NextResponse.json(
                {
                    success: false,
                    message: 'Lead with this email already exists',
                },
                { status: 400 }
            )
        }

        return NextResponse.json(
            {
                success: false,
                message: 'Error creating lead',
                error: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        )
    }
}