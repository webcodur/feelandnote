---
name: celeb-content-audit
description: 셀럽 콘텐츠 데이터(출처, review, locale, thumbnail) 검증 및 보완. /celeb-content-audit <셀럽명> 으로 실행.
---

# 콘텐츠 데이터 감사

셀럽의 user_contents 데이터를 검증하고 보완한다.

## 필수 사전 읽기

실행 전 반드시 아래 문서를 Read tool로 읽는다:

- `docs/project/celeb/celeb-content-audit.md` — 감사 규칙 (5단계 절차, locale 규칙, thumbnail 확보법, 보고 형식)

## 실행

1. 대상 셀럽의 profiles.id를 조회한다 (nickname 또는 nickname_en으로 검색)
2. 룰북의 Phase 1~5를 순서대로 수행한다
3. 보고 형식에 맞춰 결과를 출력한다
