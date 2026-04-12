/**
 * 1-tts.ts — 음성 파이프라인 1단계: TTS 생성 (entry)
 *
 * 에피소드 JSON을 읽어 Gemini(기본) 또는 ElevenLabs로 wav 파일을 생성한다.
 * 결과는 public/episodes/{stage}/{person}/voice/{locale}/{engine}/... 에 저장.
 *
 * 본체 코드는 ./1-tts/ 하위 모듈에 분리되어 있다:
 *   ./1-tts/cli.ts        — CLI 인자 파싱·환경 상수
 *   ./1-tts/config.ts     — 모델·VOICE·SHORTS_SPEED_DEFAULT·정규화 상수
 *   ./1-tts/state.ts      — episode 전역 상태
 *   ./1-tts/engines.ts    — Gemini · ElevenLabs API + saveWav
 *   ./1-tts/tts.ts        — tts() 디스패치 + ttsText + applyReplacements
 *   ./1-tts/jobs.ts       — Job 빌더 (롱폼/쇼츠 단일 타겟 스코프)
 *   ./1-tts/manifest.ts   — wav 매니페스트(텍스트 해시) 관리
 *   ./1-tts/normalize.ts  — ffmpeg 라우드니스 정규화
 *   ./1-tts/main.ts       — 오케스트레이션 + --update-json 처리
 *
 * 사용법:
 *   pnpm voice -- --episode <name> --long                           → 롱폼 전체
 *   pnpm voice -- --episode <name> --shorts <N>                     → 쇼츠 N번 전체
 *   pnpm voice -- --episode <name> --long --only D05b-summary       → 특정 세그먼트만
 *   pnpm voice -- --episode <name> --engine elevenlabs --long       → ElevenLabs (셀럽 커스텀 보이스)
 *   pnpm voice -- --episode <name> --long --list                    → 생성 대상 목록만 출력
 *   pnpm voice -- --episode <name> --long --normalize               → 신규 생성 후 라우드니스 정규화
 *
 * 주의: voice는 반드시 2-whisper.py → 3-timings.ts 까지 세트로 완주한다.
 * 1단계만 돌리면 wav와 voiceTimings가 어긋난다.
 *
 * 보이스: Kore(나레이터), Charon(요약맨), Puck(셀럽 기본)
 *
 * ────────────────────────────────────────────────────────────────────
 * 발화 스타일·속도 정책 (2026-04-08 정리)
 * ────────────────────────────────────────────────────────────────────
 *
 * Gemini TTS는 텍스트 앞에 "<지시문>: <대사>" 형태의 prefix를 인식한다.
 * prefix는 발화 속도, 어조, 발음 특성 등을 자연어로 지시한다 (예: "1.2배속으로",
 * "차분하게", "들숨 효과 없이 자연스럽게 이어서"). 한국어 prefix지만 다국어
 * 음성 생성에도 작동한다.
 *
 * 적용 우선순위 (높음 → 낮음):
 *   segment.style  >  episode.host.shortsSpeed (쇼츠 narrator)  >  SHORTS_SPEED_DEFAULT
 *   segment.style  >  episode.host.voiceStyle  (celeb)
 *
 * 1) 쇼츠 속도 (SHORTS_SPEED_DEFAULT = '1.2배속으로')
 *    - 적용 대상: 쇼츠 narrator/summary 세그먼트 (hook · intro · book-context · cta 등)
 *    - 비대상: 롱폼 전체, 쇼츠 celeb-mid (role === 'celeb')
 *    - 한·영 공통 적용
 *    - 셀럽별 오버라이드: episode.host.shortsSpeed 필드
 *    - 세그먼트별 오버라이드: shorts.segments[].style
 *
 * 2) 셀럽 발화 스타일 (episode.host.voiceStyle)
 *    - 적용 대상: 롱폼 celeb (philosophy 등) + 쇼츠 celeb-mid
 *    - 정속 prefix. 어조·발화 특성 지시용.
 *
 * 3) 한국어 전용 prefix
 *    - 예: "들숨 효과 없이 자연스럽게 이어서" — 한국어 발음·호흡 지시이므로 영문에는 부적합.
 *    - 영문 에피소드(*-en)의 segment.style 사용 시 경고 로그 출력 (조용한 무시 금지).
 *    - 영문에 발화 스타일이 필요하면 영문 지시문으로 별도 작성하되, 신중히 검토.
 *
 * 4) 변경 금지 — 코드가 정책의 단일 진입점이다
 *    - 새 prefix 도입 시 이 헤더 주석을 함께 갱신한다.
 *    - SHORTS_SPEED_DEFAULT 변경은 모든 쇼츠 narrator wav에 영향을 준다 (전 셀럽 일괄).
 * ────────────────────────────────────────────────────────────────────
 */

import { main } from './1-tts/main.js'

main().catch(err => {
  console.error(err)
  process.exit(1)
})
