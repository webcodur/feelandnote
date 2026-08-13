---
name: celeb-activation-audit
description: 전체 또는 비활성 셀럽의 아바타·기본정보·영향력·스펙트럼·대사·한영 번역·콘텐츠 조사/locale/출처 링크 보유 상태를 전수 감사하고, 모든 필수조건을 통과한 인물만 active로 일괄 전환한다. "전체 인물 데이터 보유율", "활성화 가능한 인물 찾아줘", "데이터 완성된 셀럽 activate", "셀럽 공개 준비도 감사", "inactive 전수 검사" 요청에 사용한다.
---

# 셀럽 활성화 감사

## 필수 사전 확인

1. `docs/project/celeb/celeb-pipeline.md`를 읽는다.
2. full 콘텐츠 판정이 포함되면 `docs/project/celeb/celeb-content-audit.md`를 읽는다.
3. Supabase 작업이므로 `supabase` 스킬을 함께 적용한다.

## 단일 실행 경로

`sw/web-bo`에서 아래 스크립트만 사용한다. 같은 SQL·TypeScript를 즉석에서 다시 만들지 않는다.

```bash
# 읽기 전용 전수 감사. source_url HTTP 상태도 확인한다.
pnpm exec tsx scripts/audit-celeb-activation-readiness.ts

# 기계 판독 결과
pnpm exec tsx scripts/audit-celeb-activation-readiness.ts --json

# 전체 공개 상태의 인물별·티어별·영역별 구조 보유율 추적
pnpm exec tsx scripts/audit-celeb-activation-readiness.ts --status=all --skip-link-check

# 일부 인물만 감사
pnpm exec tsx scripts/audit-celeb-activation-readiness.ts --slugs=slug-a,slug-b

# 사용자에게 active 반영을 명시적으로 요청받았을 때만 실행
pnpm exec tsx scripts/audit-celeb-activation-readiness.ts --apply
```

`--json`의 `rows[].coverage`는 인물별 보유율과 완료·누락 영역을 담는다. full/light는
기본정보·영향력·스펙트럼·발화·콘텐츠 조사 5영역, fiction은 기본정보·대표 원전 2영역을
동일 가중치로 센다. 한 필드라도 빠진 영역은 미완료이므로 이 값은 셀 개수 비율이 아니라
운영 가능한 **영역 완성도**다.

`--skip-link-check`는 네트워크 장애를 분리하거나 전체 구조 보유율을 빠르게 실측할 때만 쓴다.
그 결과를 최종 활성화 후보로 부르지 않는다. 최종 후보 판정은 옵션 없이 source URL의 HTTP
상태까지 검사한다.

## 판정 계약

- 전 티어: `avatar_url`, `gender`, `nationality`와 한·영 기본 프로필이 필수다. 실존 인물은 `birth_date`도 필수다.
- full/light: 영향력 7축 한영, 스펙트럼 16축 점수·근거 한영, speech tone, 명언 한영, 7상황×3개 대사 한영이 필수다.
- full: 콘텐츠 1건 이상, 전부 `FINISHED`, `review`, `review_en`, `source_url`, ko/en locale의 제목·저자·표지, BOOK ISBN, source URL 2xx가 필수다.
- light: 콘텐츠 0건이며 `content_research_confirmed_empty_at`이 기록돼 있어야 한다.
- fiction: 대표 원전 연결이 1건 이상이고 원전의 ko/en locale 메타가 완전해야 한다.
- 폐기 예정 감상 여정·가상 독백·대표 화보는 활성화 조건이 아니다.
- `suspended`와 `deleted`는 자동 활성화하지 않는다.

## 반영 안전장치

1. 기본 dry-run 결과와 후보 수를 먼저 보고한다.
2. `--apply`는 사용자의 명시적 활성화 지시가 있을 때만 실행한다.
3. 스크립트가 반환한 후보 ID만 조건부 UPDATE로 바꾼다.
4. 반영 수가 후보 수와 다르면 실패로 중단한다.
5. 반영 후 DB에서 대상 status와 `active/avatar_url NULL` 신규 발생 여부를 재조회한다.
6. 캐시 무효화 결과를 보고한다. 실패하면 데이터 반영과 구분해 보고한다.

## 보고

- 감사 범위, 엄격 완비 수·비율, 티어별 수, 영역 평균 보유율
- 실제 활성화 수
- 주요 탈락 사유와 아바타 누락 수
- source URL 검사 수행 여부
- DB 재검증 결과와 캐시 상태

내용 정합성의 사람 눈 검수까지 수행하지 않았다면 “구조·링크 기준 통과”라고 표현하고 “사실 검증 완료”라고 쓰지 않는다.
