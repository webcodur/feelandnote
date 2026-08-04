# 0. 파이프라인

> **최종 실측 체크: 26.08.04** — 실존 인물 최소 등급을 `light`로 단일화한 3티어 체계 반영

## 티어

`profiles.celeb_tier`: `'full'` (기본값) / `'light'` / `'fiction'`

> ⛔ **감상 여정(`consumption_philosophy`)은 폐기 예정 항목이다. 어느 티어에서도 신규 작성하지 않는다.** 기존 데이터는 보존하되 새 인물에게 채우지 말고, 조사·발주 대상에서 제외한다. 상세 근거는 아래 「콘텐츠 개수 상태」 절 마지막 항목. 이 방침이 이 문서의 다른 서술보다 우선한다.

| 티어 | 콘텐츠 수집 | 프로필 페이지 | 홈·검색·탐색 노출 | 실존 |
|------|------------|-------------|------------------|------|
| **full** | O | 콘텐츠 탭 표시 | O | O |
| **light** | 후보 기반 | 콘텐츠가 생기면 실측 개수 표시 | O | O |
| **fiction** | X (`user_contents` 미사용) | 기본 정보 + 원전·등장 작품 | 검색 O / 홈·탐색 X | X (신화·전설·허구) |

**light** = 콘텐츠 유무와 무관하게 서비스에 등록할 가치가 있는 실존 인물의 최소 등급이다. 팩션 출연자나 에피소드 조연처럼 다른 인물과의 연결 때문에 등록한 정상적인 실존 인물도 `light`로 둔다. 콘텐츠가 0건이면 `content_research_status='open'`으로 조사 가능 상태를 유지하고, 영향력·페르소나·speech·i18n 등 실존 인물 트랙은 동일하게 수행한다.

**fiction** = **실존 인물이 아닌 신화·전설·허구 속 존재**(일리아스의 신·영웅 등). 생몰·국적은 특정 불가하면 비운다. 감상 여정·영향력·페르소나 등 실존 인물 분석 트랙은 부적절하므로 생략한다. 대신 기존 `contents` 한 건을 대표 원전으로 지정해 인물과 연결하며, 상세 화면 02번 구획에 「원전·등장 작품」을 표시한다. 이 연결은 인물이 콘텐츠를 감상했다는 뜻이 아니므로 `user_contents`에 넣지 않는다.

fiction은 두 단계로 운영한다.

- **데이터 연결 단계**: basic 최소 정보만으로 active 프로필을 만들 수 있다. 얼굴과
  `virtual_monologue`는 비워도 되며 `is_verified=false`로 둔다. 이 단계도 상단 검색,
  팩션, 대표 원전 관계는 정상 동작한다.
- **서사 발행 단계**: 독백을 노출·활용하려면 `profiles.virtual_monologue`를 원전 근거와
  검토를 거쳐 작성한다. 규칙은 `virtual-monologue.md`, fiction 실행은
  `fiction-profile-monologue` 스킬을 따른다. 팩션 대사는 이 독백에서 핵심 갈등을 압축한다.

얼굴이나 독백이 없다는 이유로 이미 연결된 인물을 삭제·비활성화하지 않는다.

fiction은 홈 캐러셀·탐색·타임라인에서는 제외하지만 **상단 인물 검색에는 포함**한다. 팩션 영상·다른 인물·대표 원전 콘텐츠에서도 도달할 수 있다.

### fiction 대표 원전 연결

- 백오피스 `/fiction-sources`에서 기존 콘텐츠를 검색해 대표 원전으로 지정하고 fiction 인물을 선택한다.
- `fiction_source_contents.content_id`가 작품을 대표할 `contents` 행이며, `fiction_source_characters`가 등장인물을 연결한다.
- 인물 상세: 「원전·등장 작품」에서 대표 콘텐츠로 이동한다.
- 콘텐츠 상세: 「이 작품의 인물」에서 연결된 인물로 이동한다.
- 한 작품의 여러 판본을 인물마다 중복 연결하지 않는다. 서비스 링크는 지정된 대표 콘텐츠 한 건으로 모은다.
- 작품 세계 전체와 특정 원전의 실제 등장 명단을 혼동하지 않는다. 예를 들어 Homer-Iliad 팩션에 포함된 펜테실레이아·멤논·시논은 《일리아스》 본문 등장인물이 아니므로 《일리아스》 연결에서 제외한다.
- 《일리아스》 초기 연결 명단은 원문 대조로 확정했다. 카산드라([24권](https://www.perseus.tufts.edu/hopper/text?doc=Perseus%3Atext%3A1999.01.0134%3Abook%3D24)), 아이네이아스([5권](https://www.perseus.tufts.edu/hopper/text?doc=Perseus%3Atext%3A1999.01.0134%3Abook%3D5)), 소 아이아스([13권 701행 이후](https://www.perseus.tufts.edu/hopper/text?doc=Perseus%3Atext%3A1999.01.0217%3Abook%3D13%3Acard%3D701))는 본문 등장 근거가 있다. 펜테실레이아·멤논은 《일리아스》 뒤를 잇는 《아이티오피스》 줄거리([Epic Cycle 개요](https://www.theoi.com/Text/EpicCycle.html)), 시논은 트로이 목마 사건을 다루는 《아이네이스》 2권([원문](https://www.perseus.tufts.edu/hopper/text?doc=Perseus%3Atext%3A1999.02.0054%3Abook%3D2)) 근거이므로 제외했다.

#### 현행 연결 기준선 (2026-07-29)

| 대표 원전 | 대표 판본·메타 | 연결 |
|-----------|----------------|-----:|
| 《일리아스》 | ISBN `9788991290167` | 24명 |
| 《오디세이아》 | ISBN `9788961673747` | 26명 |
| 《신통기》 | ISBN `9788937480515` | 13명 |
| 《아이네이스》 | ISBN `9788952237309` | 18명 |
| 《오레스테이아》 | 기존 contents | 12명 |
| 《아르고 호 이야기》 | ISBN `9788992132114` | 18명 |
| 《원전으로 읽는 그리스 신화》 | ISBN `9788991290006` | 18명 |
| 《산문 에다》 | 기존 contents | 29명 |
| 《이집트 사자의 서》 | ISBN `9788982812118` | 17명 |
| 《서유기》 | 기존 contents | 15명 |
| 《봉신연의》 | ISBN `9788957321058` | 15명 |
| 《라마야나》 | 기존 contents | 14명 |
| 《마하바라타》 | 기존 contents | 18명 |
| 《고사기》 | ISBN `9791130455402` | 11명 |
| 《삼국유사》 | 기존 contents | 5명 |
| 《동명왕편》 | 기존 contents | 4명 |
| 《삼국사기》 | 기존 contents | 2명 |
| 《길가메시 서사시》 | 기존 contents | 7명 |
| 《에누마 엘리시》 | Open Library `OL51041680M` | 4명 |
| 《아서왕의 죽음》 | Open Library `OL6633760M` | 15명 |

- 《오디세이아》 5권 한 권 안에서도 제우스·아테나·헤르메스·포세이돈이 귀향에 직접 개입한다([원문](https://www.perseus.tufts.edu/hopper/text?doc=Perseus%3Aabo%3Atlg%2C0012%2C002%3A5)).
- 《신통기》는 제우스·헤라·아테나·아폴론·아레스의 계보([901행 이후](https://www.perseus.tufts.edu/hopper/text?doc=Perseus%3Atext%3A1999.01.0130%3Acard%3D901)), 아프로디테의 탄생([173행 이후](https://www.perseus.tufts.edu/hopper/text?doc=Perseus%3Atext%3A1999.01.0130%3Acard%3D173)), 헤르메스의 탄생([938행 이후](https://www.perseus.tufts.edu/hopper/text?doc=Perseus%3Atext%3A1999.01.0130%3Acard%3D938))을 직접 다룬다. 포세이돈도 Earth-Shaker로 계보에 포함된다.
- 18개 신화·서사 팩션의 285배치를 정규화한 fiction 257명 전원이 프로필·태그에
  연결됐다. 20개 대표 원전의 관계는 285행이며, 중복 인물을 합친 255명이 하나
  이상의 원전에 연결된다. 아바타 없는 데이터형 프로필은 209명이다.
- 펜테실레이아·멤논은 《아이티오피스》의 인물임이 남은 줄거리에서 확인되지만
  ([Proclus 요약](https://www.theoi.com/Text/EpicCycle.html#Aethiopis)), 해당 작품은
  소실됐다. 후대 작품을 원전으로 둔갑시키지 않고 미연결로 보존한다.

light → full 승격: 콘텐츠 수집 후 `UPDATE profiles SET celeb_tier = 'full'`. fiction은 실존이 아니므로 승격 대상이 아니다.

### 콘텐츠 개수 상태

셀럽의 콘텐츠 개수는 실제 `user_contents` 개수와
`profiles.content_research_status`를 합쳐 해석한다.

| 표시값 | 의미 | 조건 |
|---:|---|---|
| `1 이상` | 실제 등록 콘텐츠 수 | `user_contents` 실측값을 그대로 사용 |
| `0` | 활성·미확정 | 실제 콘텐츠가 0건인 활성 프로필이 `open` 또는 `researching` |
| `-1` | 없음 | 실제 콘텐츠가 0건이고 비활성이거나 `content_research_status='confirmed_empty'` |

- 신규 인물의 기본 상태는 `open`, 표시값은 `0`이다.
- 비활성 프로필은 실제 콘텐츠가 0건이면 별도 조사 버킷 없이 `-1`이다.
- 콘텐츠가 하나라도 생기는 순간 조사 상태보다 실제 양수를 우선한다.
- `confirmed_empty`인 인물에게 콘텐츠가 추가되면 DB 트리거가 상태를 `open`으로 되돌린다.
- 활성 프로필은 단순 선별, 검색 1회 실패, 자료가 적어 보인다는 판단만으로 `-1`을 줄 수 없다.
- 신규 `confirmed_empty`는 web-bo 조사 장부에서만 확정한다. 상태 선택기나 SQL로
  직접 바꾸는 경로는 DB 가드가 거부한다.
- 조사 장부는 BOOK·VIDEO·GAME·MUSIC 네 유형, 인물명 변형·동명이인 차단,
  유형별 출처, 후보의 채택·기각 근거를 영속 보존한다. 네 유형이 모두 완료되고
  실제 콘텐츠가 0건일 때만 완료 함수가 `-1`을 기록한다.
- 감상여정 유무와 본문은 콘텐츠 개수나 조사 상태의 조건이 아니다. 폐기 예정인
  감상여정에 신규 운영 로직을 의존시키지 않는다.

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
basic ─┬─ content
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
| B | 영향력 평가 | `celeb-4-influence.md` | basic |
| C | 페르소나 | `celeb-5-persona.md` | basic |
| D | Speech 트랙 | `celeb-speech.md` | basic |
| — | 영문 번역 | `celeb-i18n.md` | 모든 트랙 완료 |

> 감상 여정(`celeb-3-cultural-journey.md`)은 **폐기 예정이라 파이프라인에서 제외했다.** 룰북 파일은 기존 데이터 참조용으로 남겨 두었을 뿐이며, 신규 인물 작업에서 호출하지 않는다.

### light 파이프라인

기본 등록은 `content_research_status='open'`, 표시값 `0`으로 시작한다.

1. 활성·미조사 → `open`, 표시값 `0`
2. 조사 진행 → `researching`, 표시값 `0`
3. 조사 장부에 BOOK·VIDEO·GAME·MUSIC 유형별 출처와 후보 판정을 기록
4. 콘텐츠 1건 이상 확인 → `contents`·`user_contents` 연결, 실제 개수 표시, 감사 후 full 승격
5. 네 유형 완료 후 실제 콘텐츠 0건 → 장부 완료 함수가 `confirmed_empty`, 표시값 `-1`

운영 목록은 web-bo `/celebs/content-research`, 인물별 장부는
`/celebs/content-research/[celebId]`다. 작업 경로는 실제 콘텐츠 수, 활성 여부,
조사 상태와 우선순위 신호만으로 파생하며 감상여정을 읽지 않는다.

비활성 프로필은 실제 콘텐츠가 0건이면 표시값 `-1`이다. 감상여정은 콘텐츠
조사 판정이나 운영 상태의 SSoT로 사용하지 않는다.

### 티어 미지정 시

1. basic 생성
2. content-collector 실행
3. 1건 이상 수집 → `celeb_tier = 'full'` / 0건 → light 유지
4. 0건이어도 `confirmed_empty`로 자동 변경하지 않고 `open` 유지
5. 병렬 트랙 진행

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

현재 DB에 실재하는 큐 함수는 `philosophy_rewrite` 5종뿐이다. 아래는 그 실제 이름이다.

```sql
-- 1. 선점 (60분 lease)
SELECT * FROM public.claim_next_celeb_philosophy_rewrite('agent-01', 60);

-- 2. lease 연장 (장시간 작업 시)
SELECT public.renew_celeb_philosophy_rewrite_lease('celeb-id', 'agent-01', 60);

-- 3. 완료 — 직접 UPDATE profiles 금지. 이 함수가 profiles + 큐 동시 처리
SELECT public.complete_celeb_philosophy_rewrite('celeb-id', 'agent-01', '한국어', 'English');

-- 4. 실패 (true=pending 복귀, false=failed 유지)
SELECT public.fail_celeb_philosophy_rewrite('celeb-id', 'agent-01', 'reason', true);
```

> `*_celeb_cultural_journey_rewrite` 계열 함수와 `cultural_journey_rewrite_v2` task_type은 **DB에 존재하지 않는다.** 호출하면 에러가 난다. 다른 트랙을 큐로 돌리려면 그 트랙 전용 함수·task_type을 먼저 만들어야 한다.

### 운영 쿼리

`celeb_task_queue`에 실재하는 task_type은 `philosophy_rewrite_v2` 하나뿐이다(2026-07-16 실측: completed 913건, 다른 상태 0건).

```sql
-- 진행 현황
SELECT status, count(*) FROM celeb_task_queue
WHERE task_type = 'philosophy_rewrite_v2' GROUP BY status;

-- 현재 작업자
SELECT q.claimed_by, q.lease_expires_at, p.slug
FROM celeb_task_queue q JOIN profiles p ON p.id = q.celeb_id
WHERE task_type = 'philosophy_rewrite_v2' AND q.status = 'in_progress';

-- 초기 동기화
SELECT public.enqueue_missing_celeb_philosophy_rewrite_jobs();
```

Worker 이름은 짧고 고유하게: `codex-a`, `claude-01` 등. 큐 함수는 **service_role 전용**.
