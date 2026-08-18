---
name: celeb-reading
description: 인물 상세의 읽어보기 구획에 들어가는 인물 안내와 인물 탐구를 작성하거나, 기존 전량을 선검수해 좋은 글은 스킵하고 부실한 글만 조사·한영 재작성·검수·DB 반영할 때 사용한다. "인물 안내 작성", "인물 탐구", "읽어보기 채우기", "읽어보기 전량 재검수", "celeb_explanations 배치" 요청에 적용한다.
---

# 인물 읽어보기

## 기준

작업 전에 `docs/project/celeb/person-reading.md`를 끝까지 읽는다. 글의 목적, 조사 서열, 두 탭의
분리, 한영 동시 작성, 검수와 게시 규칙은 그 문서만 따른다. 이 스킬에 문장 규칙을 복제하지
않는다.

현대 실존 인물의 직접 발언과 본인 매체를 조사할 때는 `person-quote-mining`의 인물 식별,
원어 검색, 화자 확인 원칙을 함께 적용한다. DB 작업에는 `supabase`, 결과의 locale 대응에는
`audit-web-i18n`을 함께 사용한다.

## 흐름

1. DB의 현재 행, 검수 상태, 번역 상태를 센다.
2. `human_reviewed`와 `ai_reviewed`는 스킵한다.
3. `NULL`인 기존 글은 한영 두 탭을 읽는다. 통과하면 본문을 유지하고 `ai_reviewed`를 즉시 기록한다.
4. 실패한 인물은 같은 릴레이에서 즉시 신원 조사와 심화 조사로 넘긴다. 조사 URL은 DB에 적재하지 않는다.
5. 같은 릴레이에서 한국어 초안, 한영 최종본, 의미 검수, `ai_reviewed` 조건부 반영까지 끝낸 뒤 다음 인물 또는 작은 묶음을 받는다.
6. 혼합 표본을 직접 읽어 품질과 속도를 확인한 뒤 전량을 독립 릴레이로 처리한다. 전원 판정을 끝내고 나서 별도 재작성 단계로 넘어가는 전역 단계 분리는 금지한다.
7. DB 재조회, 검수·공개 상태, locale 대응과 실제 화면을 확인한다.

## 실행

`sw/web-bo`에서 실행한다.

```powershell
pnpm exec tsx scripts/celeb/readings.ts --slugs=jiwoo,brad-pitt,bai-juyi --rewrite-existing --review-existing --research --deep-research --generate --apply --resume
pnpm exec tsx scripts/celeb/readings.ts --all --rewrite-existing --review-existing --research --deep-research --generate --apply --resume
pnpm exec tsx scripts/celeb/readings.ts --stats
```

전량 교체는 `--all --rewrite-existing --review-existing` 조합에서만 허용한다. `human_reviewed`는
자동화가 덮어쓰지 않는다. 심화 조사·생성에는 프로세스 락을 사용한다. 실패한 인물을 성공
수에 넣지 않고 `.tmp-celeb-reading/`의 실패 사유와 재개 명령을 보고한다. 한 릴레이는 현재
최대 8명 묶음의 `판정 → 통과 상태 반영 또는 실패자 즉시 재작성 → DB 반영`을 모두 끝내야
다음 묶음으로 이동한다. 판정 캐시는 입력 해시가 같을 때만 재사용한다.
