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

  # 에피소드/로케일 파싱 ("-en" 접미사면 영문)
  local person locale
  if [[ "$ep" == *-en ]]; then
    person="${ep%-en}"
    locale="en"
  else
    person="$ep"
    locale="ko"
  fi

  # 에피소드 디렉토리 (todo/live/done 3단)
  local ep_dir=""
  for status in todo live done; do
    local candidate="public/episodes/${status}/${person}"
    if [[ -d "$candidate" ]]; then
      ep_dir="$candidate"
      break
    fi
  done
  if [[ -z "$ep_dir" ]]; then
    echo "✗ [$ep] 에피소드 디렉토리 없음" | tee -a "$LOG"
    return 1
  fi

  # 롱폼 파이프라인
  echo "  [1-long] TTS 생성 (롱폼)..." | tee -a "$LOG"
  pnpm voice:tts -- --episode "$ep" --long --update-json 2>&1 | tee -a "$LOG"

  echo "  [2-long] WhisperX 타임스탬프 (롱폼)..." | tee -a "$LOG"
  python scripts/voice/3-transcribe.py --episode "$ep" --long 2>&1 | tee -a "$LOG"

  echo "  [3-long] voiceTimings 분석 (롱폼)..." | tee -a "$LOG"
  pnpm voice:align -- --episode "$ep" --long --update-json 2>&1 | tee -a "$LOG"

  # 쇼츠 파이프라인 — shorts/{locale}-{N}.json 스캔해 N마다 실행
  if [[ -d "${ep_dir}/shorts" ]]; then
    for f in "${ep_dir}/shorts/${locale}-"*.json; do
      [[ -e "$f" ]] || continue
      # timing.json 제외
      [[ "$f" == *.timing.json ]] && continue
      local base="${f##*/}"                 # {locale}-{N}.json
      local n="${base#${locale}-}"          # {N}.json
      n="${n%.json}"                        # {N}
      [[ "$n" =~ ^[0-9]+$ ]] || continue

      echo "  [1-shorts-${n}] TTS 생성..." | tee -a "$LOG"
      pnpm voice:tts -- --episode "$ep" --shorts "$n" --update-json 2>&1 | tee -a "$LOG"

      echo "  [2-shorts-${n}] WhisperX 타임스탬프..." | tee -a "$LOG"
      python scripts/voice/3-transcribe.py --episode "$ep" --shorts "$n" 2>&1 | tee -a "$LOG"

      echo "  [3-shorts-${n}] voiceTimings 분석..." | tee -a "$LOG"
      pnpm voice:align -- --episode "$ep" --shorts "$n" --update-json 2>&1 | tee -a "$LOG"
    done
  fi

  echo "  [4] 렌더 (롱폼+쇼츠+썸네일)..." | tee -a "$LOG"
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
