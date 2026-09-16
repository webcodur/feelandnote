import { NextResponse } from 'next/server'
import { spawn } from 'node:child_process'
import { guardAdminRoute } from '@/lib/admin-route'

// 인물 도서 감사는 감사 스크립트의 --json 출력을 그대로 받아 화면이 직접 그린다.
// 파일로 남기지 않는다 — 회차마다 쌓이던 _audit-*.json 스냅샷을 이 창구가 대신한다.
// 마지막 측정 결과는 이 프로세스 메모리에만 둔다(인물 준비도와 같은 방식).
const SCRIPT = 'scripts/figure-books/audit.ts'
const TIMEOUT_MS = 180_000

type CachedReport = { measuredAt: string; summary: unknown }
let lastReport: CachedReport | null = null

// GET: 이 프로세스에서 마지막으로 측정한 요약. 없으면 404.
export async function GET() {
  const denied = await guardAdminRoute()
  if (denied) return denied

  if (!lastReport) {
    return NextResponse.json(
      { error: '아직 측정된 보고서가 없습니다. 먼저 측정하세요.' },
      { status: 404 },
    )
  }
  return NextResponse.json(lastReport)
}

// POST: 감사 스크립트를 즉시 실행해 요약 JSON을 받는다. DB는 읽기만 한다.
export async function POST() {
  const denied = await guardAdminRoute()
  if (denied) return denied

  const cmd = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm'
  const args = ['exec', 'tsx', SCRIPT, '--json']

  try {
    const result = await runScript(cmd, args)
    if (!result.ok) {
      return NextResponse.json(result, { status: 500 })
    }
    lastReport = { measuredAt: result.measuredAt, summary: result.summary }
    return NextResponse.json(lastReport)
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
  summary?: unknown
  log: string[]
  error?: string
}> {
  return new Promise((resolve) => {
    const stdout: Buffer[] = []
    const log: string[] = []
    let timedOut = false
    const child = spawn(cmd, args, { cwd: process.cwd(), shell: true })

    const timer = setTimeout(() => {
      timedOut = true
      try { child.kill('SIGKILL') } catch { /* noop */ }
    }, TIMEOUT_MS)

    child.stdout?.on('data', (chunk: Buffer) => stdout.push(chunk))
    child.stderr?.on('data', (chunk: Buffer) => {
      log.push(...chunk.toString().split('\n').filter(Boolean))
    })

    child.on('close', (code) => {
      clearTimeout(timer)
      const measuredAt = new Date().toISOString()
      if (timedOut || code !== 0) {
        resolve({
          ok: false,
          measuredAt,
          log: log.slice(-40),
          error: timedOut ? '시간 초과' : `종료 코드 ${code}`,
        })
        return
      }
      try {
        const text = Buffer.concat(stdout).toString('utf8')
        const summary = JSON.parse(text.slice(text.indexOf('{')))
        resolve({ ok: true, measuredAt, summary, log: log.slice(-40) })
      } catch (error) {
        resolve({
          ok: false,
          measuredAt,
          log: log.slice(-40),
          error: `JSON 파싱 실패: ${error instanceof Error ? error.message : String(error)}`,
        })
      }
    })
    child.on('error', (err) => {
      clearTimeout(timer)
      resolve({ ok: false, measuredAt: new Date().toISOString(), log, error: err.message })
    })
  })
}
