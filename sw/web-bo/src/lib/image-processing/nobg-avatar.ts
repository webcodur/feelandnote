import { spawn, type ChildProcess } from 'node:child_process'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import sharp from 'sharp'
import { CACHE_TAGS } from '@feelandnote/shared/constants/cache-tags'
import { uploadToR2, R2_PUBLIC_URL } from '@/lib/r2'
import { buildSmallAvatar, smallAvatarKey } from '@/lib/avatar-small'
import { revalidateWebCache } from '@/lib/revalidate-web'
import { createAdminClient } from '@/lib/supabase/admin'

const NOBG_BATCH_DIR = 'C:\\project\\nobg\\batch'
const NOBG_SCRIPT = path.join(NOBG_BATCH_DIR, 'batch_nobg.py')
const MAX_SOURCE_BYTES = 30 * 1024 * 1024
const PROCESS_TIMEOUT_MS = 3 * 60 * 1000

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

function runNobg(workDir: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn('py', ['-3.12', NOBG_SCRIPT, 'rembg'], {
      cwd: NOBG_BATCH_DIR,
      env: { ...process.env, NOBG_WORK_DIR: workDir },
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
        reject(new Error('nobg 처리가 3분을 초과해 중단되었습니다.'))
      })
    }, PROCESS_TIMEOUT_MS)

    child.on('error', (error) => {
      clearTimeout(timer)
      if (timedOut) return
      reject(new Error(`nobg 실행 실패: ${error.message}`))
    })
    child.on('close', (code) => {
      clearTimeout(timer)
      if (timedOut) return
      if (code === 0) {
        resolve()
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
  return sharp(input).rotate().webp({ quality: 98 }).toBuffer()
}

async function removeBackgroundWithLocalCpu(source: Buffer, celebId: string): Promise<Buffer> {
  const tempPrefix = path.join(tmpdir(), 'feelandnote-nobg-')
  const workDir = await mkdtemp(tempPrefix)
  const originalsDir = path.join(workDir, 'originals')
  const outputDir = path.join(workDir, 'nobg')
  const sourcePath = path.join(originalsDir, `${celebId}.webp`)
  const outputPath = path.join(outputDir, `${celebId}_nobg.webp`)

  try {
    await Promise.all([
      mkdir(originalsDir, { recursive: true }),
      mkdir(outputDir, { recursive: true }),
    ])
    await writeFile(sourcePath, source)
    await runNobg(workDir)
    const result = await readFile(outputPath)
    const stats = await sharp(result).stats()
    const alpha = stats.channels[3]
    if (!alpha || alpha.min >= 255) {
      throw new Error('배경 제거 결과에 투명 영역이 없습니다. 다른 원본으로 다시 시도하세요.')
    }
    return result
  } finally {
    const resolvedWorkDir = path.resolve(workDir)
    const resolvedTempRoot = path.resolve(tmpdir()) + path.sep
    if (resolvedWorkDir.startsWith(resolvedTempRoot) && path.basename(resolvedWorkDir).startsWith('feelandnote-nobg-')) {
      await rm(resolvedWorkDir, { recursive: true, force: true })
    }
  }
}

export async function processNobgAvatar(celebId: string): Promise<string> {
  const admin = createAdminClient()
  const { data: celeb, error } = await admin
    .from('celebs')
    .select('id, avatar_url')
    .eq('id', celebId)
    .maybeSingle()

  if (error) throw new Error(`셀럽 조회 실패: ${error.message}`)
  if (!celeb) throw new Error('셀럽을 찾을 수 없습니다.')
  if (!celeb.avatar_url) throw new Error('배경을 제거할 아바타가 없습니다.')

  const source = await downloadAvatar(celeb.avatar_url)
  const result = await removeBackgroundWithLocalCpu(source, celeb.id)
  const key = `celebs/${celeb.id}/avatar.webp`
  await uploadToR2(key, result, 'image/webp')
  // 배경을 지운 새 얼굴로 작은 판도 다시 만든다 — 안 하면 그 인물만 옛 얼굴이 남는다
  await uploadToR2(smallAvatarKey(celeb.id), await buildSmallAvatar(result), 'image/webp')

  const url = `${R2_PUBLIC_URL}/${key}?v=${Date.now()}`
  const { data: updated, error: updateError } = await admin
    .from('celebs')
    .update({ avatar_url: url })
    .eq('id', celeb.id)
    .select('id')
    .maybeSingle()
  if (updateError) throw new Error(`아바타 주소 갱신 실패: ${updateError.message}`)
  if (!updated) throw new Error('아바타 주소를 갱신할 셀럽을 찾을 수 없습니다.')

  await revalidateWebCache(CACHE_TAGS.CELEBS)
  return url
}
