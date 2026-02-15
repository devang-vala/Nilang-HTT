import { CollectionConfig } from 'payload'

export const EmailTemplates: CollectionConfig = {
  slug: 'email-templates',
  admin: {
    useAsTitle: 'name',
    group: 'Email Management',
  },
  access: {
    // Anyone authenticated can read templates
    read: ({ req: { user } }) => !!user,
    // Only admins can create/update/delete templates
    create: ({ req: { user } }) => user?.role === 'admin',
    update: ({ req: { user } }) => user?.role === 'admin',
    delete: ({ req: { user } }) => user?.role === 'admin',
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
    },
    {
      name: 'priority',
      type: 'select',
      required: true,
      options: [
        { label: 'Hot 🔥', value: 'hot' },
        { label: 'Warm 🌡️', value: 'warm' },
        { label: 'Cold ❄️', value: 'cold' },
      ],
    },
    {
      name: 'type',
      type: 'select',
      required: true,
      options: [
        { label: 'Initial Contact', value: 'initial' },
        { label: 'Follow Up', value: 'followup' },
        { label: 'Meeting Invite', value: 'meeting' },
        { label: 'Thank You', value: 'thankyou' },
      ],
    },
    {
      name: 'subject',
      type: 'text',
      required: true,
      admin: {
        description: 'Use {{name}}, {{companyName}} for dynamic values',
      },
    },
    {
      name: 'body',
      type: 'textarea',
      required: true,
      admin: {
        description: 'Use {{name}}, {{companyName}}, {{meetLink}}, {{date}} for dynamic values',
      },
    },
    {
      name: 'isActive',
      type: 'checkbox',
      defaultValue: true,
    },
  ],
  timestamps: true,
}