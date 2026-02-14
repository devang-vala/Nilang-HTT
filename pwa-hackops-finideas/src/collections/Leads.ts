import { CollectionConfig } from 'payload'

export const Leads: CollectionConfig = {
  slug: 'leads',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'companyName', 'email', 'tags', 'createdAt'],
    group: 'Lead Management',
  },
  access: {
    read: () => true,
    create: () => true,
    update: () => true,
    delete: () => true,
  },
  fields: [
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
  ],
  timestamps: true,
}