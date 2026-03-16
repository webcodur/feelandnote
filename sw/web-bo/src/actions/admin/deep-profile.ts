'use server'

import { R2_PUBLIC_URL, uploadToR2 } from '@/lib/r2'

export interface DeepAnecdote {
  title: string
  body: string
  source: string
  period: string
}

export interface DeepProfile {
  version: number
  celeb_id: string
  slug: string
  locale: string
  biography: {
    title: string
    body: string
  }
  anecdotes: DeepAnecdote[]
}

/** R2에서 심화 열전 데이터 fetch */
export async function getDeepProfile(
  celebId: string,
  locale: string = 'ko'
): Promise<DeepProfile | null> {
  const url = `${R2_PUBLIC_URL}/celebs/${celebId}/deep/${locale}.json?v=${Date.now()}`
  try {
    const res = await fetch(url, { cache: 'no-store' })
    if (!res.ok) return null
    return (await res.json()) as DeepProfile
  } catch {
    return null
  }
}

/** R2에 심화 열전 데이터 업로드 */
export async function saveDeepProfile(data: DeepProfile): Promise<void> {
  const key = `celebs/${data.celeb_id}/deep/${data.locale}.json`
  const body = Buffer.from(JSON.stringify(data, null, 2), 'utf-8')
  await uploadToR2(key, body, 'application/json; charset=utf-8')
}
