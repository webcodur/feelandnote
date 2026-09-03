---
name: celeb-reading
description: 인물 상세의 읽어보기 구획에 노출되는 인물 안내를 작성하거나, 기존 한영 안내를 검수해 통과분은 게시하고 부실한 글만 조사·재작성할 때 사용한다. 인물 탐구는 사용자가 부활을 명시한 경우에만 범위에 넣는다.
---

# 인물 읽어보기

## 범위

작업 전에 `docs/project/celeb/celeb-05-01-reading.md`를 끝까지 읽는다. 현재 화면은 인물 안내만
노출한다. 한국어 `plain_text`와 영어 `plain_text_en`을 한 작업으로 다루고, 닫힌
`interpretive_*` 필드는 기존 값을 보존한다.

현대 실존 인물의 직접 발언과 본인 매체를 조사할 때는 `person-quote-mining`의 인물 식별·원어
검색·화자 확인 원칙을 적용한다. DB 작업은 `docs/project/platform/external-services.md`의
`Oracle DB 운영` 절을 따르고, 한영 대응 검수는 `audit-web-i18n`을 함께 사용한다.

## 흐름

1. live DB에서 active 인물의 안내 행, `review_status`, `published_at`, 한영 누락을 센다.
2. 보통 잔여 작업에서는 `human_reviewed`와 `ai_reviewed`를 스킵한다. 사용자가 전수 재감사를
   명시하면 `ai_reviewed`도 다시 읽되, `human_reviewed`는 의견만 내고 자동으로 고치지 않는다.
3. 대상의 기존 한영 안내를 함께 읽는다. 기준을 통과하면 본문을 보존하고 검수·게시 상태만
   기록한다.
4. 실패한 인물만 신원과 대표 행동을 다시 조사해 한국어와 영어 안내를 재작성한다. 짧은
   이야기는 극적 일화가 아니라 한 행동·질문·생각이 결과나 의미에 닿는 흐름이다. 흐름을
   바꾸지 않는 날짜·수치·직함·고유명사는 덜어낸다.
5. 한 명 또는 작은 묶음마다 검수와 조건부 반영까지 끝낸다. 실패한 인물을 성공 수에 넣지 않고
   `review_status IS NULL`로 남긴다.
6. DB 재조회와 한국어·영어 실제 화면으로 본문·상태·locale 대응을 확인한다.

## 실행 경계

`sw/web-bo/scripts/celeb/readings.ts`는 안내 두 필드만 갱신하고 `interpretive_*`를 전후 대조해
보존한다. 평소 잔여 검수는 미검수만, 사용자가 전수 재감사를 명시한 경우에만
`--recheck-reviewed`로 `ai_reviewed`까지 다시 읽는다. `human_reviewed`는 두 경로 모두 제외한다.

```powershell
pnpm exec tsx scripts/celeb/readings.ts --stats
```
