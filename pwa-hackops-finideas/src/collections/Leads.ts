import { CollectionConfig } from 'payload'

export const Leads: CollectionConfig = {
  slug: 'leads',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'companyName', 'email', 'tags', 'followUpStatus', 'city', 'createdBy', 'createdAt'],
    group: 'Lead Management',
  },
  access: {
    // Admin can read all leads, regular users can only read their own
    read: ({ req: { user } }) => {
      if (!user) return false
      if (user.role === 'admin') return true
      return { createdBy: { equals: user.id } }
    },
    // Any authenticated user can create leads
    create: ({ req: { user } }) => {
      return !!user
    },
    // Admin can update all, users can only update their own leads
    update: ({ req: { user } }) => {
      if (!user) return false
      if (user.role === 'admin') return true
      return { createdBy: { equals: user.id } }
    },
    // Admin can delete all, users can only delete their own leads
    delete: ({ req: { user } }) => {
      if (!user) return false
      if (user.role === 'admin') return true
      return { createdBy: { equals: user.id } }
    },
  },
  hooks: {
    beforeChange: [
      ({ req, operation, data }) => {
        // Auto-set createdBy on create
        if (operation === 'create' && req.user) {
          data.createdBy = req.user.id
        }
        return data
      },
    ],
  },
  fields: [
    // ============ BASIC LEAD INFO ============
    {
      name: 'name',
      type: 'text',
      required: true,
      minLength: 2,
      maxLength: 100,
      admin: {
        description: 'Full name of the lead',
      },
    },
    {
      name: 'companyName',
      type: 'text',
      maxLength: 150,
      admin: {
        description: 'Company name of the lead',
      },
    },
    {
      name: 'contactNo',
      type: 'text',
      required: true,
      validate: (value: string | null | undefined) => {
        if (!value) return 'Contact number is required'
        const phoneRegex = /^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,4}[-\s.]?[0-9]{1,9}$/
        if (!phoneRegex.test(value)) {
          return 'Please provide a valid contact number'
        }
        return true
      },
      admin: {
        description: 'Contact number with country code',
      },
    },
    {
      name: 'email',
      type: 'email',
      required: true,
      admin: {
        description: 'Email address of the lead',
      },
    },

    // ============ MEDIA UPLOADS ============
    {
      name: 'photo',
      type: 'upload',
      relationTo: 'media',
      admin: {
        description: 'Photo of the lead or business card',
      },
    },
    {
      name: 'voiceNote',
      type: 'upload',
      relationTo: 'media',
      admin: {
        description: 'Voice note recording',
      },
    },

    // ============ TAGS & PRIORITY ============
    {
      name: 'tags',
      type: 'select',
      required: true,
      options: [
        { label: 'Hot 🔥', value: 'hot' },
        { label: 'Warm 🌡️', value: 'warm' },
        { label: 'Cold ❄️', value: 'cold' },
      ],
      defaultValue: 'warm',
      admin: {
        description: 'Lead priority tag',
      },
    },

    // ============ QR CODE DATA ============
    {
      name: 'qrData',
      type: 'text',
      admin: {
        description: 'Data captured from QR code scan (URL or text)',
      },
    },

    // ============ OCR & VOICE PROCESSING ============
    {
      name: 'ocrRawText',
      type: 'textarea',
      admin: {
        description: 'Raw text from visiting card OCR (optional)',
      },
    },
    {
      name: 'voiceNoteSummary',
      type: 'textarea',
      admin: {
        description: 'AI-generated summary of the voice note',
      },
    },
    {
      name: 'voiceNoteTranscript',
      type: 'textarea',
      admin: {
        description: 'Speech-to-text from field voice note (stored in DB only)',
      },
    },

    // ============ FOLLOW-UP STATUS & TAGS ============
    {
      name: 'followUpStatus',
      type: 'select',
      options: [
        { label: 'Pending', value: 'pending' },
        { label: 'Email Sent', value: 'email_sent' },
        { label: 'Meeting Scheduled', value: 'meeting_scheduled' },
        { label: 'Converted', value: 'converted' },
        { label: 'Lost', value: 'lost' },
      ],
      defaultValue: 'pending',
      admin: {
        description: 'Current follow-up status of the lead',
      },
    },
    {
      name: 'followUpTags',
      type: 'select',
      hasMany: true,
      options: [
        { label: 'Product inquiry', value: 'product_inquiry' },
        { label: 'Demo request', value: 'demo_request' },
        { label: 'Partnership interest', value: 'partnership' },
        { label: 'Investment interest', value: 'investment_interest' },
        { label: 'Follow-up call', value: 'follow_up_call' },
        { label: 'Newsletter', value: 'newsletter' },
        { label: 'Event interest', value: 'event_interest' },
        { label: 'Support', value: 'support' },
      ],
      admin: {
        description: 'Curated follow-up tags for Finideas workflow (1–2 per lead)',
      },
      validate: (val: unknown) => {
        if (val == null || (Array.isArray(val) && val.length === 0)) return true
        const arr = Array.isArray(val) ? val : [val]
        if (arr.length < 1) return true
        if (arr.length > 2) return 'Select at most 2 follow-up tags'
        return true
      },
    },
    {
      name: 'nextFollowUpDate',
      type: 'date',
      admin: {
        description: 'Next scheduled follow-up date',
        date: {
          pickerAppearance: 'dayAndTime',
        },
      },
    },

    // ============ EMAIL HISTORY ============
    {
      name: 'emailsSent',
      type: 'array',
      admin: {
        description: 'History of emails sent to this lead',
      },
      fields: [
        {
          name: 'subject',
          type: 'text',
        },
        {
          name: 'template',
          type: 'text',
        },
        {
          name: 'sentAt',
          type: 'date',
        },
        {
          name: 'status',
          type: 'select',
          options: [
            { label: 'Sent', value: 'sent' },
            { label: 'Failed', value: 'failed' },
          ],
        },
      ],
    },

    // ============ MEETINGS HISTORY ============
    {
      name: 'meetings',
      type: 'array',
      admin: {
        description: 'Scheduled Jitsi/Google Meet meetings',
      },
      fields: [
        {
          name: 'meetLink',
          type: 'text',
        },
        {
          name: 'scheduledAt',
          type: 'date',
        },
        {
          name: 'status',
          type: 'select',
          options: [
            { label: 'Scheduled', value: 'scheduled' },
            { label: 'Completed', value: 'completed' },
            { label: 'Cancelled', value: 'cancelled' },
          ],
        },
      ],
    },

    // ============ LOCATION / GEOCODING ============
    {
      name: 'latitude',
      type: 'number',
      admin: {
        description: 'Latitude from device geolocation',
      },
    },
    {
      name: 'longitude',
      type: 'number',
      admin: {
        description: 'Longitude from device geolocation',
      },
    },
    {
      name: 'locationName',
      type: 'text',
      admin: {
        description: 'Full address resolved via reverse geocoding',
      },
    },
    {
      name: 'city',
      type: 'text',
      admin: {
        description: 'City from reverse geocoding',
      },
    },
    {
      name: 'state',
      type: 'text',
      admin: {
        description: 'State from reverse geocoding',
      },
    },
    {
      name: 'country',
      type: 'text',
      admin: {
        description: 'Country from reverse geocoding',
      },
    },

    // ============ OWNERSHIP ============
    {
      name: 'createdBy',
      type: 'relationship',
      relationTo: 'users',
      admin: {
        description: 'User who created this lead',
        readOnly: true,
        position: 'sidebar',
      },
    },
  ],
  timestamps: true,
}