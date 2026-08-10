# 인물 행적 (생애 연표 · 서사 연표 · 활동 반경)

> **운영 SSoT 전환: 2026-08-10** — 서비스 사건은 `celeb_timeline_events`, 조사 원문과
> 근거는 `celeb_timeline_research_runs`, 작업 상태는 공용 `celeb_task_queue`의
> `timeline_backfill_v1` 행이 단일 원천이다. 타임라인 조사 자료를 로컬 파일에 영구 보관하지 않는다.
>
> **현재 운영 게이트(2026-08-10):** 기본 큐·교정·보안 계약 migration은 운영 DB에 적용됐고,
> 11:24 KST 읽기 전용 실측에서 `status`와 `verify`가 모두 통과했다. 일반 pending 작업은 운영
> 승인 뒤 claim할 수 있다. 다만 `20260810020404_timeline_terminal_requeue_completion_lineage.sql`은
> 아직 미적용이므로, 이미 `skipped`·`blocked`로 닫힌 terminal 작업은 이 migration의 적용과
> 트리거 검증 전까지 requeue하지 않는다.

인물 상세 화면의 행적 구획 SSoT다. 실존 인물은 연도형 「생애 연표」, `fiction` 인물은
대표 원전 순서형 「서사 연표」로 같은 사건 테이블을 사용한다. 사건 가운데 좌표가 있는 행만
활동 반경 지구본에 오른다. 활동 반경 전용 테이블은 따로 두지 않는다.

## 대상 — 등록된 인물 전원

모집단은 **`celebs`의 모든 행 가운데 `celeb_timeline_events`가 한 행도 없는 인물**이다.
항상 live DB에서 다음 의미의 `NOT EXISTS`로 판정한다.

```sql
select c.id
from public.celebs c
where not exists (
  select 1
  from public.celeb_timeline_events e
  where e.celeb_id = c.id
);
```

`publication_status`·`celeb_tier`·생년·사망년을 비롯한 프로필 값은 제외 필터가 아니다.
`fiction`도 제외하지 않고 결과 형식만 `life`와 다르게 한다. 과거 대상 수나 이전 작업 목록을
다음 회차의 모집단으로 재사용하지 않는다.

- 생년을 알면 출생 사건을 맨 앞에 한 번 둔다. 모르면 출생 사건을 강제하지 않는다.
- 사망년을 알면 사망 사건을 맨 뒤에 한 번 둔다. 모르거나 생존 중이면 강제하지 않는다.
- 생몰 정보가 부분 날짜·근삿값·기원전 표기이면 원문 정밀도를 보존한다. 근거 없이
  `YYYY-MM-DD`로 승격하지 않는다.
- `birthDate`·`deathDate`에 근거 충돌이 기록된 경우, 확인되지 않은 프로필 경계에 맞추려고
  출생·사망 사건을 만들지 않는다.
- `fiction`은 실제 연도를 억지로 부여하지 않고 대표 원전 안의 순서를 기록한다.

## 2026-08-10 역사 실측

기존 회차에서 `complete` 245명과 사건 1,571건을 적재했다. 조사 결과 246건은 DB 감사 원장으로
이관했으며, 그중 Ahmed Sherif 1건은 신원 근거 부족으로 `blocked`와
`applicationStatus='quarantined'`, 사건 0건을 유지했다. 이 숫자는 당시 회차의 역사
스냅샷일 뿐 현재 결손 수나 다음 작업량이 아니다.

다음 회차는 반드시 live DB의 `NOT EXISTS` 결과에서 시작한다. 공개 상태·등급·생년·사망 여부를
추가 필터로 붙이지 않는다.

## DB SSoT

### `celeb_timeline_events`

화면에 제공하는 사건 정본이다.

| 컬럼 | 의미 |
|---|---|
| `celeb_id` | 사건 소유 인물 |
| `year`, `year_end`, `month`, `day` | `life` 사건의 시점. 기원전 연도는 음수 |
| `sequence_label`, `sequence_label_en` | `fiction` 사건의 원전 내 단계 |
| `title`, `title_en` | 국·영문 제목 |
| `description`, `description_en` | 국·영문 서술 |
| `kind` | `birth`, `death`, `education`, `work`, `publish`, `battle`, `travel`, `office`, `meeting`, `other` |
| `place_name`, `place_name_en`, `lat`, `lng`, `place_qid` | 장소와 검증된 좌표 |
| `source_url` | 사건이 참조한 첫 근거 URL |
| `sort_order` | DB가 최종 산출한 표시 순서 |

`life` 사건은 연도 계열을, `fiction` 사건은 `sequence_label` 계열을 쓴다. 두 체계를 한 인물에
섞지 않는다. `sort_order`는 조사자가 신뢰 경계 밖에서 고정하는 값이 아니라 complete RPC가
검증된 사건 배열로부터 산출한다.

### `celeb_timeline_research_runs`

조사 전체를 손실 없이 남기는 append-only 감사 원장이다. `celeb_timeline_events`가 화면에 필요한
한 URL만 표현하는 데 비해, 이 테이블은 다음을 모두 보존한다.

- 정규화된 프로필 스냅샷과 조사 payload 원문
- 다중 `sources`와 사건별 `event_evidence`
- `profile_conflicts`와 `blocking_issues`
- 연구 fingerprint, claim 정보, 사건 ID 배열과 사건 수
- `complete` 또는 근거가 연결된 `blocked` 결과

`research_fingerprint`는 정규 JSON payload의 소문자 SHA-256이며 `(celeb_id,
research_fingerprint)`가 유일하다. 동일 claim과 동일 payload의 재전송은 멱등 처리하고, 내용이
다른 재전송은 거절한다.

### `celeb_task_queue`

별도 타임라인 큐를 만들지 않고 기존 공용 큐를 재사용한다. 모든 조회·갱신은
`task_type='timeline_backfill_v1'`로 제한되므로 `philosophy_rewrite_v2`를 비롯한 다른 작업 행에
영향을 주면 안 된다.

큐의 lease와 claim token이 한 인물의 쓰기 권한이다. claim은 `FOR UPDATE SKIP LOCKED`로 서로
다른 인물을 가져가며, 긴 조사는 만료 전에 renew한다. 실패한 작업은 `fail --retry`로 즉시
`pending`에 되돌리고, 조사 불가가 근거로 확정된 작업만 `fail --skip`으로 감사 원장을 남긴 뒤
`skipped`로 닫는다. terminal 작업을 다시 열 때는 명시적인 requeue만 사용한다.

## 마이그레이션과 보안

현재 구현은 다음 네 migration을 한 세트로 본다. 앞의 세 개는 모든 worker 명령의 공통 기반이고,
마지막 하나는 terminal 작업을 명시적으로 다시 열 때 필요한 계보 계약이다.

- `20260809212156_timeline_direct_db_pipeline.sql` — 큐·감사 원장·기본 RPC
- `20260809234727_timeline_direct_db_corrections.sql` — 감사 이력을 보존하는 교정 RPC
- `20260810004016_timeline_direct_db_security_contract.sql` — 실제 ACL·RLS·RPC·역할 그래프를
  읽어 고정하는 fail-closed 계약. **2026-08-10 운영 DB 적용·읽기 검증 통과**
- `20260810020404_timeline_terminal_requeue_completion_lineage.sql` — terminal 재큐가 이전 원장을
  덮지 않고 상호 predecessor/successor 계보로 잇게 하는 계약. **2026-08-10 운영 DB 미적용**

- `celeb_timeline_research_runs`는 RLS와 FORCE RLS를 모두 사용하고 공개 정책을 두지 않는다.
- `anon`·`authenticated`에는 테이블 권한과 RPC 실행 권한이 없다.
- 감사 원장 테이블은 `service_role`에 `SELECT`, `INSERT`만 허용하며 `UPDATE`, `DELETE`는
  허용하지 않는다.
- 작업 RPC 8개는 `SECURITY DEFINER`, 고정 `search_path=pg_catalog`, `service_role` 전용이다.
- complete와 blocked skip은 profile drift, lease, claim token, 기존 사건 0행 여부를 다시
  검사한 뒤 사건·감사 원장·큐 상태를 한 트랜잭션에서 확정한다.

보안 계약은 `service_role`로 전환 가능한 정상 역할과 membership edge까지 정확히 비교한다.
2026-08-10 운영 기준선의 정상 경로는 `authenticator`, `postgres`, `cli_login_postgres`,
`supabase_storage_admin`에서 비롯되며 `anon`·`authenticated`에는 그런 경로가 없다. 이는 데이터를
넣는 절차가 아니라, 권한 상승 경로가 새로 생기거나 사라졌을 때 **쓰기 전에 중단하는 검사**다.

브라우저나 일반 사용자 세션에서 이 RPC를 호출하지 않는다. 운영 worker만 백오피스의
service-role 환경을 사용한다.

## 직접 DB worker

진입점은 `sw/web-bo/scripts/timeline-db-worker.mjs`, 패키지 명령은 `timeline:worker`다.
DB 작업 명령은 8개(`enqueue`, `claim`, `renew`, `commit`, `correct`, `fail`, `requeue`,
`status`)이고, 별도의 읽기 전용 계약 검사 명령 `verify`가 있어 CLI 명령 이름은 모두 9개다.

먼저 현재 스키마와 큐를 읽기 전용으로 확인한다.

```powershell
cd sw/web-bo
pnpm timeline:worker -- status
pnpm timeline:worker -- verify
```

`status`와 `verify`는 먼저 세 테이블, 작업 RPC 8개, 보안 계약 RPC, ACL·RLS·역할 그래프의
exact 계약을 확인한다. 2026-08-10 11:24 KST에는 둘 다 통과했다. 이후 계약이 달라지면 두
명령은 데이터를 쓰지 않고 실패한다.

### 작업 수명주기

```powershell
pnpm timeline:worker -- enqueue
pnpm timeline:worker -- claim --worker lane-01 --lease-minutes 60
pnpm timeline:worker -- renew --worker lane-01 --celeb-id $celebId --claim-token $claimToken
```

`enqueue`는 그 시점의 live DB에서 `NOT EXISTS`인 전원을 넣는다. terminal 감사 원장은 보존하며,
명시적으로 requeue된 인물만 다시 claim할 수 있다. 독립 레인은 claim 결과에 포함된
`profileSnapshot`을 그대로 조사 payload에 유지한다.

complete payload는 **표준입력으로만** 전달한다. worker는 위치 인수나 payload 파일 경로를
받지 않는다. PowerShell에서는 메모리에 든 JSON 문자열이나 앞 단계의 stdout을 파이프로
연결한다.

```powershell
$payloadJson | pnpm timeline:worker -- commit --worker lane-01 --celeb-id $celebId --claim-token $claimToken
```

일시 실패는 payload 없이 retry한다.

```powershell
pnpm timeline:worker -- fail --worker lane-01 --celeb-id $celebId --claim-token $claimToken --error $errorMessage --retry
```

조사 불가를 확정할 때는 `researchStatus='blocked'`, `events=[]`, 한 건 이상의 근거 연결
`blockingIssues`가 있는 payload를 표준입력으로 전달한다.

```powershell
$blockedPayloadJson | pnpm timeline:worker -- fail --worker lane-01 --celeb-id $celebId --claim-token $claimToken --error $errorMessage --skip
```

`applicationStatus='quarantined'`가 있으면 최소 한 blocking issue에
`QUARANTINE_PROFILE` 결정이 있어야 하며, 그 결정이 있으면 application status도 반드시
`quarantined`여야 한다. 일반 blocked는 둘 다 두지 않는다.

terminal 작업을 사람이 다시 열 때만 다음을 쓴다.

이 명령은 `20260810020404_timeline_terminal_requeue_completion_lineage.sql`의 운영 적용과 두
계보 트리거 검증을 마친 뒤에만 실행한다. 일반 pending claim에는 이 추가 migration이 필요하지 않다.

```powershell
pnpm timeline:worker -- requeue --celeb-id $celebId --reason $reason
```

완료된 조사 내용을 고칠 때는 기존 원장을 UPDATE하지 않는다. 현재 run ID와 fingerprint를
낙관적 잠금으로 넘겨 새 원장을 만들고 기존 원장은 superseded 상태로 보존한다.

```powershell
$correctedPayloadJson | pnpm timeline:worker -- correct --celeb-id $celebId --expected-run-id $runId --expected-fingerprint $fingerprint --reason $reason
```

## 조사 payload 계약

worker가 받는 JSON은 단순 사건 목록이 아니라 감사 가능한 조사 전체다.

- `celebId`, `slug`, `nickname`, `nicknameEn`, `timelineMode`
- claim에서 받은 `profileSnapshot`
- 한 개 이상의 HTTP(S) `sources`
- `complete`의 검증된 `events`, 또는 `blocked`의 빈 `events`
- 각 사건·충돌·blocking issue가 `sources[].id`를 참조하는 `evidenceRefs`
- 필요할 때만 `profileConflicts`, `blockingIssues`, `applicationStatus`

근거 URL은 worker와 DB 양쪽에서 검사한다. complete에는 `blockingIssues`와
`applicationStatus`를 넣을 수 없다. blocked에는 사건을 넣을 수 없고, 비어 있지 않은
`blockingIssues`가 필요하다. raw payload와 파생된 근거 그래프는 감사 원장에 함께 저장된다.

## 조사 형식

### `life`

- 확인되는 사건 밀도에 따라 3~30건을 고른다. 숫자를 채우려고 비슷한 사건을 쪼개지 않는다.
- 중간 사건은 생애의 방향, 주요 성취·실패, 활동 반경을 이해하는 데 실제 손실이 생길 때만
  남긴다.
- 제목은 사건에 맞는 자연스러운 한 줄로 쓴다. 서술은 2~3문장으로 사건과 영향을 함께 쓴다.
- 국·영문을 동시에 완성하고, 영문은 사실과 무게를 지키며 자연스럽게 다시 쓴다.
- 좌표가 없어도 중요한 사건은 연표에 남긴다.

### `fiction`

- 대표 원전 순서형 사건 6~12건을 둔다.
- `sequenceLabel`, `sequenceLabelEn`을 사용하고 실제 연도를 넣지 않는다.
- 원전의 가상 무대명은 기록할 수 있지만, 확인된 현실 지리가 아니면 좌표를 붙이지 않는다.
- 출처와 사건 근거 연결은 `life`와 똑같이 필수다.

### 사료와 프로필 충돌

- 고대 인물의 연대가 학설마다 갈리면 통설과 불확실성을 함께 적는다.
- 후대에 덧붙은 일화는 전승임을 분명히 하고 사실로 단정하지 않는다.
- 프로필의 raw 날짜 정밀도를 그대로 비교한다. 예를 들어 `1980`과 `1980-01-01`은 같지 않다.
- 프로필 충돌은 현재 claim 스냅샷 값, 근거 값, 양쪽 설명과 근거 참조를 모두 기록한다.
- 평가가 갈리는 인물은 단죄하거나 미화하지 않고 확인되는 일을 적는다.

## 원자 완료와 검증

complete RPC는 다음 조건을 모두 통과해야 사건을 쓴다.

1. queue lease, worker, claim token이 현재값과 정확히 일치한다.
2. claim의 profile snapshot과 live profile이 변하지 않았다.
3. 대상 인물의 기존 사건이 여전히 0행이다.
4. payload 구조, 사건 수, 출처 URL, 근거 참조, `life`/`fiction` 형식이 유효하다.
5. 생몰 충돌이 없는 정밀한 프로필 경계만 출생·사망 사건과 대조한다.
6. 사건 insert, 감사 원장 insert, queue complete가 한 트랜잭션에서 끝난다.
7. worker가 저장된 사건과 원장을 즉시 다시 읽어 ID·건수·payload를 대조한다.

하나라도 실패하면 부분 완료를 남기지 않는다. 같은 payload 재전송은 실제 사건 내용과 queue의
terminal pointer까지 exact하게 일치할 때만 `already_completed`로 인정한다.

## 화면

| 파일 | 역할 |
|---|---|
| `sw/web/src/components/shared/WorldGlobe/WorldGlobe.tsx` | 공용 지구본. 좌표·경로·회전·확대·국가 hover를 담당하며 도메인을 모른다 |
| `sw/web/src/actions/celebs/getCelebTimelineEvents.ts` | 로케일별 사건 조회. 조회 실패는 throw한다 |
| `.../celeb/[slug]/JourneySection.tsx` | 연표와 지구본 연동. 지구본은 동적 로드하고 연표 본문은 서버에서 그린다 |
| `.../celeb/[slug]/JourneyGlobeModal.tsx` | 전체화면 활동 반경과 연표 카드 |
| `.../celeb/[slug]/celebSectionChapters.ts` | 인물 상세의 행적 구획 번호 04 |
| `sw/web/messages/{ko,en}/celeb.json` | 화면 문구 |

한 구획 안에 「나란히 · 생애 연표 · 활동 반경」 보기를 둔다. `fiction` 사건은 연도 대신
`sequence_label`을 표시한다. 좌표가 하나도 없으면 지도 전환을 띄우지 않고 연표만 보여준다.
지구본은 110m 지도를 먼저 받고 확대할 때 50m 해안선·현대 국경을 지연 로드한다.

## 반복해서 걸린 함정

### 좌표는 기억으로 적지 않는다

동명 지명과 광역 지형의 중심점 때문에 수백 km 오차가 난다. `timeline-geocode.mjs`로 후보와
설명을 읽고 실제 사건 지점을 고른다. 후보를 하나로 좁히지 못하면 좌표를 비운다.

### 서사와 연도 체계를 섞지 않는다

기존 사건의 `source` 값만 보고 중복을 판단하면 `manual` 서사 위에 `research` 연도 사건이
쌓일 수 있다. 현재 모집단은 출처와 무관한 전체 사건 `NOT EXISTS`이고, complete 직전에도
0행을 재검사한다.

### 외부 조사 텍스트를 그대로 넣지 않는다

이중 아포스트로피, 영문 구두점 소실, 광역 장소, 잘못된 `kind`, 지어낸 연도가 반복해서
나왔다. worker의 구조 검사는 필요조건일 뿐 자연어 품질과 사실 검증을 대신하지 않는다.

### 쓰기 성공 응답만 믿지 않는다

과거 도구가 0행 갱신도 성공으로 보고한 사고가 있었다. 현재 worker는 complete/blocked 뒤
감사 원장과 사건을 exact readback하며, `verify --celeb-id $celebId`로 특정 인물의 원장과 사건
연결을 다시 검사할 수 있다.

### 지구본 재렌더링 함정

- 회전 지시는 `doneFocusRef`로 한 번만 수행한다. 그렇지 않으면 사용자가 돌린 각도가 튄다.
- 드래그 감도는 구 반지름과 확대율에 맞춘다. 고정 각도/px는 확대할수록 과하게 돈다.
- 보기 전환 때 지구본 인스턴스를 옮겨 심지 않고 같은 자리에 둔 채 배치 클래스만 바꾼다.
- `/explore/timeline`은 생몰년을 쓰는 국가별 연대기로, 인물 행적 화면과 다른 기능이다.

## 운영 재개 체크

1. 공통 기반 세 migration이 배포 이력에 있고 `pnpm timeline:worker -- status`와 `verify`가 모두
   통과하는지 확인한다.
2. `status`로 queue와 감사 원장 수치를 읽는다.
3. 사용자가 새 회차 enqueue를 승인했을 때만 `enqueue`를 실행한다.
4. 독립 레인은 claim한 인물 하나를 끝내자마자 다음 claim을 받아 릴레이한다.
5. 완료·blocked는 같은 회차에 DB readback까지 끝내고, 실패는 retry 또는 근거 있는 skip으로
   명시적으로 닫는다.
6. terminal 작업을 requeue할 때만 계보 migration의 적용과 트리거 두 개를 추가 확인한다.

## 연계

- 진행 상태와 다음 착수점: `docs/todo/celeb/celeb-timeline-backfill-handoff-2026-08-08.md`
- DB 스키마: `docs/project/db-celeb.md`
- 인물 화면 지도: `docs/project/service/README.md`
- 글쓰기 규칙: `docs/project/writing-rules.md`
- 운영 worker: `sw/web-bo/scripts/timeline-db-worker.mjs`
- 운영 migration: `sw/web/supabase/migrations/20260809212156_timeline_direct_db_pipeline.sql`
- 교정 migration: `sw/web/supabase/migrations/20260809234727_timeline_direct_db_corrections.sql`
- 적용된 보안 gate: `sw/web/supabase/migrations/20260810004016_timeline_direct_db_security_contract.sql`
- terminal 재큐 전 적용할 계보 migration: `sw/web/supabase/migrations/20260810020404_timeline_terminal_requeue_completion_lineage.sql`
