import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '../../../../payload.config'
import { z } from 'zod'
import { assignTagsFromTranscript } from '@/lib/assignTagsFromTranscript'
import { FOLLOW_UP_TAG_VALUES, followUpTagsToDisplay } from '@/lib/followUpTags'
import { reverseGeocode } from '@/lib/server/reverseGeocode'
import { requireAuth } from '@/lib/auth'

/** Normalize phone to match client: digits only, no +; +91 X and X both become same 10 digits. */
function normalizePhoneForDb(phone: string): string {
  let digits = (phone || '').replace(/\D/g, '')
  if (digits.startsWith('0') && digits.length > 10) digits = digits.slice(1)
  if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2)
  if (digits.length === 11 && digits.startsWith('91')) digits = digits.slice(2)
  if (digits.length >= 10 && /^[6-9]/.test(digits.slice(-10))) digits = digits.slice(-10)
  return digits.length >= 10 ? digits : (phone || '').trim()
}

// Zod validation schema (tag values from backend-only followUpTags)
const followUpTagValues = FOLLOW_UP_TAG_VALUES

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
    voiceNoteTranscript: z.string().trim().optional().nullable(),
    followUpTags: z
        .array(z.enum(followUpTagValues))
        .min(0)
        .max(2)
        .optional()
        .nullable(),
    tags: z.enum(['hot', 'warm', 'cold'], {
        required_error: 'Tag is required',
    }),
    qrData: z.string().max(1000).trim().optional().nullable(),
    latitude: z.number().optional().nullable(),
    longitude: z.number().optional().nullable(),
    locationName: z.string().optional().nullable(),
    city: z.string().optional().nullable(),
    state: z.string().optional().nullable(),
    country: z.string().optional().nullable(),
    /** Client sends first-locker user id so assignee is preserved on create (only accepted when self or admin) */
    createdByUserId: z.string().optional().nullable(),
})

// GET - Fetch leads (filtered by role)
export async function GET(request: NextRequest) {
    try {
        // Require authentication
        const authResult = await requireAuth()
        if (!authResult.authenticated) {
            return NextResponse.json(
                { success: false, message: authResult.error },
                { status: authResult.status }
            )
        }

        const { user: currentUser } = authResult
        const payload = await getPayload({ config })
        const { searchParams } = new URL(request.url)

        const page = parseInt(searchParams.get('page') || '1')
        const limit = parseInt(searchParams.get('limit') || '10')
        const tags = searchParams.get('tags')

        // Build where filter: admin sees all, user sees their own
        const where: Record<string, { equals: string }> = {}
        if (tags) {
            where.tags = { equals: tags }
        }
        if (currentUser.role !== 'admin') {
            where.createdBy = { equals: currentUser.id }
        }

        const leads = await payload.find({
            collection: 'leads',
            where,
            page,
            limit,
            sort: '-createdAt',
            overrideAccess: true,
        })

        // Format response: followUpTags with labels from backend (frontend only displays)
        const formattedLeads = leads.docs.map((lead) => {
            const rawTags = (lead as { followUpTags?: string[] | null }).followUpTags
            const leadAny = lead as unknown as Record<string, unknown>
            return {
                id: lead.id,
                name: lead.name,
                companyName: lead.companyName,
                contactNo: lead.contactNo,
                email: lead.email,
                photo: lead.photo,
                voiceNote: lead.voiceNote,
                voiceNoteTranscript: (lead as { voiceNoteTranscript?: string | null }).voiceNoteTranscript,
                followUpTags: followUpTagsToDisplay(rawTags ?? undefined),
                tags: lead.tags,
                qrData: leadAny.qrData ?? null,
                latitude: leadAny.latitude ?? null,
                longitude: leadAny.longitude ?? null,
                locationName: leadAny.locationName ?? null,
                city: leadAny.city ?? null,
                state: leadAny.state ?? null,
                country: leadAny.country ?? null,
                createdAt: lead.createdAt,
                updatedAt: lead.updatedAt,
            }
        })

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

// POST - Create or update lead (deduplicate by phone in MongoDB)
export async function POST(request: NextRequest) {
    try {
        // Require authentication
        const authResult = await requireAuth()
        if (!authResult.authenticated) {
            return NextResponse.json(
                { success: false, message: authResult.error },
                { status: authResult.status }
            )
        }

        const { user: currentUser } = authResult
        const payload = await getPayload({ config })
        const body = await request.json()

        const result = leadSchema.safeParse(body)
        if (!result.success) {
            const errorMessages = result.error.errors.map((err) => ({
                field: err.path.join('.'),
                message: err.message,
            }))
            return NextResponse.json(
                { success: false, message: 'Validation failed', errors: errorMessages },
                { status: 400 }
            )
        }

        const contactNoCanonical = normalizePhoneForDb(result.data.contactNo)
        const data = { ...result.data, contactNo: contactNoCanonical }

        // Server-side reverse geocoding if coordinates are present but location not resolved
        if (data.latitude && data.longitude && !data.locationName) {
            try {
                const geo = await reverseGeocode(data.latitude, data.longitude)
                data.locationName = geo.displayName
                data.city = geo.city
                data.state = geo.state
                data.country = geo.country
            } catch (err) {
                console.warn('Reverse geocoding failed:', err)
            }
        }

        const existing = await payload.find({
            collection: 'leads',
            where: { contactNo: { equals: contactNoCanonical } },
            limit: 1,
        })

        const existingLead = existing.docs[0] as typeof existing.docs[0] & { voiceNoteTranscript?: string | null; followUpTags?: string[] | null; ocrRawText?: string | null }

        // When transcript is present, backend auto-assigns follow-up tags from sentiment/intent (ignore client tags)
        let followUpTags: typeof data.followUpTags = data.followUpTags ?? null
        if (data.voiceNoteTranscript?.trim()) {
            const assigned = await assignTagsFromTranscript(data.voiceNoteTranscript)
            followUpTags = assigned.length > 0 ? assigned : null
        }

        if (existing.docs.length > 0) {
            // Update: merge data only; do NOT set createdBy so the first user who locked this client stays assigned
            const merged = {
                name: (data.name?.trim() || existingLead.name) as string,
                companyName: (data.companyName?.trim() || existingLead.companyName) ?? null,
                contactNo: data.contactNo,
                email: data.email,
                photo: data.photo ?? existingLead.photo,
                voiceNote: data.voiceNote ?? existingLead.voiceNote,
                tags: data.tags,
                voiceNoteTranscript: data.voiceNoteTranscript?.trim() || existingLead.voiceNoteTranscript || null,
                followUpTags: (followUpTags?.length ? followUpTags : existingLead.followUpTags) ?? existingLead.followUpTags,
                qrData: data.qrData?.trim() || (existingLead as unknown as Record<string, unknown>).qrData || null,
                latitude: data.latitude ?? (existingLead as unknown as Record<string, unknown>).latitude ?? null,
                longitude: data.longitude ?? (existingLead as unknown as Record<string, unknown>).longitude ?? null,
                locationName: data.locationName ?? (existingLead as unknown as Record<string, unknown>).locationName ?? null,
                city: data.city ?? (existingLead as unknown as Record<string, unknown>).city ?? null,
                state: data.state ?? (existingLead as unknown as Record<string, unknown>).state ?? null,
                country: data.country ?? (existingLead as unknown as Record<string, unknown>).country ?? null,
            }
            const updateData: Record<string, unknown> = { ...merged }
            const lead = await payload.update({
                collection: 'leads',
                id: existingLead.id,
                data: updateData,
            })
            const leadWithExtras = lead as typeof lead & { voiceNoteTranscript?: string | null; followUpTags?: string[] | null }
            const leadAny = lead as unknown as Record<string, unknown>
            const formattedLead = {
                id: lead.id,
                name: lead.name,
                companyName: lead.companyName,
                contactNo: lead.contactNo,
                email: lead.email,
                photo: lead.photo,
                voiceNote: lead.voiceNote,
                voiceNoteTranscript: leadWithExtras.voiceNoteTranscript,
                followUpTags: leadWithExtras.followUpTags,
                tags: lead.tags,
                qrData: leadAny.qrData ?? null,
                latitude: leadAny.latitude ?? null,
                longitude: leadAny.longitude ?? null,
                locationName: leadAny.locationName ?? null,
                city: leadAny.city ?? null,
                state: leadAny.state ?? null,
                country: leadAny.country ?? null,
                createdAt: lead.createdAt,
                updatedAt: lead.updatedAt,
            }
            return NextResponse.json({ success: true, message: 'Lead updated successfully', data: formattedLead }, { status: 201 })
        }

        // Use client's first-locker id only when self or admin (so merged data does not replace assignee)
        const createdBy =
            data.createdByUserId &&
            (data.createdByUserId === currentUser.id || currentUser.role === 'admin')
                ? data.createdByUserId
                : currentUser.id
        // eslint-disable-next-line @typescript-eslint/no-unused-vars -- omit from payload create
        const { createdByUserId, ...dataForCreate } = data
        const createData = {
                ...dataForCreate,
                followUpTags,
                createdBy,
        }
        const lead = await payload.create({
            collection: 'leads',
            data: createData as typeof data & { createdBy: string; followUpTags: typeof followUpTags },
            overrideAccess: true,
        })

        const leadWithExtras = lead as typeof lead & { voiceNoteTranscript?: string | null; followUpTags?: string[] | null }
        const leadAny2 = lead as unknown as Record<string, unknown>
        const formattedLead = {
            id: lead.id,
            name: lead.name,
            companyName: lead.companyName,
            contactNo: lead.contactNo,
            email: lead.email,
            photo: lead.photo,
            voiceNote: lead.voiceNote,
            voiceNoteTranscript: leadWithExtras.voiceNoteTranscript,
            followUpTags: leadWithExtras.followUpTags,
            tags: lead.tags,
            qrData: leadAny2.qrData ?? null,
            latitude: leadAny2.latitude ?? null,
            longitude: leadAny2.longitude ?? null,
            locationName: leadAny2.locationName ?? null,
            city: leadAny2.city ?? null,
            state: leadAny2.state ?? null,
            country: leadAny2.country ?? null,
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