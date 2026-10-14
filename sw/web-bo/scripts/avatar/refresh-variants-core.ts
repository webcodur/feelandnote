import sharp from 'sharp'
import { createHash } from 'node:crypto'
import { CELEB_AVATAR_ORIGINAL, CELEB_AVATAR_SMALL, CELEB_AVATAR_MEDIUM } from '@feelandnote/shared/constants/celeb-avatar-small'
import { AVATAR_RESIZE_REVISION, buildSmallAvatar, buildMediumAvatar, smallAvatarKey, mediumAvatarKey } from '../../src/lib/avatar-small'

export type Target = { id: string; slug: string | null; avatar_url: string }
export type Stored = { etag: string; bytes: number }
export type ObjectData = Stored & { body: Buffer }
export interface VariantIO {
  head(key: string): Promise<Stored | null>
  read(key: string): Promise<ObjectData>
  put(key: string, body: Buffer, previous: Stored | null, metadata: Record<string, string>): Promise<void>
  currentUrl(id: string): Promise<string | null>
  publish(id: string, expectedUrl: string, nextUrl: string): Promise<boolean>
}
export class AvatarChanged extends Error {}
export const sha256 = (body: Buffer) => createHash('sha256').update(body).digest('hex')

/** 원본은 읽기만 한다. 두 파생 파일 검증 뒤 기존 DB 주소와 일치할 때 새 버전을 공개한다. */
export async function refreshVariants(target: Target, io: VariantIO, mode: 'plan' | 'execute' | 'verify', preview?: (key: string, body: Buffer) => Promise<void>) {
  const sourceKey = `celebs/${target.id}/${CELEB_AVATAR_ORIGINAL.file}`
  const source = await io.read(sourceKey)
  const input = await sharp(source.body).metadata()
  if (!input.width || input.width !== input.height) throw new Error(`Non-square source: ${input.width}x${input.height}`)
  const assertCurrent = async () => {
    const [current, currentUrl] = await Promise.all([io.head(sourceKey), io.currentUrl(target.id)])
    if (current?.etag !== source.etag || currentUrl !== target.avatar_url) throw new AvatarChanged('Original or DB URL changed during refresh')
  }
  await assertCurrent()
  const smallKey = smallAvatarKey(target.id), mediumKey = mediumAvatarKey(target.id)
  const [small, medium, previousSmall, previousMedium] = await Promise.all([
    buildSmallAvatar(source.body), buildMediumAvatar(source.body), io.head(smallKey), io.head(mediumKey),
  ])
  const variants = [
    { key: smallKey, body: small, previous: previousSmall, spec: CELEB_AVATAR_SMALL },
    { key: mediumKey, body: medium, previous: previousMedium, spec: CELEB_AVATAR_MEDIUM },
  ]
  for (const variant of variants) {
    const output = await sharp(variant.body).metadata()
    const expected = Math.min(input.width, variant.spec.sizePx)
    if (output.width !== expected || output.height !== expected || !!output.hasAlpha !== !!input.hasAlpha) throw new Error(`Dimensions/alpha mismatch: ${variant.key}`)
    if (preview) await preview(variant.key, variant.body)
  }
  const details = { id: target.id, slug: target.slug, sourceEtag: source.etag, revision: AVATAR_RESIZE_REVISION,
    missingSmall: !previousSmall, missingMedium: !previousMedium, smallBytes: small.length, mediumBytes: medium.length }
  if (mode === 'plan') return { status: 'planned', ...details }
  if (mode === 'execute') {
    for (const variant of variants) {
      await assertCurrent()
      await io.put(variant.key, variant.body, variant.previous, { 'source-etag': source.etag, sha256: sha256(variant.body), 'resize-revision': AVATAR_RESIZE_REVISION })
    }
  }
  for (const variant of variants) {
    const stored = await io.read(variant.key)
    if (sha256(stored.body) !== sha256(variant.body)) {
      await assertCurrent()
      throw new Error(`Stored variant checksum mismatch: ${variant.key}`)
    }
  }
  await assertCurrent()
  if (mode === 'verify') return { status: 'verified', ...details }
  const next = new URL(target.avatar_url)
  next.searchParams.set('v', String(Date.now()))
  if (!await io.publish(target.id, target.avatar_url, next.href)) throw new AvatarChanged('DB URL changed before publication')
  const after = await io.head(sourceKey)
  if (after?.etag !== source.etag) throw new AvatarChanged('Original changed at publication; recheck current variants')
  return { status: 'updated', ...details, url: next.href }
}
