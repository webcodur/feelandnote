#!/bin/sh
# 명세 폴더의 작품 등록을 한 건씩 실행한다. 기본은 dry-run이며 --apply를 주면 반영한다.
# 사용: sh scripts/figure-books/run-manifests.sh <명세폴더> [--apply]
DIR="$1"
APPLY=""
if [ "$2" = "--apply" ]; then APPLY="--apply"; fi
OK=0; FAIL=0
for f in "$DIR"/*.json; do
  case "$f" in *_index.json|*.receipt.json) continue;; esac
  name=$(basename "$f")
  # 이미 반영이 끝난 영수증이 있으면 다시 부르지 않는다. 등록기가 재실행을 거부한다.
  receipt="${f%.json}.receipt.json"
  if [ -n "$APPLY" ] && [ -f "$receipt" ] && grep -q '"status": "applied' "$receipt"; then
    OK=$((OK+1)); echo "OK   $name (already-applied)"; continue
  fi
  out=$(timeout 300 node --env-file=.env --import tsx scripts/figure-books/source-book-batch.ts --file "$f" $APPLY 2>&1)
  if echo "$out" | grep -q '"status": "dry-run-complete"\|"status": "applied'; then
    action=$(echo "$out" | grep '"action"' | head -1 | sed 's/.*: "//;s/".*//')
    OK=$((OK+1)); echo "OK   $name ($action)"
  else
    FAIL=$((FAIL+1)); echo "FAIL $name :: $(echo "$out" | grep -iE 'error|Error' | head -1 | cut -c1-160)"
  fi
done
echo ""
echo "통과 $OK / 실패 $FAIL"
