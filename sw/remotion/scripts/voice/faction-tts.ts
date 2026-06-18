/**
 * faction-tts.ts — 세력도(Faction) 음성 파이프라인 (entry)
 *
 * public/factions/<에피소드>/data.json 의 각 인물 대사(quote)를 Gemini TTS 로 합성하고,
 * public/factions/<에피소드>/voice/<파일>.wav 로 저장한 뒤, 각 wav 길이를 측정해
 * data.json 의 해당 인물 quoteDuration 에 기록한다.
 *
 * BookRecommend 음성 파이프라인(./2-synthesize)과 별도 진입점이다. 저수준 부품
 * (config.VOICE·normalize)만 공유하고, 잡 인덱싱은 Faction 렌더의 buildCues 를 직접 재사용해
 * 파일명이 렌더 cue 경로(vnPersonQuote)와 정확히 일치하도록 보장한다.
 *
 * 파일명 규칙(렌더와 동일):
 *   세력 i, 인물 j           → F{i+1}P{j+1}-quote.wav        (예 F01P01-quote.wav)
 *   세력 i, 묶음 c, 인물 j   → F{i+1}C{c+1}P{j+1}-quote.wav  (예 F02C01P03-quote.wav)
 *   ※ 묶음(clusters) 없는 비-solo 세력도 렌더가 단일 묶음(C01)으로 정규화하므로 C01 이 붙는다.
 *      solo 세력(무소속 개인군)만 C 없이 F{i}P{j} 형식.
 *
 * 사용법:
 *   pnpm voice:faction -- --episode llm --dry-run         → 생성 계획만 출력(유료 API 미호출)
 *   pnpm voice:faction -- --episode llm --list            → 변경 대상 목록만
 *   pnpm voice:faction -- --episode llm --normalize       → 합성 + 라우드니스 정규화 + quoteDuration 기록
 *   pnpm voice:faction -- --episode llm --force           → 변경 감지 무시하고 전체 재생성
 *   pnpm voice:faction -- --episode llm --only F01P01      → 특정 인물만
 *   pnpm voice:faction -- --episode llm --update-json     → 합성 없이 기존 wav 길이만 재측정·기록
 *   pnpm voice:faction -- --episode llm --init-manifest   → 합성 없이 텍스트 매니페스트만 초기화
 *
 * 주의: Faction 은 Gemini 전용. ElevenLabs 셀럽 보이스는 사용자 전담이라 --engine elevenlabs 는 거부된다.
 */

import { main } from './faction/main.js'

main().catch(err => {
  console.error(err)
  process.exit(1)
})
