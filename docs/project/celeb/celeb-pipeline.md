# 0. 파이프라인

## 티어

`profiles.celeb_tier`: `'full'` (기본값) / `'light'`

| 티어 | 콘텐츠 수집 | 감상 여정 | 프로필 페이지 |
|------|------------|----------|-------------|
| **full** | O | 필수 (DB review 기반) | 콘텐츠 탭 표시 |
| **light** | X | 필수 (웹 리서치 기반) | 콘텐츠 탭 숨김 |

light → full 승격: 콘텐츠 수집 후 `UPDATE profiles SET celeb_tier = 'full'`.

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
