/** Registers a visually reviewed web-generated portrait; existing avatars stay intact. */
import fs from 'node:fs/promises'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { S3Client, GetObjectCommand, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3'
import { createClient } from '@feelandnote/db'
import sharp from 'sharp'
import { CELEB_HERO_PHOTO_SPEC } from '@feelandnote/shared/constants/celeb-hero-photo'
import { uploadPortraitVariants } from '../../src/lib/portrait-variants'
import { revalidateWebCeleb } from '../../src/lib/revalidate-web'

interface ReviewedPortrait {
  slug: string
  celeb_id: string
  image: string
  reference: string
  avatar_url: string
  conversation_url: string
  identity_evidence: string
  prompt: string
  reviewed: boolean
  /** Explicit optimistic lock for a reviewed replacement of an existing portrait. */
  replace_portrait_url?: string
  /** Independently verified photograph or named historical portrait instead of the DB avatar. */
  reference_kind?: 'original-photo' | 'historical-portrait'
  reference_source_note?: string
  /** Hash of an existing R2 photo that was opened and reviewed before replacement. */
  existing_photo_sha256?: string
  crop?: { left: number; top: number; width: number; height: number }
}
const hash = (body: Buffer) => createHash('sha256').update(body).digest('hex')

async function main() {
  const manifest = process.argv[2]
  if (!manifest) throw new Error('Pass a reviewed portrait JSON file')
  for (const line of (await fs.readFile(path.resolve('.env'), 'utf8')).split(/\r?\n/)) {
    const match = line.match(/^([A-Z_0-9]+)=(.*)$/)
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2].trim().replace(/^["']|["']$/g, '')
  }
  const env = process.env as Record<string, string>
  for (const key of ['NEXT_PUBLIC_DB_API_URL', 'DB_SECRET_KEY', 'R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET_NAME', 'R2_PUBLIC_URL']) {
    if (!env[key]) throw new Error(`Missing ${key}`)
  }
  const db = createClient(env.NEXT_PUBLIC_DB_API_URL, env.DB_SECRET_KEY)
  const s3 = new S3Client({ region: 'auto', endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`, credentials: { accessKeyId: env.R2_ACCESS_KEY_ID, secretAccessKey: env.R2_SECRET_ACCESS_KEY } })
  const bucket = env.R2_BUCKET_NAME
  const rows: ReviewedPortrait[] = JSON.parse(await fs.readFile(manifest, 'utf8'))
  const done: unknown[] = []
  for (const row of rows) {
    // 웹 생성은 대화 주소, codex 생성은 로컬 세션 ID로 생성 근거를 남긴다.
    if (row.reviewed !== true || !/^(?:https:\/\/(?:chatgpt\.com\/c\/|grok\.com\/(?:c\/|imagine\/))|codex-session:[0-9a-f-]{36}$)/.test(row.conversation_url) || !/^https?:\/\//.test(row.identity_evidence)) throw new Error(`${row.slug}: missing visual review or source evidence`)
    const { data: person, error: findError } = await db.from('celebs').select('id,slug,nickname,celeb_reality,publication_status,avatar_url,portrait_url').eq('id', row.celeb_id).single()
    if (findError) throw new Error(findError.message)
    const allowedPublication = person?.publication_status === 'active' || (row.replace_portrait_url && person?.publication_status === 'inactive')
    if (!person || person.slug !== row.slug || person.celeb_reality !== 'REAL' || !allowedPublication || person.avatar_url !== row.avatar_url) throw new Error(`${row.slug}: identity, classification, or reference changed`)
    if (row.replace_portrait_url && (person.portrait_url !== row.replace_portrait_url || !row.existing_photo_sha256)) throw new Error(`${row.slug}: replacement target changed or was not reviewed`)
    if (person.portrait_url && !row.replace_portrait_url) { console.log(JSON.stringify({ skipped: row.slug, reason: 'portrait already present' })); continue }
    const source = await fs.readFile(row.image)
    const reference = await fs.readFile(row.reference)
    const independentReference = row.reference_kind === 'original-photo' || row.reference_kind === 'historical-portrait'
    if (row.reference_kind && !independentReference) throw new Error(`${row.slug}: unsupported reference kind`)
    if (independentReference) {
      if (!row.reference_source_note?.trim()) throw new Error(`${row.slug}: independent reference requires its source note`)
    } else {
      const avatarResponse = await fetch(person.avatar_url)
      if (!avatarResponse.ok || hash(Buffer.from(await avatarResponse.arrayBuffer())) !== hash(reference)) throw new Error(`${row.slug}: reference differs from the current avatar`)
    }
    const prefix = `celebs/${person.id}/`
    const key = `${prefix}photo.webp`
    try {
      await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }))
      if (!row.existing_photo_sha256 || !/^[a-f0-9]{64}$/.test(row.existing_photo_sha256)) throw new Error(`${row.slug}: existing R2 photo requires review before replacement`)
      const existing = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }))
      const existingBody = Buffer.from(await existing.Body!.transformToByteArray())
      if (hash(existingBody) !== row.existing_photo_sha256) throw new Error(`${row.slug}: reviewed existing photo changed`)
    } catch (error) {
      const status = (error as { $metadata?: { httpStatusCode?: number } } | null)?.$metadata?.httpStatusCode
      if (status !== 404) throw error
    }
    const oriented = await sharp(source).rotate().toBuffer({ resolveWithObject: true })
    const ratio = CELEB_HERO_PHOTO_SPEC.aspectRatio
    const width = row.crop?.width ?? Math.min(oriented.info.width, Math.round(oriented.info.height * ratio))
    const height = row.crop?.height ?? Math.min(oriented.info.height, Math.round(oriented.info.width / ratio))
    // Allow only rounding trim. A larger framing change needs an independently reviewed crop.
    if (!row.crop && (oriented.info.width - width > 2 || oriented.info.height - height > 2)) throw new Error(`${row.slug}: source is not the reviewed 4:5 frame`)
    if (Math.abs(width - height * ratio) > 1) throw new Error(`${row.slug}: reviewed crop must be 4:5`)
    const crop = row.crop ?? { left: Math.floor((oriented.info.width - width) / 2), top: Math.floor((oriented.info.height - height) / 2), width, height }
    const photo = await sharp(oriented.data).extract(crop)
      .resize(CELEB_HERO_PHOTO_SPEC.storageWidthPx, CELEB_HERO_PHOTO_SPEC.storageHeightPx, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 88 }).toBuffer()
    const objects = new Map<string, Buffer>()
    const put = async (Key: string, Body: Buffer, ContentType = 'image/webp') => {
      objects.set(Key, Body)
      await s3.send(new PutObjectCommand({ Bucket: bucket, Key, Body, ContentType, CacheControl: 'public, max-age=31536000, immutable' }))
    }
    await put(key, photo)
    await uploadPortraitVariants(key, photo, (Key, Body) => put(Key, Body))
    for (const [Key, body] of objects) {
      const uploaded = await s3.send(new GetObjectCommand({ Bucket: bucket, Key }))
      if (hash(Buffer.from(await uploaded.Body!.transformToByteArray())) !== hash(body)) throw new Error(`${row.slug}: R2 byte verification failed: ${Key}`)
    }
    const url = `${env.R2_PUBLIC_URL.replace(/\/$/, '')}/${key}?v=${Date.now()}`
    let update = db.from('celebs').update({ portrait_url: url }).eq('id', person.id).eq('celeb_reality', 'REAL')
    update = row.replace_portrait_url ? update.eq('portrait_url', row.replace_portrait_url) : update.is('portrait_url', null)
    const { data: changed, error: updateError } = await update.select('id')
    if (updateError || changed?.length !== 1) throw new Error(`${row.slug}: DB update failed or a concurrent registration won`)
    const { data: check, error: checkError } = await db.from('celebs').select('slug,avatar_url,portrait_url,publication_status').eq('id', person.id).single()
    if (checkError || check?.portrait_url !== url || check?.avatar_url !== person.avatar_url || check?.publication_status !== person.publication_status) throw new Error(`${row.slug}: DB readback mismatch`)
    const response = await fetch(url)
    if (!response.ok || hash(Buffer.from(await response.arrayBuffer())) !== hash(photo)) throw new Error(`${row.slug}: public photo verification failed`)
    await revalidateWebCeleb(person.id, person.slug)
    const meta = await sharp(photo).metadata()
    const result = { slug: person.slug, name: person.nickname, url, width: meta.width, height: meta.height, verified_objects: objects.size }
    done.push(result)
    console.log(JSON.stringify(result))
  }
  await fs.unlink(manifest)
  console.log(JSON.stringify({ registered: done.length, temporary_manifest_discarded: true }))
}
main().catch(error => { console.error(error.message); process.exitCode = 1 })
