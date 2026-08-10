# 인물 행적 전원 백필 — DB 큐 운영 인계

> 시작: 2026-08-08 · DB SSoT 전환: 2026-08-10 · 상태: **이번 회차 종료. 추가 조사·claim 금지.
> pending 1,854건은 사용자 승인을 받은 별도 회차에서만 재개**
>
> 규격·payload·화면·함정은 `docs/project/celeb-journey.md`가 쥔다. 이 문서는 현재 운영 상태와
> 다음 착수 순서만 기록한다.

## 결론

타임라인 백필은 로컬 조사 파일을 쌓는 방식으로 재개하지 않는다. 다음 세 DB 원천만 사용한다.

- 사건 정본: `public.celeb_timeline_events`
- 조사 근거와 원문 감사 원장: `public.celeb_timeline_research_runs`
- 작업 상태: `public.celeb_task_queue`의 `task_type='timeline_backfill_v1'`

대상은 live DB에서 `celeb_timeline_events`가 0행인 `celebs` 전원이다. `publication_status`,
`celeb_tier`, 생년, 사망년으로 제외하지 않는다. `fiction`은 대상에서 빼지 않고 payload 형식만
`fiction`으로 분기한다.

## 2026-08-10 역사 실측

기존 회차는 `complete` 245명, 사건 1,571건이었다. 조사 결과 246건을 감사 원장으로 이관했고,
Ahmed Sherif 1건은 신원 근거 부족으로 `blocked`·`quarantined`, 사건 0건을 유지했다.

이 숫자는 이전 회차의 종료 스냅샷이다. 현재 작업량과 다음 대상은 항상 live `NOT EXISTS`로
다시 계산한다.

## 종료 시 live 큐 (2026-08-10)

최초 enqueue 뒤 일부 작업이 진행됐다. 2026-08-10 11:24 KST 읽기 전용 실측은 다음과 같다.

- 인물 2,966명: 사건 보유 1,110명, 사건 결손 1,856명
- `timeline_backfill_v1` 큐: pending 1,854, in_progress 0, skipped 1, completed 14
- 사건 14,633건, 조사 원장 261건(원장이 기록한 사건 1,687건)

초기 1,869 pending 가운데 14명은 완료됐고 1명은 근거를 남겨 skipped로 닫혔다. 현재
`in_progress` lease는 없다. 사건 결손 수에는 현재 큐 이전에 격리된 역사 blocked 행도 포함되므로
큐의 pending·skipped 합계와 억지로 같게 맞추지 않는다.

현 worker의 `status`·`verify`는 새 보안 계약 RPC를 선행 검사하며, 위 실측에서 둘 다 통과했다.
이번 회차에서는 여기서 종료한다. **지금 다음 착수는 없다.** 남은 pending 1,854건은 별도 회차에서
사용자가 재개를 승인한 뒤에만 claim한다. 과거 명단이나 이 문서만 보고 자동 재개하지 않는다.

## 운영 기반과 적용 상태

- 적용: `sw/web/supabase/migrations/20260809212156_timeline_direct_db_pipeline.sql`
- 적용: `sw/web/supabase/migrations/20260809234727_timeline_direct_db_corrections.sql`
- 적용: `sw/web/supabase/migrations/20260810004016_timeline_direct_db_security_contract.sql`
- 적용: `sw/web/supabase/migrations/20260810020404_timeline_terminal_requeue_completion_lineage.sql`
- 적용: `sw/web/supabase/migrations/20260810024854_timeline_undated_life_events.sql`
- worker: `sw/web-bo/scripts/timeline-db-worker.mjs`
- package command: `sw/web-bo`의 `pnpm timeline:worker -- <command>`
- DB 작업 RPC: enqueue, claim, renew, complete, correct, fail, requeue, status 8개
- CLI: 위 8개 작업 명령에 읽기 전용 `verify`를 더한 9개 이름

migration은 공용 큐의 다른 task type을 건드리지 않는다. 감사 원장은 RLS와 FORCE RLS를
사용한다. 감사 원장은 `service_role` 읽기만 허용하고 쓰기는 고정된
`SECURITY DEFINER` RPC로만 수행한다. 역할 그래프도 실측 기준선과 달라지면 쓰기 전에 멈춘다.

## 별도 회차가 승인됐을 때의 착수 순서

아래 절차는 이번 회차에서 실행하지 않는다. 신규 조사도 하지 않는다.

### 1. 읽기 전용 사전검사

```powershell
cd sw/web-bo
pnpm timeline:worker -- status
pnpm timeline:worker -- verify
```

`status`와 `verify`는 세 테이블, 작업 RPC 8개, 보안 계약 RPC, ACL·RLS·역할 그래프를 exact
검사한다. 2026-08-10 11:24 KST에는 통과했다. 이후 하나라도 실패하면 enqueue·claim을 비롯한
쓰기 명령을 실행하지 않고 schema drift부터 해결한다.

### 2. 기존 pending 행 claim

현재 `in_progress` 행은 없다. 새 enqueue로 모집단을 흔들지 말고 기존 pending 행부터 고유
worker id로 claim한다. 이후 lease가 생기면 유효한 작업은 건드리지 않고, 만료됐고 작업자가
없을 때만 이유를 남겨 재시도한다.

### 3. 독립 레인 릴레이

각 레인은 고유 worker id로 한 인물을 claim한다.

```powershell
pnpm timeline:worker -- claim --worker lane-01 --lease-minutes 60
```

레인은 claim 응답의 `celebId`, `claimToken`, `profileSnapshot`을 기준으로 조사한다. lease 안에
끝나지 않으면 renew하고, 한 인물을 DB readback까지 닫은 즉시 다음 인물을 claim한다. 다른
레인의 완료를 기다려 묶음 파일을 만들지 않는다.

### 4. 표준입력으로만 완료

조사 payload는 메모리 또는 앞 단계 stdout에서 worker의 표준입력으로 보낸다. payload 경로를
위치 인수로 넘기는 방식은 worker가 거절한다.

```powershell
$payloadJson | pnpm timeline:worker -- commit --worker lane-01 --celeb-id $celebId --claim-token $claimToken
```

complete는 사건 insert, 감사 원장 insert, queue complete를 한 트랜잭션에서 수행하고 즉시
readback한다. profile drift, lease/token 불일치, 기존 사건 발생, 근거 참조 오류가 있으면
부분 적재 없이 실패한다.

### 5. 실패와 blocked를 그 자리에서 닫기

일시 장애는 payload 없이 pending으로 되돌린다.

```powershell
pnpm timeline:worker -- fail --worker lane-01 --celeb-id $celebId --claim-token $claimToken --error $errorMessage --retry
```

근거상 조사를 완료할 수 없으면 `researchStatus='blocked'`, `events=[]`, 근거가 연결된
`blockingIssues`가 있는 payload를 표준입력으로 보낸다.

```powershell
$blockedPayloadJson | pnpm timeline:worker -- fail --worker lane-01 --celeb-id $celebId --claim-token $claimToken --error $errorMessage --skip
```

blocked도 full payload와 근거 그래프를 감사 원장에 남긴다. “충돌이 있으니 나중에 생각”으로
열어 두지 않는다. 일반 blocked인지, 프로필 격리 결정까지 완료한 quarantine인지 구조화해
현재 결론을 저장한다.

terminal 작업을 다시 조사할 명확한 근거가 생겼을 때만 명시적으로 requeue한다.

terminal predecessor를 새 완료 원장과 상호 연결하는 계보 migration은 적용·검증을 마쳤다.
그래도 아래 명령은 명확한 재조사 근거와 사용자 승인이 있을 때만 실행한다.

```powershell
pnpm timeline:worker -- requeue --celeb-id $celebId --reason $reason
```

## 완료 판정

회차 완료는 다음을 모두 만족해야 한다.

1. `status`에서 queue 상태 합계와 감사 원장 합계가 설명된다.
2. `verify`가 schema/RPC 계약을 통과한다.
3. complete 인물은 사건 수·ID·내용과 감사 원장의 payload가 exact readback에 일치한다.
4. skipped 인물은 사건 0건, 비어 있지 않은 blocking issues, 유효한 근거 참조가 원장에 남는다.
5. `philosophy_rewrite_v2` 등 다른 task type의 큐 sentinel이 변하지 않는다.
6. 남은 대상 수는 과거 숫자가 아니라 다시 계산한 live `NOT EXISTS`와 일치한다.

## 재개 금지 사항

- 공개 상태·등급·생년·사망 여부 필터를 되살리지 않는다.
- 이전 회차 숫자나 목록을 현재 큐로 간주하지 않는다.
- 조사 payload, 충돌 판단, 적용 영수증을 로컬 운영 원천으로 만들지 않는다.
- commit 또는 blocked skip에 payload 파일 경로를 넘기지 않는다.
- lease/token 검증과 DB readback을 우회해 사건 테이블에 직접 쓰지 않는다.
- `fiction`을 별도 모집단으로 빼거나 실제 연도를 만들어 넣지 않는다.
- 이번 회차 종료 뒤 남은 pending을 자동 claim하거나 신규 조사하지 않는다.

## 연계

- 규격·payload·화면·함정: `docs/project/celeb-journey.md`
- 기본 DB migration: `sw/web/supabase/migrations/20260809212156_timeline_direct_db_pipeline.sql`
- 교정 migration: `sw/web/supabase/migrations/20260809234727_timeline_direct_db_corrections.sql`
- 적용된 보안 gate: `sw/web/supabase/migrations/20260810004016_timeline_direct_db_security_contract.sql`
- terminal 재큐 계보 migration: `sw/web/supabase/migrations/20260810020404_timeline_terminal_requeue_completion_lineage.sql`
- 적용된 날짜 미상 양식 migration: `sw/web/supabase/migrations/20260810024854_timeline_undated_life_events.sql`
- worker: `sw/web-bo/scripts/timeline-db-worker.mjs`
- worker 계약: `sw/web-bo/scripts/lib/timeline-direct-contract.mjs`
- payload 검증: `sw/web-bo/scripts/lib/timeline-direct-schema.mjs`
