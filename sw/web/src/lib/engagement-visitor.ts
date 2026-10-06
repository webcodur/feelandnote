import 'server-only'

import { createHash, createHmac, randomUUID, timingSafeEqual } from 'node:crypto'
import { cookies } from 'next/headers'

const COOKIE_NAME = 'fn_engagement_visitor'

export async function getEngagementVisitor(): Promise<string> {
  const secret = process.env.DB_SECRET_KEY
  if (!secret) throw new Error('Participation server key is missing')
  const store = await cookies()
  const raw = store.get(COOKIE_NAME)?.value ?? ''
  const [savedId, savedSignature] = raw.split('.')
  const sign = (id: string) => createHmac('sha256', secret).update(`engagement:${id}`).digest('hex')
  const validId = /^[0-9a-f-]{36}$/.test(savedId ?? '')
  const expected = validId ? sign(savedId) : ''
  const valid = validId && /^[0-9a-f]{64}$/.test(savedSignature ?? '')
    && timingSafeEqual(Buffer.from(savedSignature, 'hex'), Buffer.from(expected, 'hex'))
  const id = valid ? savedId : randomUUID()
  if (!valid) {
    store.set(COOKIE_NAME, `${id}.${sign(id)}`, {
      httpOnly: true, secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax', path: '/', maxAge: 365 * 24 * 60 * 60,
    })
  }
  return createHash('sha256').update(id).digest('hex')
}
