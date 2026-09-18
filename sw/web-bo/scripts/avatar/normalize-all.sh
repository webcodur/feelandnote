#!/usr/bin/env bash
# 아바타 정규화 전수 드라이버 — 유형별로 200명씩 내려받기 → 빛 방향 → 재배치 → 등록을 잇는다.
#
# 사용법 (sw/web-bo 에서):
#   bash scripts/avatar/normalize-all.sh <REALITY> <시작 offset> <끝 offset(미포함)> [--include-real]
#   예) bash scripts/avatar/normalize-all.sh FICTION 0 600
#       ONLY_FLIPPED=1 bash scripts/avatar/normalize-all.sh REAL 0 3000 --include-real   # 빛 방향만 다시, 뒤집힌 인물만 등록
#       bash scripts/avatar/normalize-all.sh REAL 0 3000
#
# 배치마다 _backup/faction-avatars/<reality>-<offset>{,-lit,-reframed}/ 를 남기고,
# 진행은 _backup/faction-avatars/_normalize-<reality>.log 에 누적한다. 등록은 시트 없이 바로 올리므로
# 사용자가 전수 적용을 지시한 경우에만 쓴다. 규격 SSoT: docs/project/celeb/celeb-08-01-avatar.md 「정규화」
set -u
cd "$(dirname "$0")/../.." || exit 1
REALITY="$1"; FROM="$2"; TO="$3"; EXTRA="${4:-}"
STEP=200
BASE="../../_backup/faction-avatars"
LOG="$BASE/_normalize-$(echo "$REALITY" | tr 'A-Z' 'a-z').log"
mkdir -p "$BASE"
echo "=== $(date -Iseconds) 시작 $REALITY $FROM..$TO $EXTRA" >> "$LOG"
for ((off=FROM; off<TO; off+=STEP)); do
  name="$(echo "$REALITY" | tr 'A-Z' 'a-z')-$off"
  src="$BASE/$name"; lit="$BASE/$name-lit"; ref="$BASE/$name-reframed"
  echo "--- $(date -Iseconds) 배치 $name" >> "$LOG"
  node scripts/avatar/pull-avatars.mjs --reality "$REALITY" --offset "$off" --limit "$STEP" --out "$src" >> "$LOG" 2>&1 || { echo "!! pull 실패 $name" >> "$LOG"; continue; }
  n=$(ls "$src"/*.webp 2>/dev/null | wc -l)
  if [ "$n" -eq 0 ]; then echo "대상 없음 — 종료" >> "$LOG"; break; fi
  npx tsx scripts/avatar/light-unify.ts "$src" "$lit" $EXTRA 2>&1 | grep -E "^반전|미검출 —|^빛" >> "$LOG" || { echo "!! light-unify 실패 $name" >> "$LOG"; continue; }
  npx tsx scripts/avatar/reframe.ts "$lit" "$ref" 2>&1 | grep -E "^완료|건너뜀$|실루엣 없음|미검출" >> "$LOG" || { echo "!! reframe 실패 $name" >> "$LOG"; continue; }
  if [ "${ONLY_FLIPPED:-}" = "1" ]; then
    # 빛 방향만 다시 맞추는 회차 — 뒤집힌 인물만 재등록한다(나머지는 결과가 같다)
    flipped=$(node -e "const r=require('$lit/_light-report.json');console.log(r.filter(x=>x.flipped).map(x=>x.name.replace(/^\d+-/,'').replace(/\.webp$/,'')).join(','))")
    if [ -z "$flipped" ]; then echo "반전 없음 — 등록 생략" >> "$LOG"; rm -rf "$lit"; continue; fi
    npx tsx scripts/avatar/upload-reframed.ts "$ref" --only "$flipped" 2>&1 | grep -E "^성공|^x |^등록 대상" >> "$LOG" || { echo "!! upload 실패 $name" >> "$LOG"; continue; }
  else
    npx tsx scripts/avatar/upload-reframed.ts "$ref" 2>&1 | grep -E "^성공|^x |^등록 대상" >> "$LOG" || { echo "!! upload 실패 $name" >> "$LOG"; continue; }
  fi
  rm -rf "$lit"
done
echo "=== $(date -Iseconds) 끝 $REALITY $FROM..$TO" >> "$LOG"
