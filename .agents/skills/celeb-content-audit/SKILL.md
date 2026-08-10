---
name: celeb-content-audit
description: 셀럽 콘텐츠 데이터(출처, review, locale, thumbnail) 검증 및 보완. /celeb-content-audit 셀럽명으로 실행.
---

# 콘텐츠 데이터 감사

셀럽의 `celeb_contents` 데이터를 검증하고 보완한다.

## 필수 사전 읽기

실행 전 반드시 아래 문서를 Read tool로 읽는다:

- `docs/project/celeb/celeb-content-audit.md` — 감사 규칙 (5단계 절차, locale 규칙, thumbnail 확보법, 보고 형식)

## 실행

사용자가 조사·보완을 요청하면 현재 DB 스키마를 조회한 뒤 `contents`·`content_locales`·
`celeb_contents`의 실제 값만 바로 보완한다. 별도 요청이 없는 한 조사 관리용 컬럼·테이블·
큐·RPC·worker·인수인계 문서를 새로 만들지 않는다.

1. 대상 셀럽의 `celebs.id`를 조회한다 (`nickname` 또는 `nickname_en`으로 검색)
2. 룰북의 Phase 1~5를 순서대로 수행한다
3. MUSIC이 있거나 레거시 후보 이력이 있으면 `pending=0`, 등록 후보의 최종 연결,
   기각 후보의 사유까지 검사한다
4. `review_en` 공백을 번역 완료로 간주하지 않는다
5. 보고 형식에 맞춰 결과를 출력한다
