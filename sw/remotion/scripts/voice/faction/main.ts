/**
 * faction/main.ts — 세력도(Faction) TTS 파이프라인 오케스트레이션
 *
 * 1) faction-data.json 로드 → buildCues 기준 인물 대사 잡 추출(렌더 인덱싱과 동일)
 * 2) 매니페스트(텍스트 해시)로 변경 없는 wav 스킵
 * 3) Gemini 합성 → wav 저장(+ --normalize 라우드니스 정규화)
 * 4) 각 wav 길이 측정 → faction-data.json 의 quoteDuration 기록
 *
 * Faction 은 Gemini 전용(ElevenLabs 셀럽 보이스는 사용자 전담). --dry-run 으로 생성 없이 계획만 출력.
 */

import { mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import { VOICE } from '../2-synthesize/config.js'
import { normalizeWav, normalizeAll } from '../2-synthesize/normalize.js'
import {
  EPISODE_NAME, DATA_PATH, VOICE_DIR, LANG, GEMINI_MODEL,
  DRY_RUN, LIST_ONLY, FORCE_ALL, NORMALIZE, NORMALIZE_ONLY, INIT_MANIFEST, UPDATE_JSON, VERIFY, ONLY_TARGETS,
} from './cli.js'
import { analyzeTiming } from '../../../src/compositions/Faction/timing.js'
import { loadFactionData, buildVoiceJobs, writeVoiceDurations, type FactionVoiceJob } from './data.js'
import { jobHash, loadManifest, saveManifest } from './manifest.js'
import { synthesizeGemini, measureWavDuration } from './engine.js'
// DB↔JSON 음성 길이 감시 열(문서 §7 ③) — 조회는 전부 저 모듈이 하고 여기엔 훅만 둔다.
import { tryLoadDbQuoteDurations } from '../../faction/db-durations.js'
import { vnPersonQuote } from '../../../src/compositions/Faction/voice-names.js'
import { factionVoiceProvider } from '@feelandnote/shared/lib/faction-voice-provider'

/** 인물 화자 → Gemini 보이스명. quoteSpeaker 가 보이스명 오버라이드. 미지정이면 공용 셀럽 보이스. */
function voiceFor(job: FactionVoiceJob): string {
  return job.speaker && job.speaker.trim() ? job.speaker.trim() : VOICE.celeb
}

/** 매니페스트 해시 키 — 생성할 때 선택한 Gemini 모델 교체도 재생성을 트리거한다. */
function hashVoice(job: FactionVoiceJob): string {
  return `${voiceFor(job)}@${GEMINI_MODEL}`
}

export async function main(): Promise<void> {
  if (!existsSync(DATA_PATH)) {
    console.error(`✗ faction-data.json 없음: ${DATA_PATH}`)
    console.error(`  public/factions/${EPISODE_NAME}/faction-data.json 경로를 확인하세요.`)
    process.exit(1)
  }

  // 생성 없이 voice/ 의 모든 wav(ElevenLabs 포함)를 라우드니스 일괄 정규화만 하고 종료
  if (NORMALIZE_ONLY) {
    console.log(`라우드니스 일괄 정규화만 실행 — ${EPISODE_NAME}`)
    await normalizeAll(VOICE_DIR)
    return
  }

  const script = await loadFactionData()

  // --verify: 합성 없이 타이밍 산식 ↔ 실제 wav 길이를 대조해 검증 리포트만 출력하고 종료.
  // 「영상이 몇 초에 끝나야 하는지」와 「음성이 컷 안에 온전히 들어가는지(끝 씹힘)」를 한곳에서 확인한다.
  if (VERIFY) {
    await runVerify(script)
    return
  }

  // 엔진 무관 전체 잡 — wav 길이 측정(--update-json)은 ElevenLabs 포함 전부 대상이다.
  const allJobs = buildVoiceJobs(script)
  let jobs = allJobs

  // ElevenLabs 인물은 자동 "생성" 대상이 아니다(사용자 전담). BO 미리듣기 패널에서 직접 생성·저장한다.
  // 단, 이미 존재하는 wav 의 길이 측정은 엔진과 무관하므로 여기서 제외해도 --update-json 은 allJobs 를 쓴다.
  const eleSkipped = jobs.filter(j => factionVoiceProvider(j.elevenLabsVoiceId) === 'elevenlabs').length
  if (eleSkipped > 0) {
    jobs = jobs.filter(j => factionVoiceProvider(j.elevenLabsVoiceId) !== 'elevenlabs')
    console.log(`ElevenLabs 지정 ${eleSkipped}명 자동 생성 제외 (사용자 전담)`)
  }

  console.log(`에피소드: ${EPISODE_NAME} (factions/${EPISODE_NAME})`)
  console.log(`언어: ${LANG}  ·  대사 인물: ${jobs.length}명`)

  // --only 필터 (파일명 부분 일치)
  if (ONLY_TARGETS.length > 0) {
    jobs = jobs.filter(j => ONLY_TARGETS.some(t => j.file.includes(t)))
    if (jobs.length === 0) {
      console.log('일치하는 파일 없음. --list 로 확인하세요.')
      return
    }
  }

  await mkdir(VOICE_DIR, { recursive: true })
  const manifest = await loadManifest()

  // --init-manifest: 합성 없이 현재 텍스트 기준 매니페스트만 생성
  if (INIT_MANIFEST) {
    const m: Record<string, string> = {}
    for (const j of jobs) m[j.file] = jobHash(j.text, hashVoice(j))
    await saveManifest(m)
    console.log(`✓ voice-manifest.json 초기화 완료 (${jobs.length}개)`)
    return
  }

  // --update-json 단독: 합성 없이 기존 wav 길이만 다시 측정해 quoteDuration 갱신.
  // 엔진 무관 전체 잡(allJobs)을 대상으로 한다 — ElevenLabs 음원을 잘라도 길이가 반영되도록.
  if (UPDATE_JSON && !FORCE_ALL) {
    const durations: Record<string, number> = {}
    let measured = 0
    for (const j of allJobs) {
      const fp = path.join(VOICE_DIR, j.file)
      if (!existsSync(fp)) continue
      durations[j.file] = await measureWavDuration(fp)
      measured++
    }
    const changed = await writeVoiceDurations(durations)
    console.log(`✓ 기존 wav ${measured}개 측정 → faction-data.json quoteDuration ${changed}개 갱신`)
    return
  }

  // 변경 감지: 매니페스트 해시와 비교해 변경 없는 잡 스킵
  if (!FORCE_ALL && ONLY_TARGETS.length === 0) {
    const before = jobs.length
    jobs = jobs.filter(j => jobHash(j.text, hashVoice(j)) !== manifest[j.file])
    const skipped = before - jobs.length
    if (skipped > 0) console.log(`변경 없는 ${skipped}개 스킵`)

    if (jobs.length === 0) {
      // --normalize 단독: 생성 없이 voice/ 의 wav 일괄 정규화
      if (NORMALIZE) {
        await normalizeAll(VOICE_DIR)
        return
      }
      console.log('변경된 대사 없음. 전체 재생성: --force')
      return
    }
  }

  // --list: 대상 목록만
  if (LIST_ONLY) {
    console.log('생성 대상:')
    for (const j of jobs) {
      const changed = jobHash(j.text, hashVoice(j)) !== manifest[j.file]
      console.log(`  ${j.file.padEnd(22)} [${voiceFor(j)}] ${changed ? '← 변경' : ''}  ${j.text.slice(0, 40)}`)
    }
    return
  }

  // --dry-run: 무엇을 어디에 생성할지만 출력(유료 API 미호출)
  if (DRY_RUN) {
    console.log(`\n[dry-run] ${jobs.length}개 생성 예정 (실제 합성 안 함):`)
    for (const j of jobs) {
      const out = path.join(VOICE_DIR, j.file)
      console.log(`  ${j.file.padEnd(22)} [${voiceFor(j)}] → ${path.relative(process.cwd(), out)}`)
      console.log(`    "${j.text}"`)
    }
    console.log(`\n[dry-run] 합성 후 각 wav 길이를 측정해 faction-data.json 의 quoteDuration 에 기록한다: ${path.relative(process.cwd(), DATA_PATH)}`)
    return
  }

  // 합성 실행
  console.log(`\n${jobs.length}개 음성 생성 시작...\n`)
  const durations: Record<string, number> = {}
  for (const job of jobs) {
    const voice = voiceFor(job)
    const model = GEMINI_MODEL
    const fp = path.join(VOICE_DIR, job.file)
    console.log(`[${job.file}] [${voice}] (${model})`)
    const dur = await synthesizeGemini(job.text, voice, fp, model)
    // --normalize: 신규 wav 즉시 정규화 (.raw/ 백업 자동). 길이는 정규화 후 다시 측정해 정확히 기록.
    if (NORMALIZE) {
      const r = await normalizeWav(fp)
      if (r) console.log(`  ↳ normalized (in_i=${r.inI})`)
      else console.log(`  ↳ normalize 측정 실패 — 원본 유지`)
    }
    durations[job.file] = await measureWavDuration(fp)
    manifest[job.file] = jobHash(job.text, hashVoice(job))
  }

  await saveManifest(manifest)

  // 길이 → faction-data.json quoteDuration 기록
  const changed = await writeVoiceDurations(durations)
  console.log('\n=== duration 결과 ===')
  for (const [file, dur] of Object.entries(durations)) {
    console.log(`${file.padEnd(22)} ${dur.toFixed(2)}s`)
  }
  console.log(`\n✓ faction-data.json quoteDuration ${changed}개 기록 (${path.relative(process.cwd(), DATA_PATH)})`)
}

/**
 * 타이밍 검증 리포트 — 산식(analyzeTiming)과 실제 wav 길이를 대조한다.
 * - 총 길이: 롱폼 / 쇼츠 1편 / 쇼츠 2편 각각 「몇 초에 끝나는지」.
 * - voice 인물별: quoteDuration(data) ↔ wav 실측 일치 여부, 음성이 컷에 온전히 들어가는 여유(tailRoom).
 *   tailRoom<0 = 컷이 음성을 못 담아 끝이 잘림. qDur≠wav = data 가 실제 음원 길이와 어긋남(트림 미반영 등).
 */
async function runVerify(script: Awaited<ReturnType<typeof loadFactionData>>): Promise<void> {
  const p2 = (n: number) => n.toFixed(2).padStart(6)
  // 스튜디오 타임코드(m:ss:ff @ 60fps)와 같은 형식 — 스튜디오 표시와 1:1 대조용
  const tc = (frames: number) => {
    const t = Math.round(frames)
    const ff = t % 60, ss = Math.floor(t / 60) % 60, mm = Math.floor(t / 3600)
    return `${mm}:${String(ss).padStart(2, '0')}:${String(ff).padStart(2, '0')}`
  }
  const long = analyzeTiming(script, false)
  const s1 = analyzeTiming(script, true, 1)
  const s2 = analyzeTiming(script, true, 2)

  // 스튜디오 타임코드는 0-base 마지막 프레임(totalFrames-1)을 표시한다 — 같은 기준으로 찍어 1:1 대조.
  console.log(`\n=== 타이밍 검증: ${EPISODE_NAME} ===`)
  console.log(`총 길이 (스튜디오 타임코드 = 마지막 프레임 m:ss:ff)`)
  console.log(`  롱폼     ${tc(long.totalFrames - 1)}  (총 ${long.totalFrames}f · ${long.totalSec.toFixed(1)}s · ${long.cueCount}컷)`)
  console.log(`  쇼츠1편  ${tc(s1.totalFrames - 1)}  (총 ${s1.totalFrames}f · ${s1.totalSec.toFixed(1)}s)`)
  console.log(`  쇼츠2편  ${tc(s2.totalFrames - 1)}  (총 ${s2.totalFrames}f · ${s2.totalSec.toFixed(1)}s)\n`)
  // DB 의 quote_duration — 파일(JSON)과 어긋나면 export 가 밀렸거나 durations-pull 이 안 돌았다는 신호다.
  const { map: dbDur, note: dbNote } = await tryLoadDbQuoteDurations(EPISODE_NAME, vnPersonQuote)
  console.log(`[voice 인물 — 음성 ↔ 컷 정합성]  (단위 초)   DB: ${dbNote}`)
  console.log(`${'파일'.padEnd(18)} ${'인물'.padEnd(12)} ${'qDur'.padStart(6)} ${'DB'.padStart(6)} ${'wav'.padStart(6)} ${'차이'.padStart(6)} ${'배속'.padStart(5)} ${'재생'.padStart(6)} ${'컷'.padStart(6)} ${'여유'.padStart(6)}  상태`)

  let mismatch = 0, choke = 0, missing = 0, longerWav = 0, dbMismatch = 0
  for (const c of long.voiceChecks) {
    const fp = path.join(VOICE_DIR, c.file)
    let wav = -1
    if (existsSync(fp)) { try { wav = await measureWavDuration(fp) } catch { /* 손상 */ } }
    const qd = c.quoteDuration ?? 0
    const diff = wav >= 0 ? wav - qd : NaN
    const flags: string[] = []
    if (wav < 0) { flags.push('wav없음'); missing++ }
    else if (Math.abs(diff) > 0.05) { flags.push('qDur≠wav'); mismatch++; if (diff > 0.05) longerWav++ }
    if (c.tailRoomSec < 0) { flags.push('씹힘'); choke++ }
    // DB 대조 — 조회에 실패했으면(dbDur null) 판정하지 않는다
    const db = dbDur ? dbDur.get(c.file) ?? null : undefined
    if (dbDur && Math.abs((db ?? 0) - qd) > 0.05) { flags.push('qDur≠DB'); dbMismatch++ }
    const status = flags.length ? '⚠ ' + flags.join(',') : 'OK'
    console.log(`${c.file.padEnd(18)} ${c.name.slice(0, 12).padEnd(12)} ${p2(qd)} ${db != null ? p2(db) : '     -'} ${wav >= 0 ? p2(wav) : '     -'} ${Number.isNaN(diff) ? '     -' : p2(diff)} ${c.rate.toFixed(2).padStart(5)} ${p2(c.audioPlaySec)} ${p2(c.cutSec)} ${p2(c.tailRoomSec)}  ${status}`)
  }
  console.log(`\n요약: voice ${long.voiceChecks.length}명`
    + ` · quoteDuration≠wav ${mismatch}건${longerWav ? `(wav가 더 김 ${longerWav}건=트림 미반영 의심)` : ''}`
    + ` · 끝 씹힘위험 ${choke}건 · wav없음 ${missing}건`
    + (dbDur ? ` · quoteDuration≠DB ${dbMismatch}건` : ' · DB 대조 생략'))
  if (dbDur && dbMismatch > 0) {
    console.log('※ quoteDuration≠DB 는 `pnpm faction:durations-pull` 로 DB 를 실측에 맞춘 뒤 `pnpm faction:export` 로 파일까지 맞춘다.')
  }
  if (mismatch === 0 && choke === 0 && missing === 0) {
    console.log('✓ 모든 voice 음성이 data·컷과 정합. 영상 길이는 위 「총 길이」가 정답이다.')
  } else {
    console.log('※ quoteDuration≠wav 는 `--update-json` 으로 data 를 실제 wav 에 맞춰 해소한다.')
  }
}
