/**
 * faction-srt.ts — 세력도(Faction) SRT 자막 생성
 *
 * 영상(Faction.tsx)과 동일한 컷 구성(buildCues)·동일한 발화 시각(data.timing)을 써서
 * 화면 자막과 .srt 가 어긋나지 않게 만든다.
 *
 * 자막에 담는 것:
 *  - 인물 대사: 의미 덩어리별 실제 발화 시각으로 분할(splitSub) — 영상 점등과 같은 단위·같은 시각.
 *  - 화면 텍스트: 시작/끝 제목(+부제·로그라인), 세력명(+슬로건), 묶음 소제목(+설명).
 *  - credit(직함만) 컷은 대사가 없어 자막을 만들지 않는다.
 *
 * 변형별(KO-LV/KO-LV1·LV2…/KO-S1/KO-S2)로 영상과 같은 isShorts·part·lvPart 로 컷을 구성한다
 * (롱폼은 longformOnly 세력을 포함, 쇼츠는 편별 세력만, 롱폼 편(lvPart)은 편 경계(cut) 구간 세력만).
 *
 * 출력: out/Faction/{episode}-{KO-LV|KO-LV1…|KO-S1|KO-S2…}.srt (factionVariants 기준, 진영 part·롱폼 편 경계의 편 수만큼)
 *
 * Usage: pnpm faction:srt -- --episode 01-llm
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import type { FactionScript, FactionPerson } from '../../src/compositions/Faction/types'
import { vnPersonQuote, vnTimingKey, clampRate } from '../../src/compositions/Faction/voice-names'
import { buildFactionSubs } from '../../src/compositions/Faction/subs'
import type { VoiceTimings, VoiceTimingSegment } from '../../src/lib/voice-timing'
import { subsToSrt } from './srt-builder'
import { factionVariants } from '@feelandnote/shared/lib/youtube-faction-meta'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..', '..')
const FACTIONS_DIR = path.join(ROOT, 'public', 'factions')
const OUT_DIR = path.join(ROOT, 'out', 'Faction')

/* ── 발화 시각 로딩 (script.ts 로더와 동일 규칙) ──
 * 편별 data.timing.p<N>.ko.json + 통합 data.timing.ko.json(레거시)을 모두 병합한다.
 * 키는 인물 자리 기반 stem(vnPersonQuote → vnTimingKey). 음원이 없으면 비어도 무방(글자수 폴백). */
function loadVoiceTimings(episodeDir: string): VoiceTimings {
  const merged: VoiceTimings = {}
  for (const fn of readdirSync(episodeDir)) {
    if (/^data\.timing(\.p\d+)?\.ko\.json$/.test(fn)) {
      Object.assign(merged, JSON.parse(readFileSync(path.join(episodeDir, fn), 'utf-8')) as VoiceTimings)
    }
  }
  return merged
}

/* ── 배속(quotePlaybackRate) 반영 ──
 * ⚠ 동기화 대상: src/compositions/Faction/script.ts 의 scaleSegs/scaleVoiceTimings 와 산식이 일치해야 한다.
 *   워크스페이스(webpack require.context) 경계상 import 불가라 복제한다. 한쪽을 바꾸면 반드시 다른 쪽도 바꾼다.
 * data.timing 은 원음 기준 시각이고, <Audio playbackRate> 가 음원을 빠르게 돌리므로 점등·자막 시각도 1/rate 로 당긴다. */
const scaleSegs = (segs: VoiceTimingSegment[], rate: number): VoiceTimingSegment[] =>
  segs.map(s => ({
    ...s,
    start: (s.start ?? 0) / rate,
    end: (s.end ?? 0) / rate,
    subTimings: s.subTimings?.map(t => t / rate),
    words: s.words?.map(w => ({ ...w, start: w.start / rate, end: w.end / rate })),
  }))

function scaleVoiceTimings(script: FactionScript, vt: VoiceTimings): VoiceTimings {
  let out: VoiceTimings | undefined
  const apply = (p: FactionPerson, stem: string) => {
    const rate = clampRate(p.quotePlaybackRate)
    if (rate === 1 || !vt[stem]) return
    if (!out) out = { ...vt }
    out[stem] = scaleSegs(vt[stem], rate)
  }
  script.groups.forEach((g, gi) => {
    if (g.disabled) return
    // 인물 컷 cue 에 clusterIndex 가 항상 들어가므로 키는 항상 FxxCxxPxx (solo 포함).
    ;(g.clusters ?? []).forEach((c, ci) => {
      ;(c.people ?? []).forEach((p, pi) => {
        if (p.isPerson !== false) apply(p, vnTimingKey(vnPersonQuote(gi, pi, ci)))
      })
    })
  })
  return out ?? vt
}

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name)
  return i >= 0 ? process.argv[i + 1] : undefined
}

function main() {
  const episode = arg('--episode')
  if (!episode) { console.error('--episode 필수 (예: pnpm faction:srt -- --episode 01-llm)'); process.exit(1) }
  const episodeDir = path.join(FACTIONS_DIR, episode)
  const dataPath = path.join(episodeDir, 'faction-data.json')
  if (!existsSync(dataPath)) { console.error(`세력도 데이터 없음: ${dataPath}`); process.exit(1) }
  const script = JSON.parse(readFileSync(dataPath, 'utf-8')) as FactionScript
  // 발화 시각 로드 + 배속 반영 후 스크립트에 주입 — buildFactionSubs 가 stem 으로 조회한다.
  script.voiceTimings = scaleVoiceTimings(script, loadVoiceTimings(episodeDir))
  mkdirSync(OUT_DIR, { recursive: true })

  for (const v of factionVariants(script.groups, script.longformLayout)) {
    const subs = buildFactionSubs(script, v.isShorts, v.part, v.lvPart)
    const srt = subsToSrt(subs)
    const outPath = path.join(OUT_DIR, `${episode}-${v.fileSuffix}.srt`)
    writeFileSync(outPath, srt, 'utf-8')
    console.log(`✓ ${path.basename(outPath)} — 자막 ${subs.length}개`)
  }
  console.log('완료.')
}

main()
