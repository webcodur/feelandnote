import { NextResponse } from 'next/server'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { guardAdminRoute } from '@/lib/admin-route'

// 인물 데이터 준비도 보고서 정적 HTML 위치. 스크립트는 sw/web-bo 에서 돌아
// ../../.artifacts(프로젝트 루트) 에 파일을 쓴다. web-bo 의 process.cwd() = sw/webbo.
const ARTIFACT = path.resolve(process.cwd(), '../../.artifacts/celeb-data-readiness.html')
const SCRIPT = 'scripts/audit-celeb-activation-readiness.ts'
const TIMEOUT_MS = 180_000

// GET: 현재 생성된 보고서 HTML을 그대로 내려준다(iframe 용).
export async function GET() {
  const denied = await guardAdminRoute()
  if (denied) return denied

  try {
    const html = await readFile(ARTIFACT, 'utf8')
    return new NextResponse(html, {
      headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' },
    })
  } catch {
    return NextResponse.json(
      { error: '보고서가 아직 생성되지 않았습니다. 먼저 갱신하세요.' },
      { status: 404 },
    )
  }
}

// POST: 감사 스크립트를 즉시 실행해 HTML을 다시 쓴다. 링크 검사는 생략(실시간 부적합).
export async function POST() {
  const denied = await guardAdminRoute()
  if (denied) return denied

  const cmd = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm'
  const args = ['exec', 'tsx', SCRIPT, '--html', '--skip-link-check', '--status=all']

  try {
    const result = await runScript(cmd, args)
    return NextResponse.json(result, { status: result.ok ? 200 : 500 })
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    )
  }
}

function runScript(cmd: string, args: string[]): Promise<{
  ok: boolean
  measuredAt: string
  log: string[]
  error?: string
}> {
  return new Promise((resolve) => {
    const log: string[] = []
    let timedOut = false
    const child = spawn(cmd, args, { cwd: process.cwd(), shell: true })

    const timer = setTimeout(() => {
      timedOut = true
      try { child.kill('SIGKILL') } catch { /* noop */ }
    }, TIMEOUT_MS)

    const push = (chunk: Buffer) => {
      log.push(...chunk.toString().split('\n').filter(Boolean))
    }
    child.stdout?.on('data', push)
    child.stderr?.on('data', push)

    child.on('close', (code) => {
      clearTimeout(timer)
      resolve({
        ok: !timedOut && code === 0,
        measuredAt: new Date().toISOString(),
        log: log.slice(-40),
        error: timedOut ? '시간 초과' : code === 0 ? undefined : `종료 코드 ${code}`,
      })
    })
    child.on('error', (err) => {
      clearTimeout(timer)
      resolve({ ok: false, measuredAt: new Date().toISOString(), log, error: err.message })
    })
  })
}