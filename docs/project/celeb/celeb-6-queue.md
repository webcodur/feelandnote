# 셀럽 작업 큐 룰북

셀럽 데이터를 여러 에이전트가 동시에 수정할 때는 수동 분배를 하지 않는다.
반드시 DB 큐를 통해 **1명 선점 → 작성 → 저장 → 완료** 순서로 처리한다.

---

## 현재 큐

- **테이블**: `public.celeb_task_queue`
- **현재 작업 타입**: `philosophy_rewrite_v2`
- **목적**: 감상 편력 재작성 작업의 충돌 방지

`profiles.claimed_by`는 셀럽 계정 인수 상태를 뜻한다. 작업 락 용도로 재사용하지 않는다.

---

## 상태값

| status | 의미 |
|---|---|
| `pending` | 아직 아무도 잡지 않음 |
| `in_progress` | 누군가 선점해서 작업 중 |
| `completed` | 저장 완료 |
| `failed` | 실패로 남김. 재큐잉 전까지 자동 재선점 안 됨 |
| `skipped` | 의도적으로 제외 |

---

## 기본 원칙

1. 먼저 `claim` 한다.
2. `claim` 받은 `celeb_id`만 수정한다.
3. 작업 중 길어지면 `renew`로 lease를 연장한다.
4. 저장은 직접 `profiles`를 업데이트하지 말고 `complete` 함수로 끝낸다.
5. 실패 시 `fail`로 반납한다.

---

## 초기 동기화

활성 셀럽을 큐에 다시 반영할 때:

```sql
select public.enqueue_missing_celeb_philosophy_rewrite_jobs();
```

- `pending` / `failed` 항목의 우선순위와 payload를 갱신한다.
- `completed` 항목은 건드리지 않는다.

---

## 에이전트 작업 순서

### 1. 다음 작업 선점

```sql
select *
from public.claim_next_celeb_philosophy_rewrite('agent-01', 60);
```

- 두 번째 인자 `60`은 lease 분 단위다.
- 결과가 0행이면 현재 처리할 항목이 없는 것이다.
- 반환된 `celeb_id`, `slug`, `nickname`, 기존 KO/EN 철학만 사용한다.

### 2. 오래 걸리면 lease 연장

```sql
select public.renew_celeb_philosophy_rewrite_lease(
  'celeb-id',
  'agent-01',
  60
);
```

- 장문 조사나 번역으로 1시간 이상 걸릴 수 있으면 중간에 호출한다.

### 3. 저장 완료

```sql
select public.complete_celeb_philosophy_rewrite(
  'celeb-id',
  'agent-01',
  '한국어 감상 편력',
  'English philosophy'
);
```

- 이 함수가 `profiles.cultural_journey`, `cultural_journey_en`를 함께 저장한다.
- 동시에 큐 상태를 `completed`로 바꾼다.
- **직접 `update profiles ...` 하지 않는다.** 그러면 소유권 검증이 빠진다.

### 4. 실패 / 반납

```sql
select public.fail_celeb_philosophy_rewrite(
  'celeb-id',
  'agent-01',
  'source check failed',
  true
);
```

- 마지막 인자가 `true`면 다시 `pending`으로 돌려놓는다.
- `false`면 `failed`로 남긴다.

---

## 운영 쿼리

진행 현황:

```sql
select status, count(*) as total
from public.celeb_task_queue
where task_type = 'philosophy_rewrite_v2'
group by status
order by status;
```

현재 누가 무엇을 잡고 있는지:

```sql
select q.status, q.claimed_by, q.claimed_at, q.lease_expires_at, p.slug, p.nickname
from public.celeb_task_queue q
join public.profiles p on p.id = q.celeb_id
where q.task_type = 'philosophy_rewrite_v2'
  and q.status = 'in_progress'
order by q.claimed_at asc;
```

오래된 락 확인:

```sql
select q.claimed_by, q.lease_expires_at, p.slug, p.nickname
from public.celeb_task_queue q
join public.profiles p on p.id = q.celeb_id
where q.task_type = 'philosophy_rewrite_v2'
  and q.status = 'in_progress'
  and q.lease_expires_at < now()
order by q.lease_expires_at asc;
```

---

## worker 이름 규칙

- 짧고 고유해야 한다. 예: `codex-a`, `codex-b`, `claude-01`
- 한 에이전트는 세션 내내 같은 이름을 쓴다.
- 다른 에이전트와 이름을 공유하지 않는다.

---

## 보안

- 이 큐와 관련 함수는 **service_role 전용**이다.
- 앱 클라이언트나 일반 사용자 세션에서 호출하지 않는다.
