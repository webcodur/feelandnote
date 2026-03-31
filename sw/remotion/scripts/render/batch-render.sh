#!/bin/bash
# 전체 리소스 출력 배치 스크립트
# 대상: jensen-huang-en, dario-amodei, dario-amodei-en,
#       alexander-the-great, alexander-the-great-en,
#       yi-sun-sin, yi-sun-sin-en
#
# jensen-huang KO는 이미 별도 프로세스에서 렌더 중

set -e
cd "$(dirname "$0")/../.."

LOG="scripts/render/batch-render.log"
echo "=== 배치 시작: $(date) ===" | tee "$LOG"

run_pipeline() {
  local ep="$1"
  echo "" | tee -a "$LOG"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" | tee -a "$LOG"
  echo "▶ [$ep] 파이프라인 시작: $(date)" | tee -a "$LOG"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" | tee -a "$LOG"

  echo "  [1/4] TTS 생성..." | tee -a "$LOG"
  pnpm voice -- --episode "$ep" --update-json 2>&1 | tee -a "$LOG"

  echo "  [2/4] WhisperX 타임스탬프..." | tee -a "$LOG"
  python scripts/voice/whisper-words.py --episode "$ep" 2>&1 | tee -a "$LOG"

  echo "  [3/4] voiceTimings 분석..." | tee -a "$LOG"
  pnpm analyze -- --episode "$ep" --update-json 2>&1 | tee -a "$LOG"

  echo "  [4/4] 렌더 (롱폼+쇼츠+썸네일)..." | tee -a "$LOG"
  pnpm render:all -- --episode "$ep" 2>&1 | tee -a "$LOG"

  echo "✅ [$ep] 완료: $(date)" | tee -a "$LOG"
}

# jensen-huang-en: 음성 파이프라인은 이미 완료, 렌더만
echo "▶ [jensen-huang-en] 렌더만 실행 (음성 파이프라인 완료됨)" | tee -a "$LOG"
pnpm render:all -- --episode jensen-huang-en 2>&1 | tee -a "$LOG"
echo "✅ [jensen-huang-en] 렌더 완료: $(date)" | tee -a "$LOG"

# 나머지 에피소드: 풀 파이프라인
EPISODES=(
  "dario-amodei"
  "dario-amodei-en"
  "alexander-the-great"
  "alexander-the-great-en"
  "yi-sun-sin"
  "yi-sun-sin-en"
)

for ep in "${EPISODES[@]}"; do
  run_pipeline "$ep"
done

echo "" | tee -a "$LOG"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" | tee -a "$LOG"
echo "🎉 전체 배치 완료: $(date)" | tee -a "$LOG"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" | tee -a "$LOG"
