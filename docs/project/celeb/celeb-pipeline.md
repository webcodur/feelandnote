# 0. 파이프라인

> **최종 실측 체크: 26.08.10** — `celebs`·`celeb_contents`·`celeb_metrics` 물리 도메인과
> 계정 없는 셀럽 직접 등록, 콘텐츠 조사·티어 트리거를 운영 DB와 백오피스 코드에 대조했다.

## 티어

`celebs.celeb_tier`: `'full'` (기본값) / `'light'` / `'fiction'`

> 허용값과 노출 게이트(`LISTING_DEFAULT_TIERS`·`INDEXABLE_TIERS`·`SEARCHABLE_CELEB_TIERS`)의
> 원천은 코드다 — `packages/shared/src/constants/celeb-tiers.ts`. 목록·검색·사이트맵에
> 어느 등급이 뜨는지는 그 파일을 보고, 여기 옮겨 적지 않는다.

> ⛔ **감상 여정(`consumption_philosophy`)은 폐기 예정 항목이다. 어느 티어에서도 신규 작성하지 않는다.** 기존 데이터는 보존하되 새 인물에게 채우지 말고, 조사·발주 대상에서 제외한다. 상세 근거는 아래 「콘텐츠 개수 상태」 절 마지막 항목. 이 방침이 이 문서의 다른 서술보다 우선한다.

| 티어 | 콘텐츠 수집 | 프로필 페이지 | 홈·검색·탐색 노출 | 실존 |
|------|------------|-------------|------------------|------|
| **full** | O | 콘텐츠 탭 표시 | O | O |
| **light** | 후보 기반 | 콘텐츠가 생기면 실측 개수 표시 | O | O |
| **fiction** | X (`celeb_contents` 미사용) | 기본 정보 + 원전·등장 작품 | 검색 O / 홈·탐색 X | X (신화·전설·허구) |

**light** = 콘텐츠 유무와 무관하게 서비스에 등록할 가치가 있는 실존 인물의 최소 등급이다. 팩션 출연자나 에피소드 조연처럼 다른 인물과의 연결 때문에 등록한 정상적인 실존 인물도 `light`로 둔다. 콘텐츠가 0건이고 `content_research_confirmed_empty_at`이 비어 있으면 조사 대상으로 남기며, 영향력·스펙트럼·speech·i18n 등 실존 인물 트랙은 동일하게 수행한다.

**fiction** = **실존 인물이 아닌 신화·전설·허구 속 존재**(일리아스의 신·영웅 등). 생몰은 특정 불가하면 비운다. 직군·국적·성별은 원전 근거로 채운다(집단·비인격 존재만 null 유지 — 규칙은 `celeb-1-basic-profile.md`). 감상 여정·영향력·스펙트럼 등 실존 인물 분석 트랙은 부적절하므로 생략한다. 대신 기존 `contents` 한 건을 대표 원전으로 지정해 인물과 연결하며, 상세 화면 02번 구획에 「원전·등장 작품」을 표시한다. 이 연결은 인물이 콘텐츠를 감상했다는 뜻이 아니므로 `celeb_contents`에 넣지 않는다.

active 상세 페이지는 모든 티어가 색인 대상이다. 다만 제목과 설명은 티어마다 다르다.
`full`은 실제 감상 기록이 있을 때만 그 종류와 건수를 쓰고, `light`는 인물 안내와 분석,
`fiction`은 대표 원전·서사·관계를 안내한다. fiction에는 현실 인물용 동시대 계산과 영향력·
스펙트럼을 적용하지 않는다. 색인과 목록 노출의 실제 게이트는 위 코드 SSoT를 따른다.

fiction은 basic 최소 정보와 아바타를 갖춘 뒤 active 프로필을 만들 수 있다.
`virtual_monologue`는 비워 두며 `is_verified=false`여도 상단 검색, 팩션, 대표 원전 관계는
정상 동작한다. 가상 독백은 서비스 노출과 신규 작성이 중단됐으므로 활성화 조건이나 후속
파이프라인에 넣지 않는다. 기존 값의 보존 규칙은 `retire/virtual-monologue.md`를 따른다.

2026-08-05부터 **모든 티어의 신규 active 전환에는 `avatar_url`이 필수**다. DB 트리거와
백오피스 상태 변경 경로가 이를 함께 강제한다. 기존 active 중 아바타가 없는 레거시 행은
소급 비활성화하지 않지만, 아바타를 채우기 전까지 재활성화할 수 없다. 독백 부재는
활성화 조건이 아니다.

fiction은 홈 캐러셀·탐색·타임라인에서는 제외하지만 **상단 인물 검색에는 포함**한다. 팩션 영상·다른 인물·대표 원전 콘텐츠에서도 도달할 수 있다.

### 신규 실존 인물 선정 게이트

신규 실존 인물은 단순 인지도나 현재 화제성보다 **그 사람을 독립적으로 다룰 사료와
서술이 충분한가**로 채택한다. 여기서 책은 그 사람이 쓴 책이 아니라 그 사람을 언급·분석한
전기·평전·연구서·분야사 등을 뜻한다.

- 정식 단독 전기 한 권의 존재 여부로 좁히지 않는다. 아직 전기가 없는 생존 현역이라도
  영화사·음악사·산업사 등에서 충분히 다뤄지는 세계적 인물은 채택할 수 있다.
- 인지도만 높고 독립 서술 근거가 빈약한 웹 인플루언서, 무명 스타트업 임원, 무명 조연처럼
  다른 인물과 같은 깊이로 다룰 수 없는 후보는 신규 발주하지 않는다.
- 이 게이트는 **신규 등록 후보**에만 적용한다. 기존 인물을 소급 삭제하는 근거로 쓰지 않는다.

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

light → full 승격: 콘텐츠 수집 후 `UPDATE celebs SET celeb_tier = 'full'`. fiction은 실존이 아니므로 승격 대상이 아니다. DB 트리거 `trg_celeb_full_requires_content`는 INSERT 또는 기존 티어에서 full로 전환되는 순간 `celeb_contents` 1건 이상을 요구한다. 먼저 콘텐츠를 연결한 뒤 승격한다.

### 콘텐츠 개수 상태

셀럽의 콘텐츠 개수는 실제 `celeb_contents` 개수와
`celebs.content_research_confirmed_empty_at`만 합쳐 해석한다.

> **규약 SSoT는 코드다 — `packages/shared/src/constants/celeb-content-research.ts`.**
> 표시값 계산(`resolveCelebContentCount`), 모집단 조건
> (`CELEB_CONTENT_RESEARCH_TARGET_TIERS`·`..._PROFILE_STATUSES`,
> `isCelebContentResearchTarget`), 표시값 상수(`CELEB_CONTENT_COUNT`)가 전부 거기 있고
> 회귀 시험이 붙어 있다. 화면·서버 액션·스크립트는 그 값을 **import해서** 쓴다.
> 아래는 사람이 읽을 배경 설명이며, 조건을 여기서 다시 정의하지 않는다.

### 왜 이렇게 나뉘나

실제 개수가 양수면 무조건 실제 개수가 이긴다. 실제 개수가 0일 때만
**0건 확정 시각의 유무**를 본다. 등급도 노출 여부도 개입하지 않는다.

| 표시값 | 뜻 |
|---:|---|
| `1 이상` | 콘텐츠가 있다 |
| `0` | 아직 조사하지 않았다 — **조사 대상** |
| `-1` | 사람이 네 유형을 다 뒤졌고 0건이었다 — 다시 조사하지 않는다 |

신규 인물의 0건 확정 시각은 비어 있으므로 **비공개로 만들어도 표시값은 `0`이다.**

**조사를 마친 인물은 결과가 둘로 갈릴 뿐 둘 다 재조사 대상이 아니다.** 콘텐츠를
찾았으면 `full`(표시값 양수), 없었으면 확정 시각을 기록한다(표시값 `-1`). 그래서
조사 목록 모집단에서 `full`이 빠진다 — 이미 조사를 거쳤기 때문이다. `fiction`은
허구 인물이라 콘텐츠 개념 자체가 없다.

**운영은 단순하다 — 콘텐츠 조사 화면에서 `0`으로 보이면 그게 조사 대상이다.** 화면이
모집단을 이미 걸러 놓았으므로 등급·노출 상태를 따로 따질 필요가 없다.

다만 **DB 전체에서 표시값만 세면 안 된다.** 그 집계에는 화면에 뜨지 않는 fiction이
섞인다(26.08.07 실측: 표시값 `0` 1,146명 중 모집단은 667명). 규모를
셀 때는 `isCelebContentResearchTarget`을 함께 건다.

> ⚠️ **노출 상태(`celebs.publication_status`)를 표시값 계산에 끌어 쓰지 마라(26.08.07 교정).**
> 26.07.30~26.08.07에는 비활성이면 조사 여부를 보지도 않고 `-1`을 돌려줬다. 그래서
> 팩션용으로 비공개 등록한 신규 인물이 조사도 하기 전에 「조사 완료」로 표시돼 조사
> 대상에서 빠졌다. 공개 상태는 노출만 결정하며 조사 여부·관계·태그 배정 같은 독립 사실을
> 대신하지 않는다. 판별할 때는 “내일 active로 바꾸면 이 값이 저절로 맞아지는가?”를 묻고,
> 아니라면 `publication_status`를 조건에 넣지 않는다.
- `-1`인 인물에게 콘텐츠가 추가되면 DB 트리거가 0건 확정 시각을 비운다.
- 활성 프로필은 단순 선별, 검색 1회 실패, 자료가 적어 보인다는 판단만으로 `-1`을 줄 수 없다.
- 신규 `-1`은 네 유형 조사 뒤 web-bo의 0건 확정 버튼으로 기록한다. 실제 콘텐츠가
  한 건이라도 있으면 DB 가드가 거부한다.
- `open`·`researching` 같은 진행 상태는 DB에 저장하지 않는다. 진행 중인 작업은
  오케스트레이터가 관리한다.
- 폐기 전 감상여정 데이터는 보관만 하며 콘텐츠 조사에서 읽거나 쓰지 않는다.

---

## 셀럽 등록 규칙

셀럽은 로그인 계정이 아니다. basic 단계에서 `auth.users`·`user_accounts`·`member_profiles`를
만들지 않고 `celebs`에 직접 등록한다. `celebs.id`는 Auth를 참조하지 않는다.

정식 창구는 web-bo `/celebs/new`의 `createCeleb` 서버 액션이다. 이 액션은 다음 계약을
한 번에 지킨다.

- `crypto.randomUUID()`로 셀럽 UUID를 발급하고 예시형 UUID 하드코딩을 거부한다
- `nickname_en`을 필수로 받아 generated `slug`를 만들고 중복이면 `slug_suffix`를 배정한다
- 신규 등급은 항상 `light`, 기본 공개 상태는 `inactive`다
- 아바타 없는 `active`와 콘텐츠 없는 `full`은 DB 트리거가 거부한다
- `celeb_metrics` 초기 행을 보장한다

운영 스크립트가 직접 등록해야 할 때도 같은 구조를 사용한다. SQL이면 `gen_random_uuid()`를
한 번 호출해 `celebs.id`에 쓰고, `auth.users`나 가짜 이메일을 만들지 않는다. 실패 롤백은
셀럽 행만 삭제하며 회원 삭제 RPC를 호출하지 않는다.

```sql
INSERT INTO public.celebs (
  id, nickname, nickname_en, celeb_tier, publication_status
) VALUES (
  gen_random_uuid(), :nickname, :nickname_en, 'light', 'inactive'
);
```

---

## 작업 순서

basic 완료 후 4개 트랙이 **병렬** 실행된다.

```
basic ─┬─ content
       ├─ influence
       ├─ spectrum
       └─ speech (최소 조사 → tone → 한마디 1 + 상황 대사 21 평가·생성)
                                    (dialogue는 전원 21개 전체)
모든 트랙 완료 → i18n
```

### full 파이프라인

| 트랙 | 단계 | 룰북 | 의존 |
|------|------|------|------|
| — | 기본 정보 | `celeb-1-basic-profile.md` | 없음 |
| A | 콘텐츠 수집 | `celeb-2-content-collector.md` | basic |
| B | 영향력 평가 | `celeb-4-influence.md` | basic |
| C | 스펙트럼 | `celeb-5-spectrum.md` | basic |
| D | Speech 트랙 | `celeb-speech.md` | basic |
| — | 영문 번역 | `celeb-i18n.md` | 모든 트랙 완료 |

> 감상 여정(`retire/celeb-3-cultural-journey.md`)은 **비활성이라 파이프라인에서 제외했다.** 룰북 파일은 기존 데이터 참조용으로 남겨 두었을 뿐이며, 신규 인물 작업에서 호출하지 않는다.

### light 파이프라인

기본 등록은 0건 확정 시각 없이 표시값 `0`으로 시작한다.

1. 미조사 → 표시값 `0` (공개·비공개 무관)
2. 조사 진행 → 오케스트레이터에서만 추적, DB 표시값은 `0`
3. BOOK·VIDEO·GAME·MUSIC을 조사하고, 유효한 작품만 실제 콘텐츠 테이블에 등록
4. 콘텐츠 1건 이상 확인 → `contents`·`celeb_contents` 연결, 실제 개수 표시, 감사 후 full 승격
5. 네 유형 조사 후 실제 콘텐츠 0건 → 0건 확정 시각 기록, 표시값 `-1`

운영 목록은 web-bo `/celebs/content-research`다. 작업 경로는 실제 콘텐츠 수, 활성 여부,
0건 확정 여부와 우선순위 신호만으로 파생한다. 비공개 인물도 조사를 안 했으면 표시값은
`0`이고 조사 대상에 남는다.

### 티어 미지정 시

1. basic 생성
2. content-collector 실행
3. 1건 이상 수집 → `celeb_tier = 'full'` / 0건 → light 유지
4. 0건이어도 자동 확정하지 않고 확정 시각을 비워 둔다
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

인물 타임라인 조사는 예외다. 조사 리소스를 DB로 관리하지 않고 세션 오케스트레이터가 사건 0건
인물을 독립 레인에 배정한다. 세부 절차는 `celeb-timeline.md`의 「조사 운영」을 따른다.

`celebs.claimed_by_member_id`는 셀럽을 인수한 회원과의 관계다. 작업 락 용도로 재사용하지 않는다.

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

-- 3. 완료 — 직접 UPDATE celebs 금지. 이 함수가 celebs + 큐를 한 트랜잭션에서 처리
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
FROM celeb_task_queue q JOIN celebs p ON p.id = q.celeb_id
WHERE task_type = 'philosophy_rewrite_v2' AND q.status = 'in_progress';

-- 초기 동기화
SELECT public.enqueue_missing_celeb_philosophy_rewrite_jobs();
```

Worker 이름은 짧고 고유하게: `codex-a`, `claude-01` 등. 큐 함수는 **service_role 전용**.
