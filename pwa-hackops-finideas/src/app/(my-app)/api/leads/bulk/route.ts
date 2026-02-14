import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from "../../../../../payload.config"
import { z } from 'zod'

const leadSchema = z.object({
    name: z.string().min(2).max(100).trim(),
    companyName: z.string().max(150).trim().optional().nullable(),
    contactNo: z
        .string()
        .regex(/^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,4}[-\s.]?[0-9]{1,9}$/)
        .trim(),
    email: z.string().email().toLowerCase().trim(),
    photo: z.string().optional().nullable(),
    voiceNote: z.string().optional().nullable(),
    tags: z.enum(['hot', 'warm', 'cold']),
    localId: z.string().optional(), // For mobile sync tracking
})

const bulkSchema = z.object({
    leads: z.array(leadSchema).min(1, 'At least one lead is required'),
})

// POST - Bulk create leads
export async function POST(request: NextRequest) {
    try {
        const payload = await getPayload({ config })
        const body = await request.json()

        // Validate input
        const result = bulkSchema.safeParse(body)
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

        const results = {
            successful: [] as Array<{ data: typeof leadSchema._type; localId: string | null }>,
            failed: [] as Array<{ data: z.infer<typeof leadSchema>; error: string }>,
        }

        for (const leadData of result.data.leads) {
            try {
                const { localId, ...data } = leadData
                const lead = await payload.create({
                    collection: 'leads',
                    data,
                })
                const transformedLead = {
                    ...lead,
                    photo: typeof lead.photo === 'string' ? lead.photo : (lead.photo?.id || null),
                    voiceNote: typeof lead.voiceNote === 'string' ? lead.voiceNote : null,
                }
                results.successful.push({
                    data: transformedLead,
                    localId: localId || null,
                })
            } catch (error: unknown) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
                results.failed.push({
                    data: leadData,
                    error: errorMessage,
                })
            }
        }

        return NextResponse.json(
            {
                success: true,
                message: 'Bulk sync completed',
                data: {
                    totalReceived: result.data.leads.length,
                    successCount: results.successful.length,
                    failedCount: results.failed.length,
                    successful: results.successful,
                    failed: results.failed,
                },
            },
            { status: 201 }
        )
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
        return NextResponse.json(
            {
                success: false,
                message: 'Error in bulk sync',
                error: errorMessage,
            },
            { status: 500 }
        )
    }
}