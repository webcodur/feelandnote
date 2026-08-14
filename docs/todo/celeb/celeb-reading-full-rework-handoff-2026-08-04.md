# 인물 읽어보기 전량 재검수·재작성 인수인계

## 남은 규모 (2026-08-14 실측)

**본문 작성은 사실상 끝났다. 남은 것은 검수 표시다.**

| 항목 | 공개 인물(1,858) | 전체(2,968) |
|---|---:|---:|
| 인물 안내 없음 | 7 | 298 |
| 안내는 있는데 탐구 없음 | **0** | **0** |
| 영문 없음 | **0** | **0** |
| `review_status` 미표시 | — | 1,617 / 2,670행 |

- 공개 인물 중 안내가 빈 7명만 새로 쓰면 되고, 나머지는 **본문·탐구·한영이 모두 채워져 있다.**
- 그러므로 이 문서의 「전량 재작성」 전제는 더 이상 맞지 않는다. 실제 작업은
  **기존 글 판정 → `review_status = 'ai_reviewed'` 기록**이 대부분이고, 재작성은 예외다.
- 비공개 298명은 화면에 뜨지 않으므로 공개분을 먼저 끝낸다.

## 다음 세션의 목표

라이브 `profiles`를 기준으로 읽어보기를 전량 검수한다. 기존 글이 좋으면 본문을 보존하고
`review_status = 'ai_reviewed'`만 기록한다. 부족한 글은 자료 조사부터 한영 재작성·검수·DB
반영까지 마친 뒤 같은 상태를 기록하며, 읽어보기 행 자체가 없는 인물도 같은 실행에서 만든다.

핵심 수정 사항은 **전량 판정 후 재작성하는 2단계 구조를 없애는 것**이다. 기본 24개 독립
릴레이가 현재 인물 또는 최대 8명 작은 묶음의 작업을 끝까지 완결한 뒤 다음 묶음으로 가야 한다.

```text
현재 묶음 로드
  → 검수 완료 상태면 스킵
  → NULL이면 기존 한영 글 판정
      → 통과: 본문 불변 + ai_reviewed 즉시 조건부 반영
      → 실패: 즉시 조사 → 한국어 초안·개선 → 영어 작성·대조 → 검수 → 본문+ai_reviewed 조건부 반영
  → 다음 묶음
```

`전원 판정 → 전원 조사 → 전원 재작성` 전역 단계 분리는 금지한다. `Promise.race`나 공유 작업
탈취 방식도 쓰지 않는다. 각 레인이 자기 명단을 순서대로 완주한다.

## 반드시 먼저 읽을 문서

1. `AGENTS.md`
2. `docs/project/celeb/person-reading.md` — 유일 SSoT
3. `.agents/skills/celeb-reading/SKILL.md`
4. `.agents/skills/supabase/SKILL.md`
5. `.agents/skills/audit-web-i18n/SKILL.md`

DB 스키마를 다시 바꿀 필요는 없다. 이번 후속 작업의 주 대상은
`sw/web-bo/scripts/generate-celeb-readings.ts`의 실행 순서다.

## 현재 DB 상태

2026-08-12 `--stats` 라이브 실측이다. 아래 값은 다시 움직일 수 있으므로 실행 직전에 재측정한다.

| 항목 | 수치 |
|---|---:|
| 전체 프로필 | 2,968 |
| 읽어보기 행 | 2,670 |
| 읽어보기 행 없음 | 298 |
| 공개 | 1,733 |
| 비공개 | 937 |
| `review_status IS NULL` | 1,617 |
| `ai_reviewed` | 1,053 |
| `human_reviewed` | 0 |
| 공개 상태 불일치 | 470 |

아래 3명은 2026-08-04 최초 시험 대상 기록이다. 현재 AI 검수 완료자는 1,053명이다.

- `jiwoo`: 기존 본문 통과, 상태만 반영
- `bai-juyi`: 한영 재작성 후 반영
- `brad-pitt`: 한영 재작성 후 반영

출처 저장용 `celeb_explanation_sources` 테이블은 삭제 완료했다. 조사 URL은 임시 캐시에만 두며
DB에 다시 만들지 않는다. 현행 상태 마이그레이션은
`sw/web/supabase/migrations/20260804060931_replace_celeb_explanation_sources_with_review_status.sql`이다.

## 2026-08-04 중단 배치와 2026-08-12 캐시 폐기

잘못된 기존 구현은 2,667명 전체의 판정을 먼저 모으고 나서야 통과 상태 기록과 재작성을
시작하도록 되어 있었다. 사용자 지적 직후 해당 프로세스 트리를 중단했다.

- 중단한 루트 명령 PID: `32384`
- 실제 tsx PID: `64936`
- 중단 시각: 2026-08-04 KST
- DB 반영: 시험 3명 외에는 없음
- 판정 캐시: 2,395명
  - 통과 772명
  - 재작성 1,623명
  - 비정상 캐시 0명
- 아직 판정 캐시가 없는 대상: 272명

당시 생성 경로이며 2026-08-12 임시 폴더 정리로 모두 삭제했다.

- 판정 캐시: `sw/web-bo/.tmp-celeb-reading/reviews/`
- 표준 출력 로그: `sw/web-bo/.tmp-celeb-reading/full-rework-20260804-153055.out.log`
- 오류 로그: `sw/web-bo/.tmp-celeb-reading/full-rework-20260804-153055.err.log` — 중단 당시 0바이트
- 실행 락: `sw/web-bo/.tmp-celeb-reading/run.lock`

기록된 PID `64936`은 종료됐다. 다음 실행은 DB의 현재 `review_status`를 재개 지점으로 삼고,
필요한 캐시와 실행 락을 새로 만든다. `.tmp-celeb-reading/`은 정본이 아니며 실행·실패 인계가
끝나면 전체 삭제한다.

## 코드에서 고칠 곳

파일: `sw/web-bo/scripts/generate-celeb-readings.ts`

현재 문제 구간은 대략 다음과 같다.

- `reviewExistingMaterials()`가 모든 `pendingReview`를 먼저 끝낸다.
- `main()`의 기존 흐름은 약 1854행에서 전체 판정을 기다리고, 통과자를 한꺼번에 상태 반영한다.
- 그 뒤 약 1872행부터 재작성 대상 전체를 한꺼번에 조사한다.
- 약 2058행 이후에야 별도 생성 릴레이를 만든다.

이를 다음 구조로 바꾼다.

1. 최초 DB 조회에서 `ai_reviewed`·`human_reviewed`는 작업 목록에서 제외한다.
2. 남은 대상을 최대 8명 묶음으로 나눠 24개 고정 레인에 round-robin 배정한다.
3. 각 `runLane()`이 자기 묶음에 대해 판정 캐시를 입력 해시로 확인한다.
4. 캐시가 없거나 해시가 다르면 그 묶음만 검수한다.
5. 통과자는 그 자리에서 `markExistingReviewPassed()`를 실행한다.
6. 재작성자는 그 묶음만 `researchProfiles()`와 `researchProfilesDeep()`에 넘긴다.
7. 조사 확인 후 `generateBatch()`와 `applyReading()`까지 끝낸다.
8. 현재 묶음의 통과·재작성·실패 처리가 모두 끝난 뒤 같은 레인의 다음 묶음으로 간다.
9. 한 묶음 실패는 다른 레인을 막지 않는다. 실패자는 `NULL`로 남기고 로그에 사유를 적는다.

당시 판정 캐시 2,395건은 2026-08-12 삭제됐다. 다음 실행에서 새로 생성한 캐시에만 아래 재사용
규칙을 적용한다.

- 입력 해시가 맞는 `pass`: 모델 판정을 생략하고 즉시 상태만 반영
- 입력 해시가 맞는 `rewrite`: 모델 판정을 생략하고 즉시 조사·재작성
- 입력 해시 불일치: 현재 본문을 다시 판정

기존 조사·초안·최종본 캐시도 현행 버전과 입력 해시 검사를 통과할 때만 재사용한다.

## 구현 후 필수 시험

전량을 바로 재시작하지 말고 다음 혼합 표본으로 실제 `--apply` 시험을 한다.

```powershell
cd C:\project\feelandnote\sw\web-bo
pnpm.cmd exec tsx scripts/generate-celeb-readings.ts --slugs=jiwoo,brad-pitt,bai-juyi --rewrite-existing --review-existing --research --deep-research --generate --apply --resume
```

세 명은 이미 `ai_reviewed`이므로 모델 호출과 본문 쓰기 없이 모두 상태 스킵되어야 한다. 이어서
DB 상태가 `NULL`인 표본을 골라 캐시 없이 판정부터 반영까지 완주하는지 시험한다.

확인할 것:

1. 통과 판정을 받은 인물은 즉시 상태 반영되고 본문·`updated_at`이 불필요하게 바뀌지 않는다.
2. 재작성 판정을 받은 인물은 판정 단계에서 멈추지 않고 같은 레인 로그에 조사·생성·DB 반영까지 나온다.
3. 그 묶음이 완결되기 전에 같은 레인의 다음 묶음 로그가 나오지 않는다.
4. 다른 레인은 독립적으로 진행한다.
5. 실패자는 `review_status IS NULL`이고 성공 수에 포함되지 않는다.
6. 한국어와 영어 여섯 필드가 한 행 갱신으로 함께 반영된다.

시험이 통과하면 전량을 재개한다.

```powershell
pnpm.cmd exec tsx scripts/generate-celeb-readings.ts --all --rewrite-existing --review-existing --research --deep-research --generate --apply --resume
```

백그라운드 실행 시 Windows에서는 `Start-Process -WindowStyle Hidden`을 쓰고 stdout·stderr를
별도 파일로 남긴다. 새 프로세스의 PID, 로그 전체 경로, 시작 시각을 이 문서에 추가한다.

## 완료 판정

```powershell
pnpm.cmd exec tsx scripts/generate-celeb-readings.ts --stats
```

아래가 모두 맞아야 완료다.

- `review_status IS NULL = 0`
- `ai_reviewed + human_reviewed = celeb_explanations 전체 행 수`
- 읽어보기 행이 없는 프로필 0
- 한국어·영어 여섯 필드 누락 0
- 현재 publication status 정책과 공개 여부 일치
- 공개 상태 불일치 0
- 공개 RLS에서 비활성 인물 노출 0
- 실패 로그 0, 또는 실패 명단과 재개 명령을 문서에 명시
- 혼합 표본을 사람이 직접 읽어 안내·탐구 분리, 구체성, 번역 일치를 재확인

## 이번 세션에서 이미 끝낸 변경

- `docs/project/celeb/person-reading.md`에 인물/작은 묶음 즉시 완결 릴레이 규칙 추가
- `.agents/skills/celeb-reading/SKILL.md`에 전역 단계 분리 금지 추가
- `review_status` nullable 상태와 DB CHECK 제약 적용
- 관리자 화면에 미검수·AI 검수 완료·인간 검수 완료 표시
- 출처 테이블과 관련 코드 제거
- 3명 시험과 재실행 스킵 검증

다음 세션은 스키마나 룰을 다시 설계하지 말고, 위 실행 순서 리팩터링부터 이어간다.
