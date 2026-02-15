/**
 * Seed an admin user directly into the database.
 *
 * Usage:
 *   npx tsx scripts/seed-admin.ts
 *
 * Environment variables required (from .env):
 *   DATABASE_URL   – MongoDB connection string
 *   PAYLOAD_SECRET – Payload secret key
 *
 * You can also pass custom values via CLI env vars:
 *   ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD=secret123 ADMIN_NAME="Super Admin" npx tsx scripts/seed-admin.ts
 */

import 'dotenv/config'
import { getPayload } from 'payload'
import type { RequiredDataFromCollectionSlug } from 'payload'
import config from '../src/payload.config'

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@finideas.com'
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin@123'
const ADMIN_NAME = process.env.ADMIN_NAME || 'Admin'

async function seed() {
  console.log('🔧 Initializing Payload...')

  const payload = await getPayload({ config })

  // Check if an admin already exists
  const existing = await payload.find({
    collection: 'users',
    where: { email: { equals: ADMIN_EMAIL } },
    limit: 1,
  })

  if (existing.docs.length > 0) {
    const user = existing.docs[0] as { role?: string }
    if (user.role === 'admin') {
      console.log(`✅ Admin user already exists: ${ADMIN_EMAIL}`)
    } else {
      // Upgrade existing user to admin
      await payload.update({
        collection: 'users',
        id: existing.docs[0].id,
        data: { role: 'admin' } as Record<string, unknown>,
      })
      console.log(`⬆️  Upgraded existing user to admin: ${ADMIN_EMAIL}`)
    }
  } else {
    // Create new admin user
    const userData = {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      name: ADMIN_NAME,
      role: 'admin' as const,
    } satisfies RequiredDataFromCollectionSlug<'users'>
    await payload.create({
      collection: 'users',
      data: userData,
    })
    console.log(`🎉 Admin user created successfully!`)
    console.log(`   Email:    ${ADMIN_EMAIL}`)
    console.log(`   Password: ${ADMIN_PASSWORD}`)
    console.log(`   ⚠️  Change this password after first login!`)
  }

  process.exit(0)
}

seed().catch((err) => {
  console.error('❌ Failed to seed admin user:', err)
  process.exit(1)
})
