/**
 * faction/main.ts — 세력도(Faction) TTS 파이프라인 오케스트레이션
 *
 * 1) data.json 로드 → buildCues 기준 인물 대사 잡 추출(렌더 인덱싱과 동일)
 * 2) 매니페스트(텍스트 해시)로 변경 없는 wav 스킵
 * 3) Gemini 합성 → wav 저장(+ --normalize 라우드니스 정규화)
 * 4) 각 wav 길이 측정 → data.json 의 quoteDuration 기록
 *
 * Faction 은 Gemini 전용(ElevenLabs 셀럽 보이스는 사용자 전담). --dry-run 으로 생성 없이 계획만 출력.
 */

import { mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import { VOICE, MODEL_GEMINI_25, MODEL_GEMINI_31 } from '../2-synthesize/config.js'
import { normalizeWav, normalizeAll } from '../2-synthesize/normalize.js'
import {
  EPISODE_NAME, DATA_PATH, VOICE_DIR, LANG, GEMINI_MODEL,
  DRY_RUN, LIST_ONLY, FORCE_ALL, NORMALIZE, INIT_MANIFEST, UPDATE_JSON, ONLY_TARGETS,
} from './cli.js'
import { loadFactionData, buildVoiceJobs, writeQuoteDurations, type FactionVoiceJob } from './data.js'
import { jobHash, loadManifest, saveManifest } from './manifest.js'
import { synthesizeGemini, measureWavDuration } from './engine.js'

/** 인물 화자 → Gemini 보이스명. quoteSpeaker 가 보이스명 오버라이드. 미지정이면 공용 셀럽 보이스. */
function voiceFor(job: FactionVoiceJob): string {
  return job.speaker && job.speaker.trim() ? job.speaker.trim() : VOICE.celeb
}

/**
 * 인물별 합성 모델 — quoteEngine 이 'gemini-v3' 면 3.1, 'gemini' 면 2.5,
 * 미지정이면 CLI 전역 --engine(GEMINI_MODEL)을 따른다. ('elevenlabs' 인물은 이미 잡에서 제외됨)
 */
function modelFor(job: FactionVoiceJob): string {
  if (job.engine === 'gemini-v3') return MODEL_GEMINI_31
  if (job.engine === 'gemini') return MODEL_GEMINI_25
  return GEMINI_MODEL
}

/** 매니페스트 해시 키 — 보이스+모델을 합쳐, 엔진(2.5↔3.1) 교체도 재생성을 트리거한다. */
function hashVoice(job: FactionVoiceJob): string {
  return `${voiceFor(job)}@${modelFor(job)}`
}

export async function main(): Promise<void> {
  if (!existsSync(DATA_PATH)) {
    console.error(`✗ data.json 없음: ${DATA_PATH}`)
    console.error(`  public/factions/${EPISODE_NAME}/data.json 경로를 확인하세요.`)
    process.exit(1)
  }

  const script = await loadFactionData()
  let jobs = buildVoiceJobs(script)

  // ElevenLabs 인물은 자동 생성 대상이 아니다(사용자 전담). BO 미리듣기 패널에서 직접 생성·저장한다.
  const eleSkipped = jobs.filter(j => j.engine === 'elevenlabs').length
  if (eleSkipped > 0) {
    jobs = jobs.filter(j => j.engine !== 'elevenlabs')
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

  // --update-json 단독: 합성 없이 기존 wav 길이만 다시 측정해 quoteDuration 갱신
  if (UPDATE_JSON && !FORCE_ALL) {
    const durations: Record<string, number> = {}
    let measured = 0
    for (const j of jobs) {
      const fp = path.join(VOICE_DIR, j.file)
      if (!existsSync(fp)) continue
      durations[j.file] = await measureWavDuration(fp)
      measured++
    }
    const changed = await writeQuoteDurations(durations)
    console.log(`✓ 기존 wav ${measured}개 측정 → data.json quoteDuration ${changed}개 갱신`)
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
    console.log(`\n[dry-run] 합성 후 각 wav 길이를 측정해 data.json 의 quoteDuration 에 기록한다: ${path.relative(process.cwd(), DATA_PATH)}`)
    return
  }

  // 합성 실행
  console.log(`\n${jobs.length}개 음성 생성 시작...\n`)
  const durations: Record<string, number> = {}
  for (const job of jobs) {
    const voice = voiceFor(job)
    const model = modelFor(job)
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

  // 길이 → data.json quoteDuration 기록
  const changed = await writeQuoteDurations(durations)
  console.log('\n=== duration 결과 ===')
  for (const [file, dur] of Object.entries(durations)) {
    console.log(`${file.padEnd(22)} ${dur.toFixed(2)}s`)
  }
  console.log(`\n✓ data.json quoteDuration ${changed}개 기록 (${path.relative(process.cwd(), DATA_PATH)})`)
}
