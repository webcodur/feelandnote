/**
 * 1-tts/main.ts — TTS 파이프라인 1단계 메인 오케스트레이션
 *
 * 1) 에피소드 로드 + 공용 파일 셋업 + 셀럽 보이스 오버라이드
 * 2) buildJobs → 역할/스코프/manifest 필터
 * 3) tts() 합성 + 매니페스트 갱신 + 라우드니스 정규화
 * 4) --update-json: duration → timing.json 자동 반영 (timing.ts)
 */

import { mkdir } from 'fs/promises'
import path from 'path'
import { COMMON_VOICE_FILES } from '../../../src/compositions/BookRecommend/voice-names'
import { loadEpisode as loadEpisodeMerged } from '../../lib/episode.js'
import type { BookRecommendScript } from '../../../src/compositions/BookRecommend/types'
import {
  args, EPISODE_NAME, ENGINE, OUT_DIR, SHORTS_INDEX, ROLE_FILTER, includeCommon, BASE_DIR,
} from './cli.js'
import { VOICE } from './config.js'
import { setEpisode, setCommonFiles } from './state.js'
import { buildJobs, type Job } from './jobs.js'
import {
  type Manifest, jobHash, loadManifest, saveManifest,
  isCommonFile, jobOutDir, manifestDir,
} from './manifest.js'
import { tts } from './tts.js'
import { normalizeWav, normalizeAll } from './normalize.js'
import { updateTimingJson } from './timing.js'

async function loadEpisode(name: string): Promise<BookRecommendScript> {
  // 옵션 2: loadEpisodeMerged가 shorts 외부 파일(shorts/{locale}-{N}.json)까지 로드하여 배열로 주입
  return (await loadEpisodeMerged(name)) as BookRecommendScript
}

export async function main(): Promise<void> {
  // 1) 에피소드 로드
  const episode = await loadEpisode(EPISODE_NAME)
  setEpisode(episode)

  // 공용 음성 — common/voice/{locale}/ 재사용. --include-common 시 보호 해제.
  setCommonFiles(includeCommon ? new Set<string>() : new Set(COMMON_VOICE_FILES))

  // 셀럽 보이스 오버라이드 (geminiVoice → voice-actors.md 참조)
  if (episode.host.geminiVoice) {
    VOICE.celeb = episode.host.geminiVoice
  }
  console.log(`에피소드: ${EPISODE_NAME}`)
  if (VOICE.celeb !== 'Puck') console.log(`셀럽 보이스: ${VOICE.celeb}`)

  await mkdir(OUT_DIR, { recursive: true })

  // 2) 옵션 파싱
  const listOnly = args.includes('--list')
  const onlyIdx = args.indexOf('--only')
  const onlyFiles = onlyIdx >= 0 ? args[onlyIdx + 1]?.split(',') : null
  const forceAll = args.includes('--force')
  const initManifest = args.includes('--init-manifest')

  // 3) Job 빌드 — 단일 타겟 스코프(--long 또는 --shorts <N>)는 buildJobs에서 격리
  let jobs = buildJobs()
  if (SHORTS_INDEX !== null) {
    console.log(`스코프: shorts-${SHORTS_INDEX} (${jobs.length}개 job)`)
  } else {
    console.log(`스코프: long (${jobs.length}개 job)`)
  }

  // 역할 필터: --role narrator,summary,celeb
  if (ROLE_FILTER) {
    jobs = jobs.filter(j => ROLE_FILTER.includes(j.role))
    console.log(`역할 필터: [${ROLE_FILTER.join(', ')}] → ${jobs.length}개`)
  }

  // ElevenLabs 보이스가 있는 셀럽: Gemini 엔진일 때 celeb role 생성 차단
  // ─── 왜 건너뛰는가 ───
  // ElevenLabs 커스텀 보이스는 자동화·LLM 판단이 불가능하다.
  // 생성된 음성을 사람이 직접 듣고 품질을 판단해야 하므로,
  // 유저가 ElevenLabs 사이트에서 개별적으로 생성·선별한다.
  // 따라서 elevenlabsVoiceId가 있는 에피소드의 celeb 음성은
  // Gemini 파이프라인에서 제외하고 유저 수작업 영역으로 남긴다.
  if (ENGINE === 'gemini' && episode.host.elevenlabsVoiceId) {
    const before = jobs.length
    jobs = jobs.filter(j => j.role !== 'celeb')
    const skipped = before - jobs.length
    if (skipped > 0) console.log(`ElevenLabs 보이스 존재 → celeb ${skipped}개 건너뜀 (Gemini 생성 차단)`)
  }

  if (onlyFiles) {
    jobs = jobs.filter(j => onlyFiles.some(f => j.file.includes(f)))
    if (jobs.length === 0) {
      console.log('일치하는 파일 없음. --list로 확인하세요.')
      return
    }
  }

  // --init-manifest: TTS 실행 없이 현재 텍스트 기준으로 매니페스트만 생성
  if (initManifest) {
    const byDir = new Map<string, Manifest>()
    for (const j of jobs) {
      const dir = manifestDir(j)
      if (!byDir.has(dir)) byDir.set(dir, {})
      byDir.get(dir)![j.file] = jobHash(j.text, j.voice)
    }
    for (const [dir, m] of byDir) {
      await mkdir(dir, { recursive: true })
      await saveManifest(m, dir)
    }
    console.log(`✓ manifest.json 초기화 완료 (${jobs.length}개)`)
    return
  }

  // 4) 변경 감지: 매니페스트 로드
  const manifestCache = new Map<string, Manifest>()
  async function getManifest(dir: string): Promise<Manifest> {
    if (!manifestCache.has(dir)) manifestCache.set(dir, await loadManifest(dir))
    return manifestCache.get(dir)!
  }

  if (!forceAll && !onlyFiles) {
    const before = jobs.length
    const filtered: Job[] = []
    for (const j of jobs) {
      const m = await getManifest(manifestDir(j))
      if (jobHash(j.text, j.voice) !== m[j.file]) filtered.push(j)
    }
    const skipped = before - filtered.length
    jobs = filtered
    if (skipped > 0) console.log(`변경 없는 ${skipped}개 스킵`)
    if (jobs.length === 0) {
      // --normalize 단독: TTS 생성 없이 스코프 내 wav 일괄 정규화.
      // - 롱폼(--long): gemini/elevenlabs 각 엔진의 최상위 *.wav (shorts-* 제외)
      // - 쇼츠(--shorts N): gemini/elevenlabs 각 엔진의 shorts-{N}/*.wav
      // ElevenLabs 포함: linear loudnorm 은 게인만 조정(압축·톤 변경 없음)하므로
      // 셀럽 보이스 수작업 검수 의도를 훼손하지 않는다.
      if (args.includes('--normalize')) {
        const { existsSync } = await import('fs')
        for (const eng of ['gemini', 'elevenlabs']) {
          const engRoot = path.join(BASE_DIR, eng)
          if (!existsSync(engRoot)) continue
          if (SHORTS_INDEX !== null) {
            // 쇼츠 스코프: 해당 쇼츠 서브디렉토리만
            const shortDir = path.join(engRoot, `shorts-${SHORTS_INDEX}`)
            if (existsSync(shortDir)) await normalizeAll(shortDir)
          } else {
            // 롱폼 스코프: 엔진 루트 (normalizeAll 은 shorts-* 서브디렉토리도 포함하지만
            // 롱폼 단독 재정규화에서는 쇼츠 잔재까지 덩달아 처리돼도 무해)
            await normalizeAll(engRoot)
          }
        }
        return
      }
      console.log('변경된 텍스트 없음. 전체 재생성: --force')
      return
    }
  }

  if (listOnly) {
    console.log('생성 대상:')
    for (const j of jobs) {
      const m = await getManifest(manifestDir(j))
      const changed = jobHash(j.text, j.voice) !== m[j.file]
      console.log(`  ${j.file.padEnd(30)} [${j.voice}] ${changed ? '← 변경' : ''}`)
    }
    return
  }

  // 5) 합성 실행
  console.log(`${jobs.length}개 음성 생성 시작... [엔진: ${ENGINE}]\n`)
  const normalizeEnabled = args.includes('--normalize') && ENGINE !== 'elevenlabs'
  const results: Record<string, number> = {}
  for (const job of jobs) {
    const dir = jobOutDir(job)
    await mkdir(dir, { recursive: true })
    console.log(`[${job.file}]${isCommonFile(job.file) ? ' (common)' : ''}`)
    const fp = path.join(dir, job.file)
    // job.file이 'shorts-2/S01-...' 처럼 하위 경로를 포함할 수 있으므로 부모 dir 생성
    await mkdir(path.dirname(fp), { recursive: true })
    results[job.file] = await tts(job.text, job.voice, fp, job.role, job.isShort, job.shortSegId)
    // 성공 시 매니페스트 업데이트
    const mDir = manifestDir(job)
    const m = await getManifest(mDir)
    m[job.file] = jobHash(job.text, job.voice)
    // --normalize: 신규 wav 즉시 정규화 (.raw/ 백업 자동)
    if (normalizeEnabled) {
      const r = await normalizeWav(fp)
      if (r) console.log(`  ↳ normalized (in_i=${r.inI})`)
      else console.log(`  ↳ normalize 측정 실패 — 원본 유지`)
    }
  }
  // 변경된 매니페스트 저장
  for (const [dir, m] of manifestCache) {
    await mkdir(dir, { recursive: true })
    await saveManifest(m, dir)
  }

  // duration 출력
  console.log('\n=== duration 결과 ===')
  for (const [file, dur] of Object.entries(results)) {
    console.log(`${file.padEnd(30)} ${dur.toFixed(2)}s`)
  }

  // 6) --update-json: duration을 timing.json에 자동 반영
  if (args.includes('--update-json')) {
    await updateTimingJson(results)
  }
}
