import { getPayload } from 'payload'
import config from '@/payload.config'

// Reusable helper — cached per request by Next.js
export async function getPayloadClient() {
  return getPayload({ config })
}