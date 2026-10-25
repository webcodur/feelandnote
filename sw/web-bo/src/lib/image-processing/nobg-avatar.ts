import { runNobg } from './nobg-process'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import sharp from 'sharp'
import { CACHE_TAGS } from '@feelandnote/shared/constants/cache-tags'
import { CELEB_AVATAR_ORIGINAL } from '@feelandnote/shared/constants/celeb-avatar-small'
import { uploadToR2, R2_PUBLIC_URL } from '@/lib/r2'
import { uploadAvatarVariants } from '@/lib/avatar-small'
import { revalidateWebCeleb } from '@/lib/revalidate-web'
import { createAdminClient } from '@/lib/db/admin'
import { prepareNobgAvatars, encodeNobgAvatar } from './reframe-avatar'

const MAX_SOURCE_BYTES = 30 * 1024 * 1024

export interface NobgAvatarResult {
  url?: string
  error?: string
}

export interface ProcessNobgAvatarsOptions {
  onProgress?: (message: string) => void
  /** 대량 처리기는 마지막에 캐시를 한 번에 비우므로 인물별 호출을 끌 수 있다. */
  revalidate?: boolean
  /** false면 얼굴 검출·재배치 없이 배경만 제거한다. */
  reframe?: boolean
}

/** 배치 스크립트가 인물별로 남기는 실패 사유를 뽑아낸다. */
function parseFailures(stdout: string): Map<string, string> {
  const failures = new Map<string, string>()
  for (const line of stdout.split(/\r?\n/)) {
    const matched = /^\[\d+\/\d+\]\s*실패:\s*(\S+)\s*-\s*(.+)$/.exec(line.trim())
    if (matched) failures.set(matched[1], matched[2].trim())
  }
  return failures
}

async function downloadAvatar(url: string): Promise<Buffer> {
  const response = await fetch(url, { signal: AbortSignal.timeout(30_000) })
  if (!response.ok) throw new Error(`아바타 다운로드 실패: HTTP ${response.status}`)

  const contentLength = Number(response.headers.get('content-length') || 0)
  if (contentLength > MAX_SOURCE_BYTES) throw new Error('아바타 원본이 30MB를 초과합니다.')

  const input = Buffer.from(await response.arrayBuffer())
  if (input.length > MAX_SOURCE_BYTES) throw new Error('아바타 원본이 30MB를 초과합니다.')

  const metadata = await sharp(input).metadata()
  if (!metadata.width || !metadata.height) throw new Error('유효한 이미지 파일이 아닙니다.')
  // 누끼 전에 손실 압축하면 머리카락·피부 경계가 먼저 깎이고 결과에서 복구되지 않는다.
  return sharp(input).rotate().webp({ lossless: true }).toBuffer()
}

async function publishNobgAvatar(
  celeb: { id: string; slug: string | null; avatarUrl: string },
  result: Buffer,
  revalidate: boolean,
  reframe: boolean,
): Promise<string> {
  // contain 리사이즈의 투명 여백으로 누끼 실패를 가리지 않도록 원래 결과부터 확인한다.
  const stats = await sharp(result).stats()
  const alpha = stats.channels[3]
  if (!alpha || alpha.min >= 255) {
    throw new Error('배경 제거 결과에 투명 영역이 없습니다. 다른 원본으로 다시 시도하세요.')
  }
  const finalAvatar = await encodeNobgAvatar(result, reframe)

  // 자원 대기가 길어져도 그 사이 사용자가 고른 새 아바타를 덮어쓰지 않는다.
  const admin = createAdminClient()
  const { data: current, error: readError } = await admin.from('celebs')
    .select('avatar_url').eq('id', celeb.id).maybeSingle()
  if (readError) throw new Error(`등록 전 아바타 확인 실패: ${readError.message}`)
  if (!current || current.avatar_url !== celeb.avatarUrl) {
    throw new Error('대기 중 아바타가 변경되어 현재 사용자 이미지를 보존했습니다.')
  }

  const key = `celebs/${celeb.id}/${CELEB_AVATAR_ORIGINAL.file}`
  await uploadToR2(key, finalAvatar, 'image/webp')
  // 배경을 지운 새 얼굴로 작은 판도 다시 만든다 — 안 하면 그 인물만 옛 얼굴이 남는다
  await uploadAvatarVariants(celeb.id, finalAvatar, (variantKey, body) => uploadToR2(variantKey, body, 'image/webp'))

  const url = `${R2_PUBLIC_URL}/${key}?v=${Date.now()}`
  const { data: updated, error: updateError } = await admin
    .from('celebs')
    .update({ avatar_url: url })
    .eq('id', celeb.id)
    .select('id')
    .maybeSingle()
  if (updateError) throw new Error(`아바타 주소 갱신 실패: ${updateError.message}`)
  if (!updated) throw new Error('아바타 주소를 갱신할 셀럽을 찾을 수 없습니다.')

  if (revalidate) {
    await revalidateWebCeleb(celeb.id, celeb.slug, [CACHE_TAGS.CELEBS])
  }
  return url
}

/**
 * 여러 인물의 아바타 배경을 파이썬 한 번으로 처리한다.
 * 인물별 성패는 따로 담아 돌려주고, 결과가 나오는 대로 onResult로 알린다.
 */
export async function processNobgAvatars(
  celebIds: string[],
  onResult?: (celebId: string, result: NobgAvatarResult) => void,
  options: ProcessNobgAvatarsOptions = {}
): Promise<Map<string, NobgAvatarResult>> {
  const results = new Map<string, NobgAvatarResult>()
  const record = (celebId: string, result: NobgAvatarResult) => {
    results.set(celebId, result)
    onResult?.(celebId, result)
  }
  const fail = (error: unknown) => error instanceof Error ? error.message : '이미지 처리 실패'

  const targets = [...new Set(celebIds)]
  if (targets.length === 0) return results

  const admin = createAdminClient()
  const { data: rows, error } = await admin
    .from('celebs')
    .select('id, slug, avatar_url')
    .in('id', targets)
  if (error) {
    for (const celebId of targets) record(celebId, { error: `셀럽 조회 실패: ${error.message}` })
    return results
  }

  const celebsById = new Map((rows ?? []).map((row) => [row.id, row]))
  const workDir = await mkdtemp(path.join(tmpdir(), 'feelandnote-nobg-'))
  const originalsDir = path.join(workDir, 'originals')
  const outputDir = path.join(workDir, 'nobg')
  let completed = false

  try {
    await Promise.all([
      mkdir(originalsDir, { recursive: true }),
      mkdir(outputDir, { recursive: true }),
    ])

    // 원본을 한 폴더에 모은다. 여기서 걸러진 인물은 파이썬에 넘기지 않는다.
    const prepared: { id: string; slug: string | null; avatarUrl: string }[] = []
    for (const celebId of targets) {
      const celeb = celebsById.get(celebId)
      if (!celeb) {
        record(celebId, { error: '셀럽을 찾을 수 없습니다.' })
        continue
      }
      if (!celeb.avatar_url) {
        record(celebId, { error: '배경을 제거할 아바타가 없습니다.' })
        continue
      }
      try {
        await writeFile(path.join(originalsDir, `${celeb.id}.webp`), await downloadAvatar(celeb.avatar_url))
        prepared.push({ id: celeb.id, slug: celeb.slug, avatarUrl: celeb.avatar_url })
      } catch (downloadError) {
        record(celebId, { error: fail(downloadError) })
      }
    }
    if (prepared.length === 0) return results

    let failures = new Map<string, string>()
    try {
      failures = parseFailures(await runNobg(workDir, prepared.length, { onProgress: options.onProgress }))
    } catch (runError) {
      for (const celeb of prepared) record(celeb.id, { error: `${fail(runError)} 작업 자료: ${workDir}` })
      return results
    }

    // nobg만 고른 작업은 얼굴 검출·재배치를 건너뛰고 현재 구도를 보존한다.
    const reframe = options.reframe !== false
    options.onProgress?.(reframe ? '얼굴 구도 맞추는 중' : '배경 제거 결과 확인 중')
    let outputs: Awaited<ReturnType<typeof prepareNobgAvatars>>
    try {
      outputs = await prepareNobgAvatars(workDir, { reframe })
    } catch (reframeError) {
      for (const celeb of prepared) record(celeb.id, { error: `${fail(reframeError)} 작업 자료: ${workDir}` })
      return results
    }

    for (const celeb of prepared) {
      options.onProgress?.('아바타 결과 등록 중')
      try {
        const processed = outputs.get(`${celeb.id}_nobg`)
        const output = processed?.file ? await readFile(processed.file).catch(() => null) : null
        if (!output) {
          throw new Error(failures.get(celeb.id) || processed?.error || '배경 제거 결과가 나오지 않았습니다. 다른 원본으로 다시 시도하세요.')
        }
        record(celeb.id, {
          url: await publishNobgAvatar(celeb, output, options.revalidate !== false, reframe),
        })
      } catch (publishError) {
        record(celeb.id, { error: `${fail(publishError)} 작업 자료: ${workDir}` })
      }
    }
    completed = targets.every((id) => Boolean(results.get(id)?.url))
    return results
  } finally {
    const resolvedWorkDir = path.resolve(workDir)
    const resolvedTempRoot = path.resolve(tmpdir()) + path.sep
    if (completed && resolvedWorkDir.startsWith(resolvedTempRoot) && path.basename(resolvedWorkDir).startsWith('feelandnote-nobg-')) {
      await rm(resolvedWorkDir, { recursive: true, force: true })
    }
  }
}

export async function processNobgAvatar(celebId: string): Promise<string> {
  const results = await processNobgAvatars([celebId])
  const result = results.get(celebId)
  if (result?.url) return result.url
  throw new Error(result?.error || '이미지 처리 실패')
}
