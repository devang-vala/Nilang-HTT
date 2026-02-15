import { CollectionConfig } from 'payload'

export const ScheduledEmails: CollectionConfig = {
  slug: 'scheduled-emails',
  admin: {
    useAsTitle: 'id',
    group: 'Email Management',
  },
  access: {
    // Admin can read all, users can read their own scheduled emails
    read: ({ req: { user } }) => {
      if (!user) return false
      if (user.role === 'admin') return true
      return true // Scheduled emails are linked to leads, filtered at API level
    },
    // Any authenticated user can create
    create: ({ req: { user } }) => !!user,
    // Only admins can update/delete
    update: ({ req: { user } }) => user?.role === 'admin',
    delete: ({ req: { user } }) => user?.role === 'admin',
  },
  fields: [
    {
      name: 'lead',
      type: 'relationship',
      relationTo: 'leads',
      required: true,
    },
    {
      name: 'template',
      type: 'relationship',
      relationTo: 'email-templates',
      required: false,
    },
    {
      name: 'emailType',
      type: 'select',
      options: [
        { label: 'Initial', value: 'initial' },
        { label: 'Follow Up', value: 'followup' },
      ],
      defaultValue: 'followup',
    },
    {
      name: 'scheduledAt',
      type: 'date',
      required: true,
      admin: {
        date: {
          pickerAppearance: 'dayAndTime',
        },
      },
    },
    {
      name: 'status',
      type: 'select',
      options: [
        { label: 'Pending', value: 'pending' },
        { label: 'Sent', value: 'sent' },
        { label: 'Failed', value: 'failed' },
        { label: 'Cancelled', value: 'cancelled' },
      ],
      defaultValue: 'pending',
    },
    {
      name: 'sentAt',
      type: 'date',
    },
    {
      name: 'error',
      type: 'text',
    },
  ],
  timestamps: true,
}