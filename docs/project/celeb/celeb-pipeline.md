# 0. 파이프라인

## 티어

`profiles.celeb_tier`: `'full'` (기본값) / `'light'` / `'relation'` / `'fiction'`

| 티어 | 콘텐츠 수집 | 감상 여정 | 프로필 페이지 | 홈·검색·탐색 노출 | 실존 |
|------|------------|----------|-------------|------------------|------|
| **full** | O | 필수 (DB review 기반) | 콘텐츠 탭 표시 | O | O |
| **light** | X | 필수 (웹 리서치 기반) | 콘텐츠 탭 숨김 | O | O |
| **relation** | X | 생략 | 최소 (기본 정보만) | X — 연결로만 도달 | O |
| **fiction** | X | 생략 | 최소 (기본 정보만) | X — 연결로만 도달 | X (신화·전설·허구) |

**relation** = 본인의 감상 기록이 목적이 아니라 **다른 셀럽·영상·에피소드와의 관계 때문에 등록되는 실존 인물**(팩션 출연자, 에피소드 조연 등). basic 최소 항목(국·영문 이름, 직군, 생몰, 국적, 한 줄 소개)과 아바타만 채우고 나머지 트랙(콘텐츠·감상 여정·영향력·페르소나·speech·i18n)은 전부 생략한다.

**fiction** = **실존 인물이 아닌 신화·전설·허구 속 존재**(일리아스의 신·영웅 등). 등록 수준은 relation과 동일(basic 최소)이되, "실존 아님"을 티어로 명확히 구분해 실존 인물(relation)과 섞이지 않게 한다. 생몰·국적은 특정 불가하면 비운다. 감상 여정·영향력·페르소나 등 실존 인물 분석 트랙은 부적절하므로 생략한다. 콘텐츠 연결(팩션 영상 등)로만 도달한다.

relation·fiction 공통: 홈 캐러셀·검색·탐색·타임라인에서 제외하며, 팩션 영상·다른 셀럽 페이지의 연결을 통해서만 도달한다.

승격: (relation 한정) 콘텐츠 확보 시 `relation → light/full` 일방통행. fiction은 실존이 아니므로 승격 대상이 아니다. 강등하지 않는다.

light → full 승격: 콘텐츠 수집 후 `UPDATE profiles SET celeb_tier = 'full'`.

---

## 셀럽 계정 생성 규칙

basic 단계에서 `auth.users`와 `profiles` 행을 **같은 id**로 생성한다(`profiles.id`는 `auth.users.id`를 참조).

> **id는 반드시 `gen_random_uuid()`로 DB가 생성한다. UUID 문자열을 직접 타이핑(하드코딩)하지 않는다.**

- ❌ `id := 'c1e2f3a4-b5d6-7890-abcd-ef1234567890'`, `'a1b2c3d4-...-099'` 같은 예시형 값 직접 작성 — 충돌·중복 위험, 일반 셀럽과 식별자 패턴 불일치
- ✅ `gen_random_uuid()`를 **한 번** 호출해 변수에 담고 `auth.users`·`profiles` 양쪽에 동일 적용
- `email`은 `'celeb_' || <id> || '@feelandnote.local'` 형식으로 그 id에 맞춘다

권장 패턴:

```sql
DO $$
DECLARE cid uuid := gen_random_uuid();
BEGIN
  INSERT INTO auth.users (id, email, /* 기타 필수 컬럼 */)
  VALUES (cid, 'celeb_' || cid::text || '@feelandnote.local', /* ... */);

  INSERT INTO public.profiles (id, nickname, nickname_en, /* ... */)
  VALUES (cid, /* ... */);
END $$;
```

식별자 교정이 필요해지면 `auth.users.id`와 이를 참조하는 모든 자식(`profiles` + `user_scores`·`user_social` 등 셀럽 생성 시 자동 생성되는 부수 행)을 한 트랜잭션에서 함께 바꿔야 한다. 처음부터 `gen_random_uuid()`를 쓰면 이 사후 교정이 불필요하다.

---

## 작업 순서

basic 완료 후 4개 트랙이 **병렬** 실행된다.

```
basic ─┬─ content ── cultural journey   (full 전용)
       ├─ influence
       ├─ persona
       └─ speech (tone → quotes → dialogue)
                                    (dialogue는 전원 21개 전체)
모든 트랙 완료 → i18n
```

### full 파이프라인

| 트랙 | 단계 | 룰북 | 의존 |
|------|------|------|------|
| — | 기본 정보 | `celeb-1-basic-profile.md` | 없음 |
| A | 콘텐츠 수집 | `celeb-2-content-collector.md` | basic |
| A | 감상 여정 | `celeb-3-cultural-journey.md` | content |
| B | 영향력 평가 | `celeb-4-influence.md` | basic |
| C | 페르소나 | `celeb-5-persona.md` | basic |
| D | Speech 트랙 | `celeb-speech.md` | basic |
| — | 영문 번역 | `celeb-i18n.md` | 모든 트랙 완료 |

### light 파이프라인

full과 동일하되 콘텐츠 수집(트랙 A) 생략. 감상 여정은 웹 리서치 기반.

### 티어 미지정 시

1. basic 생성
2. content-collector 실행
3. 1건 이상 수집 → `celeb_tier = 'full'` / 0건 → light 유지
4. 병렬 트랙 진행

---

## 업데이트 가드

모든 셀럽 데이터 수정 에이전트가 따르는 규칙.

### 원칙: 백지 재작성

기존 데이터를 참조하지 않는다. 매번 새로 리서치하고 새로 작성한다.

- ❌ 기존 텍스트를 읽고 "수정" / "개선" 하지 않는다
- ✅ 기존 텍스트를 무시하고 처음부터 새로 쓴다

### UPDATE 전 변경 검증

1. 새 텍스트 작성 완료
2. DB에서 기존 텍스트 SELECT
3. **완전히 동일하면 UPDATE하지 않고 SKIPPED**
4. **한 글자라도 다르면 UPDATE 실행**

배치(CASE문)에서도 기존과 동일한 건은 CASE에서 제외한다.

### 완료 보고

```
## 배치 결과 (OFFSET X ~ Y)
- UPDATED: N건
- SKIPPED: N건 (기존과 동일)
- FAILED: N건
```

SKIPPED가 배치의 30% 이상이면 경고. SKIPPED 건은 재시도하지 않는다.

---

## 작업 큐 (celeb_task_queue)

복수 에이전트 동시 작업 시 DB 큐로 충돌 방지. **1명 선점 → 작성 → 저장 → 완료** 순서.

`profiles.claimed_by`는 셀럽 계정 인수 상태다. 작업 락 용도로 재사용하지 않는다.

### 상태값

| status | 의미 |
|--------|------|
| `pending` | 미선점 |
| `in_progress` | 작업 중 |
| `completed` | 완료 |
| `failed` | 실패 |
| `skipped` | 의도적 제외 |

### 에이전트 순서

```sql
-- 1. 선점 (60분 lease)
SELECT * FROM public.claim_next_celeb_cultural_journey_rewrite('agent-01', 60);

-- 2. lease 연장 (장시간 작업 시)
SELECT public.renew_celeb_cultural_journey_rewrite_lease('celeb-id', 'agent-01', 60);

-- 3. 완료 — 직접 UPDATE profiles 금지. 이 함수가 profiles + 큐 동시 처리
SELECT public.complete_celeb_cultural_journey_rewrite('celeb-id', 'agent-01', '한국어', 'English');

-- 4. 실패 (true=pending 복귀, false=failed 유지)
SELECT public.fail_celeb_cultural_journey_rewrite('celeb-id', 'agent-01', 'reason', true);
```

### 운영 쿼리

```sql
-- 진행 현황
SELECT status, count(*) FROM celeb_task_queue
WHERE task_type = 'cultural_journey_rewrite_v2' GROUP BY status;

-- 현재 작업자
SELECT q.claimed_by, q.lease_expires_at, p.slug
FROM celeb_task_queue q JOIN profiles p ON p.id = q.celeb_id
WHERE task_type = 'cultural_journey_rewrite_v2' AND q.status = 'in_progress';

-- 초기 동기화
SELECT public.enqueue_missing_celeb_cultural_journey_rewrite_jobs();
```

Worker 이름은 짧고 고유하게: `codex-a`, `claude-01` 등. 큐 함수는 **service_role 전용**.
