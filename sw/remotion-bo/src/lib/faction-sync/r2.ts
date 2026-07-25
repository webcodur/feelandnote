/**
 * R2(Cloudflare) 업로드 — 서버 전용.
 *
 * sw/web-bo/src/lib/r2.ts 와 같은 규격·같은 환경변수 키(R2_ACCOUNT_ID·R2_ACCESS_KEY_ID·
 * R2_SECRET_ACCESS_KEY·R2_BUCKET_NAME·R2_PUBLIC_URL)를 쓴다. 다른 점은 하나뿐이다:
 * 키가 없는 환경에서 모듈을 불러도 터지지 않게 클라이언트를 첫 업로드 때 만들고,
 * 누락 키는 missingR2Env() 로 미리 알려 출간 결과에 사유로 실어 보낸다(조용한 폴백 금지).
 */

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'

const R2_ENV_KEYS = [
  'R2_ACCOUNT_ID',
  'R2_ACCESS_KEY_ID',
  'R2_SECRET_ACCESS_KEY',
  'R2_BUCKET_NAME',
  'R2_PUBLIC_URL',
] as const

/** 비어 있는 R2 환경변수 목록 — 비어 있지 않으면 이미지 업로드를 시도하지 않는다 */
export function missingR2Env(): string[] {
  return R2_ENV_KEYS.filter(k => !process.env[k])
}

let client: S3Client | null = null

function r2(): S3Client {
  if (client) return client
  const missing = missingR2Env()
  if (missing.length) throw new Error(`R2 환경변수 누락: ${missing.join(', ')}`)
  client = new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  })
  return client
}

/** 업로드 — web-bo 와 동일하게 1년 불변 캐시로 올린다(키에 해시가 붙거나 주소에 ?v= 를 붙여 갱신) */
export async function uploadToR2(key: string, body: Buffer, contentType: string): Promise<void> {
  await r2().send(
    new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: key,
      Body: body,
      ContentType: contentType,
      CacheControl: 'public, max-age=31536000, immutable',
    }),
  )
}

/**
 * 공개 주소. 개인샷은 키가 고정(덮어쓰기)이라 ?v= 로 캐시를 끊는다.
 * 그룹샷은 키에 해시가 들어가 저절로 갈리므로 versioned 를 끈다.
 */
export function publicUrl(key: string, versioned = true): string {
  const base = `${process.env.R2_PUBLIC_URL}/${key}`
  return versioned ? `${base}?v=${Date.now()}` : base
}
