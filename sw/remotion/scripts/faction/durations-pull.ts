/**
 * durations-pull.ts — wav 실측 길이를 DB 로 역흡수 (문서 §7 ②)
 *
 * 사용:
 *   pnpm faction:durations-pull -- --episode AI-Supremacy [--dry-run]
 *   pnpm faction:durations-pull -- --all [--dry-run]
 *
 * 음성 길이는 파이프라인 소유 값이다. 원래 `pnpm voice:faction` 이 faction-data.json 에 직접
 * 적었는데(writeQuoteDurations), 이제 파일은 빌드 산출물이라 그 기록은 다음 export 에 지워진다.
 * 그래서 **실측 길이의 종착지를 DB 로 옮긴다.** 파이프라인 코드는 건드리지 않는다(무수정 원칙).
 *
 * 흐름: buildVoiceJobs(렌더와 동일 인덱싱) → voice/<stem>.wav 실측 → faction_people UPDATE.
 * 수식어 음원(`-epithet.wav`)이 있으면 epithet_duration 도 함께 갱신한다.
 */

import { existsSync } from 'fs'
import path from 'path'
import {
  adminClient, parseArgs, selectEpisodes, pad, readFactionData, type EpisodeFolder,
} from './lib.js'
import { loadPersonSlots, updateDurations, slotKeyFromIndices, round2 } from './db-durations.js'
import { vnPersonEpithet } from '../../src/compositions/Faction/voice-names.js'

const USAGE = '사용: pnpm faction:durations-pull -- (--episode <폴더명> | --all) [--dry-run]'

/**
 * 파이프라인 부품 2종을 불러온다.
 *
 * ⚠ `voice/faction/{data,engine}.ts` 는 둘 다 `cli.ts` 를 물고 있고, 그 모듈이 **로드 시각에**
 *   argv 를 검사해 모르는 플래그(`--all` 등)를 만나면 던진다. 정적 import 는 이 파일 본문보다
 *   먼저 평가되므로 반드시 **argv 를 바꿔치운 뒤 동적 import** 해야 한다. 원본은 무수정.
 */
async function loadPipelineParts() {
  const saved = process.argv
  process.argv = [saved[0], 'durations-pull', '--episode', 'shim']
  try {
    const [data, engine] = await Promise.all([
      import('../voice/faction/data.js'),
      import('../voice/faction/engine.js'),
    ])
    return { buildVoiceJobs: data.buildVoiceJobs, measureWavDuration: engine.measureWavDuration }
  } finally {
    process.argv = saved
  }
}

interface Stat {
  folder: string
  /** wav 를 찾은 잡 수 */
  measured: number
  /** wav 없음 */
  missing: number
  /** DB 값과 실측이 이미 같음 */
  same: number
  /** DB 갱신 대상 */
  changed: number
  /** 수식어 음원 갱신 대상 */
  epithetChanged: number
  /** 파일(JSON)의 값과 실측이 다른 건 — 참고용 */
  fileDiff: number
  /** 자리를 DB 에서 못 찾음 */
  orphan: number
  details: string[]
}

async function pullEpisode(
  db: ReturnType<typeof adminClient>,
  ep: EpisodeFolder,
  build: (s: never, part?: number) => { file: string; text: string; groupIndex: number; clusterIndex: number; personIndex: number }[],
  measureWavDuration: (p: string) => Promise<number>,
  dryRun: boolean,
): Promise<Stat> {
  const st: Stat = {
    folder: ep.folder, measured: 0, missing: 0, same: 0, changed: 0,
    epithetChanged: 0, fileDiff: 0, orphan: 0, details: [],
  }
  const script = readFactionData(ep.dataPath)
  const slots = await loadPersonSlots(db, ep.folder)
  const voiceDir = path.join(ep.dir, 'voice')
  const jobs = build(script as never)

  const updates: { id: string; quoteDuration?: number; epithetDuration?: number }[] = []

  for (const job of jobs) {
    const key = slotKeyFromIndices(job.groupIndex, job.clusterIndex, job.personIndex)
    const slot = slots.get(key)
    if (!slot) {
      st.orphan++
      st.details.push(`${job.file}: DB 자리 없음(${key})`)
      continue
    }
    const wavPath = path.join(voiceDir, job.file)
    if (!existsSync(wavPath)) { st.missing++; continue }

    let measured: number
    try {
      measured = round2(await measureWavDuration(wavPath))
    } catch (e) {
      st.missing++
      st.details.push(`${job.file}: wav 손상 — ${e instanceof Error ? e.message : String(e)}`)
      continue
    }
    st.measured++

    const patch: { id: string; quoteDuration?: number; epithetDuration?: number } = { id: slot.id }
    if (slot.quoteDuration === null || Math.abs(slot.quoteDuration - measured) > 0.005) {
      st.changed++
      patch.quoteDuration = measured
      st.details.push(`${job.file} (${slot.name}): DB ${slot.quoteDuration ?? '없음'} → ${measured}`)
    } else {
      st.same++
    }

    // 파일에 적힌 값과의 차이는 참고로만 센다(파일은 산출물이라 export 로 맞춰진다)
    const filePerson = ((((script.groups as never[])?.[job.groupIndex] as Record<string, unknown>)
      ?.clusters as never[])?.[job.clusterIndex] as Record<string, unknown>)
    const fileQd = ((filePerson?.people as never[])?.[job.personIndex] as Record<string, unknown>)?.quoteDuration
    if (typeof fileQd === 'number' && Math.abs(fileQd - measured) > 0.005) st.fileDiff++

    // 수식어 음원
    const epithetStem = vnPersonEpithet(job.groupIndex, job.personIndex, job.clusterIndex)
    const epithetPath = path.join(voiceDir, epithetStem)
    if (existsSync(epithetPath)) {
      try {
        const em = round2(await measureWavDuration(epithetPath))
        if (slot.epithetDuration === null || Math.abs(slot.epithetDuration - em) > 0.005) {
          st.epithetChanged++
          patch.epithetDuration = em
          st.details.push(`${epithetStem} (${slot.name}): DB ${slot.epithetDuration ?? '없음'} → ${em}`)
        }
      } catch { /* 손상된 수식어 음원은 건너뛴다 */ }
    }

    if (patch.quoteDuration !== undefined || patch.epithetDuration !== undefined) updates.push(patch)
  }

  if (!dryRun && updates.length) await updateDurations(db, updates)
  return st
}

async function main() {
  const args = parseArgs(process.argv, USAGE)
  const eps = selectEpisodes(args)
  const db = adminClient()
  const { buildVoiceJobs: build, measureWavDuration } = await loadPipelineParts()

  console.log(`대상 ${eps.length}편${args.dryRun ? ' (dry-run — DB 쓰기 없음)' : ''}`)
  const all: Stat[] = []
  for (const ep of eps) {
    const st = await pullEpisode(db, ep, build as never, measureWavDuration, args.dryRun)
    all.push(st)
    console.log(`  ${pad(ep.folder, 24)} 실측 ${pad(String(st.measured), 4)} 일치 ${pad(String(st.same), 4)}`
      + ` 갱신 ${pad(String(st.changed), 4)} 수식어 ${pad(String(st.epithetChanged), 3)}`
      + ` wav없음 ${pad(String(st.missing), 4)}${st.orphan ? ` 고아 ${st.orphan}` : ''}`)
  }

  const sum = (k: keyof Stat) => all.reduce((a, s) => a + (s[k] as number), 0)
  console.log('\n── 합계 ──')
  console.log(`wav 실측 ${sum('measured')}건 · DB 일치 ${sum('same')}건 · DB 갱신 ${sum('changed')}건`
    + ` · 수식어 갱신 ${sum('epithetChanged')}건 · wav 없음 ${sum('missing')}건 · 고아 ${sum('orphan')}건`)
  const rate = sum('measured') ? ((sum('same') / sum('measured')) * 100).toFixed(1) : '-'
  console.log(`DB↔wav 일치율 ${rate}% (실측 대비)`)
  console.log(`참고: 파일(JSON)↔wav 불일치 ${sum('fileDiff')}건 — 파일은 산출물이라 다음 export 에서 맞춰진다`)

  const details = all.flatMap(s => s.details.map(d => `${s.folder}/${d}`))
  if (details.length) {
    console.log(`\n── 변경·이상 명단 ${details.length}건 ──`)
    for (const d of details.slice(0, 60)) console.log(`  · ${d}`)
    if (details.length > 60) console.log(`  … 외 ${details.length - 60}건`)
  }
  if (args.dryRun && sum('changed') + sum('epithetChanged') > 0) {
    console.log('\n반영하려면 --dry-run 없이 다시 실행한다. 이후 pnpm faction:export 로 파일까지 맞춘다.')
  }
}

main().catch(e => {
  console.error(`✗ ${e instanceof Error ? e.message : String(e)}`)
  process.exit(1)
})
