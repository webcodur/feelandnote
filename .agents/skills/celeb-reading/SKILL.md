---
name: celeb-reading
description: 인물 상세의 읽어보기 구획에 노출되는 인물 안내를 작성하거나, 기존 한영 안내를 검수·수정할 때 사용한다. 인물 탐구는 사용자가 부활을 명시한 경우에만 범위에 넣는다.
---

# 인물 읽어보기

## 범위

작업 전에 `docs/project/celeb/celeb-05-01-reading.md`의 집필·DB 운영 기준을 읽는다.
한국어 `plain_text`와 영어 `plain_text_en`을 한 작업으로 다루고, 닫힌
`interpretive_*` 필드는 기존 값을 보존한다.

현대 실존 인물의 직접 발언과 본인 매체를 조사할 때는 `person-quote-mining`의 인물 식별·원어
검색·화자 확인 원칙을 적용한다. DB 작업은 `docs/project/platform/external-services.md`의
`Oracle DB 운영` 절을 따르고, 한영 대응 검수는 `audit-web-i18n`을 함께 사용한다.

## 흐름

1. live DB에서 대상의 기존 한영 안내와 `published_at`, 누락을 확인한다.
2. 누락된 안내를 작성한다. 기존 글의 재검토를 요청받았으면 한영을 함께 읽고, 통과한 글은 보존하며 보완이 필요한 글을 조사·수정한다.
3. 한 인물씩 본문 확인과 조건부 반영을 끝낸다. 기존 게시 여부를 보존하고, 요청받은 게시·비공개는 `published_at`에 반영한다.
4. DB 재조회와 한국어·영어 실제 화면으로 본문·게시 여부·locale 대응을 확인한다.

## 실행 경계

`sw/web-bo/scripts/celeb/readings.ts`는 안내 두 필드만 갱신하고 `interpretive_*`를 전후 대조해
보존한다. 기존 글 검토는 `--review-existing`, 수정은 `--rewrite-existing`, 게시는 `--publish`로
명시한다. `--stats`는 읽기 전용이며 아래 명령은 `sw/web-bo`에서 실행한다.

```powershell
pnpm exec tsx scripts/celeb/readings.ts --stats
```
