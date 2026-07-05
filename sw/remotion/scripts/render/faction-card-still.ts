/**
 * faction-card-still.ts — 세력도 카드뉴스 still 렌더 (CLI --props 파일이 이 remotion 버전에서 깨져 우회).
 *
 * @remotion/renderer API 로 props 객체를 직접 주입한다. 한 manifest 의 카드들을 한 번의 번들로 연속 출고한다.
 * BO 카드 내보내기(/api/<series>/faction-card-export)가 비율마다 manifest 하나를 만들어 이 스크립트를 부른다.
 *
 * Usage: tsx scripts/render/faction-card-still.ts <manifestFile>
 *   manifest = { compId, episodeName, script, jobs: [{ card, out }] }   // out 은 REMOTION_ROOT 기준 상대경로
 */
import { bundle } from '@remotion/bundler'
import { selectComposition, renderStill } from '@remotion/renderer'
import { readFileSync, mkdirSync } from 'fs'
import path from 'path'
import os from 'os'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const REMOTION_ROOT = path.join(__dirname, '..', '..')

type Job = { card: unknown; out: string }
// assetBase 가 있으면 자산을 그 HTTP 통로로 불러온다(public 폴더 통째 복사 회피 → 가볍고 빠름).
type Manifest = { compId: string; episodeName: string; script: unknown; jobs: Job[]; assetBase?: string }

async function main() {
  // pnpm 이 '--' 를 리터럴로 넘기는 경우가 있어 걸러낸다.
  const args = process.argv.slice(2).filter(a => a !== '--')
  const manifestFile = args[0]
  if (!manifestFile) throw new Error('usage: tsx faction-card-still.ts <manifestFile>')

  const manifest = JSON.parse(readFileSync(manifestFile, 'utf-8')) as Manifest
  const { compId, episodeName, script, jobs, assetBase } = manifest
  if (!jobs?.length) throw new Error('manifest.jobs 가 비었다')

  const ts = () => new Date().toLocaleTimeString('ko-KR', { hour12: false })
  console.log(`[${ts()}] 카드 출고 — ${compId} · ${jobs.length}장${assetBase ? ' · 자산 HTTP' : ''}`)

  // 자산을 HTTP(assetBase)로 받으면 번들에 public 을 통째 복사할 필요가 없다 — 빈 폴더를 publicDir 로 줘 복사를 건너뛴다.
  const emptyPublic = path.join(os.tmpdir(), 'faction-card-empty-public')
  mkdirSync(emptyPublic, { recursive: true })
  const baseProps = assetBase ? { script, episodeName, assetBase } : { script, episodeName }

  // 번들 1회 — 카드 전용 경량 엔트리(FactionCard 만 등록)로 모듈 그래프를 작게 유지한다(메인 Root 는 너무 무겁다).
  // outDir 을 비율(compId)별로 고정 — 매번 새 임시폴더를 안 만들어 디스크 누적(ENOSPC)을 막고,
  // 3비율을 동시에 내보낼 때 같은 폴더에 동시 쓰기가 부딪히지 않게 비율마다 폴더를 나눈다.
  const serveUrl = await bundle({
    entryPoint: path.join(REMOTION_ROOT, 'src', 'card-entry.tsx'),
    outDir: path.join(REMOTION_ROOT, 'out', '.cardbundle', compId),
    ...(assetBase ? { publicDir: emptyPublic } : {}),
  })
  console.log(`[${ts()}] 번들 완료 — 렌더 시작`)

  let done = 0
  for (const job of jobs) {
    const inputProps = { ...baseProps, card: job.card }
    // 카드마다 composition 을 다시 고른다 — 한 번 고른 메타에 첫 카드 props 가 박혀 카드가 안 바뀌는 것을 막는다.
    const composition = await selectComposition({ serveUrl, id: compId, inputProps })
    const outPath = path.resolve(REMOTION_ROOT, job.out)
    mkdirSync(path.dirname(outPath), { recursive: true })
    await renderStill({
      composition, serveUrl, output: outPath, inputProps,
      imageFormat: 'png', chromiumOptions: { gl: 'angle' }, overwrite: true,
    })
    done++
    console.log(`  ✅ [${done}/${jobs.length}] ${job.out}`)
  }
  console.log(`[${ts()}] 완료 — ${done}장`)
}

main().catch(e => { console.error('❌ 카드 출고 실패:', e instanceof Error ? e.message : e); process.exit(1) })
