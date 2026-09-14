#!/usr/bin/env bash
# Grok에서 방금 내려받은 아바타 한 장을 검사해 국문 이름으로 옮긴다.
# 절차와 출력별 대응은 docs/todo/img/hero-avatar-grok.md 「한 명을 뽑는 순서」.
#
# 사용 (sw/web-bo 에서):
#   bash scripts/photo/grok-avatar-save.sh <slug> <직전에 저장한 다운로드 파일명> [대기초=20]
#
# 출력 한 줄:
#   OK        정사각 → .tmp/hero-out/_avatars/<국문 이름>.jpg
#   VERTICAL  세로   → .tmp/hero-out/_redo/<국문 이름>-세로-<원본>.jpg
#   DUP       기존 결과와 같은 파일이다(다운로드 클릭이 먹지 않았다)
#   NONE      기준 파일보다 새 파일이 없다
cd /c/project/feelandnote/sw/web-bo || exit 1
SLUG="$1"; REF="/c/Users/webco/Downloads/$2"
sleep "${3:-20}"
NEW=$(ls -t /c/Users/webco/Downloads/*.jpg 2>/dev/null | head -1)
if [ ! "$NEW" -nt "$REF" ]; then echo "NONE 새 파일 없음 (기준 $2)"; exit 0; fi
BASE=$(basename "$NEW")
HASH=$(md5sum "$NEW" | cut -d' ' -f1)
MATCH=$(for f in .tmp/hero-out/_avatars/*.jpg .tmp/hero-out/_redo/*.jpg .tmp/hero-out/_ab/*.jpg .tmp/hero-out/_ab2/*.jpg; do [ -f "$f" ] && md5sum "$f"; done | grep -F "$HASH")
if [ -n "$MATCH" ]; then echo "DUP $BASE 중복: $MATCH"; exit 0; fi
NAME=$(node -e "console.log(require('./.tmp/grok-queue/$SLUG.json').nickname)")
cp "$NEW" .tmp/_incoming.jpg
DIM=$(node -e "require('sharp')('.tmp/_incoming.jpg').metadata().then(m=>console.log(m.width+'x'+m.height))")
if [ "${DIM%x*}" = "${DIM#*x}" ]; then
  mv .tmp/_incoming.jpg ".tmp/hero-out/_avatars/$NAME.jpg" && echo "OK $BASE → _avatars/$NAME.jpg ($DIM)"
else
  mv .tmp/_incoming.jpg ".tmp/hero-out/_redo/$NAME-세로-${BASE%.jpg}.jpg" && echo "VERTICAL $BASE → _redo/$NAME-세로-${BASE%.jpg}.jpg ($DIM)"
fi
