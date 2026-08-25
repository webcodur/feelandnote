import { spawn, type ChildProcess } from 'node:child_process'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import sharp from 'sharp'
import { CACHE_TAGS } from '@feelandnote/shared/constants/cache-tags'
import { uploadToR2, R2_PUBLIC_URL } from '@/lib/r2'
import { buildSmallAvatar, smallAvatarKey } from '@/lib/avatar-small'
import { revalidateWebCeleb } from '@/lib/revalidate-web'
import { createAdminClient } from '@/lib/supabase/admin'

const NOBG_BATCH_DIR = 'C:\\project\\nobg\\batch'
const NOBG_SCRIPT = path.join(NOBG_BATCH_DIR, 'batch_nobg.py')
const MAX_SOURCE_BYTES = 30 * 1024 * 1024
// 배경 제거 모델은 973MB짜리라 프로세스를 띄울 때마다 다시 읽는다.
// 그래서 여러 장을 한 폴더에 모아 파이썬을 한 번만 실행한다.
const PROCESS_BASE_TIMEOUT_MS = 2 * 60 * 1000
const PROCESS_PER_IMAGE_TIMEOUT_MS = 60 * 1000
const PROCESS_MAX_TIMEOUT_MS = 30 * 60 * 1000

export interface NobgAvatarResult {
  url?: string
  error?: string
}

export interface ProcessNobgAvatarsOptions {
  /** 대량 처리기는 마지막에 캐시를 한 번에 비우므로 인물별 호출을 끌 수 있다. */
  revalidate?: boolean
}

function terminateProcessTree(child: ChildProcess): Promise<void> {
  if (!child.pid) {
    child.kill('SIGKILL')
    return Promise.resolve()
  }
  if (process.platform !== 'win32') {
    child.kill('SIGKILL')
    return Promise.resolve()
  }

  return new Promise((resolve) => {
    const killer = spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], {
      shell: false,
      stdio: 'ignore',
      windowsHide: true,
    })
    killer.once('error', () => {
      child.kill('SIGKILL')
      resolve()
    })
    killer.once('close', () => resolve())
  })
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

function runNobg(workDir: string, imageCount: number): Promise<string> {
  const timeoutMs = Math.min(
    PROCESS_MAX_TIMEOUT_MS,
    PROCESS_BASE_TIMEOUT_MS + PROCESS_PER_IMAGE_TIMEOUT_MS * imageCount
  )

  return new Promise<string>((resolve, reject) => {
    const child = spawn('py', ['-3.12', NOBG_SCRIPT, 'rembg'], {
      cwd: NOBG_BATCH_DIR,
      // 파이썬 출력이 cp949로 나오면 한글 실패 사유를 읽지 못한다.
      env: { ...process.env, NOBG_WORK_DIR: workDir, PYTHONIOENCODING: 'utf-8' },
      shell: false,
      windowsHide: true,
    })
    let stdout = ''
    let stderr = ''
    child.stdout.setEncoding('utf8')
    child.stderr.setEncoding('utf8')
    child.stdout.on('data', (chunk: string) => { stdout += chunk })
    child.stderr.on('data', (chunk: string) => { stderr += chunk })

    let timedOut = false
    const timer = setTimeout(() => {
      timedOut = true
      void terminateProcessTree(child).finally(() => {
        reject(new Error(`nobg 처리가 ${Math.round(timeoutMs / 60000)}분을 초과해 중단되었습니다.`))
      })
    }, timeoutMs)

    child.on('error', (error) => {
      clearTimeout(timer)
      if (timedOut) return
      reject(new Error(`nobg 실행 실패: ${error.message}`))
    })
    child.on('close', (code) => {
      clearTimeout(timer)
      if (timedOut) return
      if (code === 0) {
        resolve(stdout)
        return
      }
      const detail = stderr.trim() || stdout.trim() || `exit ${code}`
      reject(new Error(`nobg 처리 실패: ${detail.slice(-1200)}`))
    })
  })
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
  celeb: { id: string; slug: string | null },
  result: Buffer,
  revalidate: boolean
): Promise<string> {
  // 파이썬 결과는 무손실 중간본이다. 서비스 등록 단계에서만 800px·q95로 한 번 인코딩한다.
  const finalAvatar = await sharp(result)
    .resize(800, 800, { fit: 'fill' })
    .webp({ quality: 95 })
    .toBuffer()
  const stats = await sharp(finalAvatar).stats()
  const alpha = stats.channels[3]
  if (!alpha || alpha.min >= 255) {
    throw new Error('배경 제거 결과에 투명 영역이 없습니다. 다른 원본으로 다시 시도하세요.')
  }

  const key = `celebs/${celeb.id}/avatar.webp`
  await uploadToR2(key, finalAvatar, 'image/webp')
  // 배경을 지운 새 얼굴로 작은 판도 다시 만든다 — 안 하면 그 인물만 옛 얼굴이 남는다
  await uploadToR2(smallAvatarKey(celeb.id), await buildSmallAvatar(finalAvatar), 'image/webp')

  const url = `${R2_PUBLIC_URL}/${key}?v=${Date.now()}`
  const admin = createAdminClient()
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

  try {
    await Promise.all([
      mkdir(originalsDir, { recursive: true }),
      mkdir(outputDir, { recursive: true }),
    ])

    // 원본을 한 폴더에 모은다. 여기서 걸러진 인물은 파이썬에 넘기지 않는다.
    const prepared: { id: string; slug: string | null }[] = []
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
        prepared.push({ id: celeb.id, slug: celeb.slug })
      } catch (downloadError) {
        record(celebId, { error: fail(downloadError) })
      }
    }
    if (prepared.length === 0) return results

    let failures = new Map<string, string>()
    try {
      failures = parseFailures(await runNobg(workDir, prepared.length))
    } catch (runError) {
      for (const celeb of prepared) record(celeb.id, { error: fail(runError) })
      return results
    }

    for (const celeb of prepared) {
      try {
        const output = await readFile(path.join(outputDir, `${celeb.id}_nobg.webp`)).catch(() => null)
        if (!output) {
          throw new Error(failures.get(celeb.id) || '배경 제거 결과가 나오지 않았습니다. 다른 원본으로 다시 시도하세요.')
        }
        record(celeb.id, {
          url: await publishNobgAvatar(celeb, output, options.revalidate !== false),
        })
      } catch (publishError) {
        record(celeb.id, { error: fail(publishError) })
      }
    }
    return results
  } finally {
    const resolvedWorkDir = path.resolve(workDir)
    const resolvedTempRoot = path.resolve(tmpdir()) + path.sep
    if (resolvedWorkDir.startsWith(resolvedTempRoot) && path.basename(resolvedWorkDir).startsWith('feelandnote-nobg-')) {
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
