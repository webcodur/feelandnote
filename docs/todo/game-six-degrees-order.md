# 여섯 다리 (Six Degrees) — 조건부 발주서

> 🔴 **폐기됨(26.07.31) — 구현하지 마라.** 이 발주서는 자체 착안 1차 후보의 산출물이고, 살아남은 다섯이 결국 모두 「문항 읽고 보기 중에 고르기」로 수렴한 데다 모르면 못 푸는 지식 시험이라 전부 폐기됐다. 대체 결과물은 실존 데일리게임 포맷을 옮긴 7종이며 규격은 `docs/todo/game-wave2-contract.md`가 쥔다. 폐기 사유와 이 문서에서 건져낸 실측 소득은 루트 `game-idea-orders.md` §2에 있다. 이 문서는 축 중복 논증과 데이터 원천 실측 때문에 남겨 둔 것이다.

> **최종 실측 체크: 26.07.31** — 부분 대조: `sw/web/src/types/supabase.ts`(celeb_tag_assignments·celeb_tags·user_contents·contents 스키마), `packages/shared/src/lib/paginate.ts`(selectAllPages·selectInChunks 시그니처), `sw/web/src/actions/game/getTrackerRound.ts`(미궁 데이터 사용), `sw/web/src/actions/game/getDawnCelebContents.ts`(여명 데이터 사용), `sw/web/src/components/features/rest/RestGameGrid.tsx`(게임 등록), `sw/web/src/components/features/game/shared/GameShell.tsx`(공용 껍데기), `docs/todo/tag-ideas.md`(태그 40종·인원 실측), `game-idea-orders.md`(상위 발주서). **DB 실측 없음** — 그래프 밀도·경로 길이 분포는 미확인.

---

## 🔴 판정: 조건부 보류 — 경로 분포 실측 전까지 착수 불가

이 발주서는 게임 설계를 완성하되, **착수 게이트(§12)를 통과하지 않으면 구현하지 않는다.** 가장 큰 위험(인기 콘텐츠·태그 허브로 인해 거의 모든 쌍이 2단계 이내에 이어짐)이 실측 없이는 해소되지 않기 때문이다.

---

## 1. 무엇을 하는 게임인가

두 인물이 제시된다. 한 인물에서 출발해, "같은 책(또는 영화·음악 등)을 읽은 다른 인물" 혹은 "같은 세력(태그)에 속한 다른 인물"을 밟아가며 도착 인물에 닿는 경로를 찾는 퍼즐이다. 경로가 짧을수록 점수가 높고, 제한 시간 안에 찾아야 한다. "케빈 베이컨의 여섯 다리" 법칙을 인물 감상 기록으로 재현한다.

---

## 2. 기존 7종과의 축 차이 재검증

| 기존 게임 | 핵심 축 | 여섯 다리와의 관계 |
|---|---|---|
| 여명 (Dawn) | 출생년도 순서 맞추기 | 시간 축. 여섯 다리는 관계 그래프 탐색이라 겹치지 않음 |
| 미궁 (Labyrinth) | 이름 가린 텍스트(감상문·명언·성향)로 인물 지목 | 단서 해독→정답 1명 지목. 여섯 다리는 경로 구성이라 목표가 다름 |
| 패권 (Hegemony) | 카드 상성 대결 | 1대1 대전. 관계 그래프와 무관 |
| 천도 (Cheondo) | 영지·인재 경영 시뮬 | 전략 시뮬. 축 완전 별개 |
| 유랑 (Wander) | 시대 여행 선택형 사건 | 서사 분기. 그래프 탐색 아님 |
| 기억궁 (Memory) | 짝 맞추기 | 기억력. 축 완전 별개 |
| 시대의 초상 (Portrait) | 흐려진 사진 식별 | 시각 식별. 축 완전 별개 |

**미궁·여명과 `user_contents` 테이블을 공유하지만 사용 방식이 다르다:**
- 미궁: 특정 셀럽 1명의 감상문 본문을 마스킹해 단서로 제시. **내용을 읽히는 것**이 목적.
- 여명: 셀럽의 콘텐츠 목록을 결과 화면에 표시. 게임 판정에 쓰이지 않음.
- 여섯 다리: 셀럽 A와 셀럽 B가 **같은 콘텐츠를 공유하는지**(인접 여부)만 본다. 감상문 본문을 읽히지 않고, 콘텐츠 제목만 경로 표시에 쓴다.

**결론: 축 중복 없음.** 데이터 원천이 같을 뿐 놀이 방식(그래프 탐색·최단 경로 퍼즐)은 기존 어디에도 없다.

---

## 3. 한 판 완주 흐름

1. 로비에서 난이도를 고른다 (쉬움: 같은 그룹 내 / 보통: 전체 / 어려움: 힌트 없음).
2. 출발 인물과 도착 인물이 아바타·이름·수식어와 함께 제시된다.
3. 현재 인물의 "이웃 목록"이 뜬다 — 같은 콘텐츠를 공유하는 인물 또는 같은 태그에 속한 인물.
4. 이웃 중 하나를 선택해 한 칸 전진한다. 선택 시 "이 인물과 연결된 이유"(공유 콘텐츠 제목 또는 태그 이름)가 표시된다.
5. 도착 인물에 닿으면 성공. 걸린 단계 수와 남은 시간으로 점수를 산정한다.
6. 제한 시간(60초)이 지나면 실패. 최적 경로를 보여준다.
7. 결과 화면: 내 경로 vs 최적 경로를 시각적으로 비교한다.

---

## 4. 출제·채점 규칙

| 항목 | 값 |
|---|---|
| 라운드 수 | 5문제 / 한 판 |
| 제한 시간 | 60초 / 문제 |
| 최적 경로 길이 목표 | 3~5단계 (이보다 짧으면 퍼즐이 아님) |
| 채점 | 최적 경로 길이를 L, 플레이어 경로를 P라 할 때: 기본 점수 = max(0, 100 - (P-L)×20). 시간 보너스: 남은 초 × 0.5 |
| 힌트 | 쉬움: 도착 인물의 이웃 3명을 미리 표시. 보통: 도착 인물의 소속 태그 1개 공개. 어려움: 없음 |
| 최소 데이터 요건 | 출제 쌍의 최적 경로가 3 이상 5 이하여야 출제한다. 2 이하 또는 연결 불가 쌍은 버린다 |

---

## 5. 데이터 원천 표

### 그래프 간선의 두 축

| 축 | 테이블 | 핵심 컬럼 | FK | 의미 |
|---|---|---|---|---|
| 콘텐츠 공유 | `user_contents` | `user_id` (=celeb profile id), `content_id` | `user_id` → `profiles.id`, `content_id` → `contents.id` | 두 셀럽이 같은 content_id를 갖고 있으면 인접 |
| 태그 공유 | `celeb_tag_assignments` | `celeb_id`, `tag_id` | `celeb_id` → `profiles.id`, `tag_id` → `celeb_tags.id` | 두 셀럽이 같은 tag_id에 배정되면 인접 |

### 노드·간선 규모 추정 (문서 기준, 미실측)

| 요소 | 추정치 | 근거 |
|---|---|---|
| 노드(셀럽) | ~1,692명 | AGENTS.md `profiles` CELEB 1,692 |
| user_contents 행 | ~11,267 | AGENTS.md PostgREST 절 |
| contents 수 | 7,568 | AGENTS.md PostgREST 절 |
| 셀럽 당 평균 콘텐츠 | ~6.7 | 11,267 / 1,692 |
| celeb_tags | 40종 | `docs/todo/tag-ideas.md` 실측 |
| 태그당 평균 인원 | ~42명 (1,674/40) | AGENTS.md "40종/1,674명" |
| celeb_tag_assignments 행 | 미확인 | unique(celeb_id, tag_id). 1인 다중 태그 가능 |

### 🔴 결측 위험: 허브 붕괴

**태그 축의 구조적 문제**: 태그 1개에 42명이 들어 있으면 그 42명은 전원 상호 인접(완전 그래프)이다. 1,674명 중 대부분이 최소 1개 태그에 속한다면, 임의의 두 인물이 "A의 태그 동료 → B의 태그 동료"로 2단계 안에 이어질 확률이 극히 높다.

**콘텐츠 축의 구조적 문제**: 성경·논어·군주론 같은 고전이 수십 명에게 공유되면 같은 현상이 발생한다. `contents.user_count` 컬럼이 이를 나타낸다.

이 두 허브가 결합하면 **거의 모든 쌍이 최적 경로 2**가 되어 퍼즐 자체가 성립하지 않는다.

---

## 6. 조회 설계

### 그래프 사전 계산 vs 실시간 계산

**결론: 사전 계산 + 단일 키 공유 캐시.** 근거:

1. **실시간 계산은 불가능하다.** BFS 최단 경로를 매 요청마다 계산하려면 인접 리스트 전체가 메모리에 있어야 한다. `user_contents` 11,267행 + `celeb_tag_assignments` N행을 매번 끌어오면 egress 사고가 재발한다.
2. **그래프는 느리게 변한다.** 셀럽의 콘텐츠·태그는 운영자가 수동 등록한다. 하루 수 건 수준. 7일 캐시로 충분하다.
3. **선례: `all-persona-vectors`.** 유사 인물 추천이 이미 "전수 조회 → 단일 키 7일 캐시 → 클라이언트 계산" 패턴을 쓴다. 실측 gzip 0.11MB. 이 게임도 같은 구조를 따른다.

### 인접 리스트 구축

```
캐시 키: "six-degrees-graph"
갱신: unstable_cache, revalidate 7일, tags: [CACHE_TAGS.CONTENTS, CACHE_TAGS.CELEBS]
```

서버에서 한 번 조회:
1. `celeb_tag_assignments` 전량 → `selectAllPages`(order: `id` asc). 결과를 `Map<tag_id, celeb_id[]>`로 변환.
2. `user_contents` 전량에서 `user_id`, `content_id`만 → `selectAllPages`(order: `id` asc). 결과를 `Map<content_id, user_id[]>`로 변환. **단, `user_count` ≤ 1인 콘텐츠(허브가 아닌 유일 소유)는 간선을 만들지 않으므로 서버에서 필터.**

최종 산출물: `Map<celeb_id, Set<celeb_id>>` (인접 리스트). 클라이언트에는 이걸 JSON으로 내린다.

### 전송량 추정

- 노드 1,692개, UUID 36자. 최악(모든 쌍 연결): 1,692² × 36B = 불가능.
- 실제로는 인접 리스트의 **간선 수**가 핵심. 태그 40종 × 평균 42명 = ~34,440 간선(태그). 콘텐츠 공유 간선은 미실측.
- 간선을 `{from: idx, to: idx}` 정수 인덱스로 압축하면 간선당 ~8B. 50,000 간선 × 8B = 400KB (gzip ~80KB).
- **이 추정이 맞는지 실측 게이트에서 확인해야 한다.**

### 1,000행 상한 대응

`packages/shared/src/lib/paginate.ts`의 `selectAllPages`를 사용한다:

```typescript
export async function selectAllPages<T>(
  page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
  max?: number
): Promise<T[]>
```

- `celeb_tag_assignments`: `.order('id', { ascending: true })` + `selectAllPages`. 2차 정렬키 불필요(id가 PK).
- `user_contents`: `.select('user_id, content_id').order('id', { ascending: true })` + `selectAllPages`. 11,267행이므로 12페이지.

`in()` 호출은 하지 않는다 — 전량을 페이징으로 받는다.

---

## 7. 재사용 부품 / 신규 제작 파일 목록

### 재사용

| 부품 | 경로 (실측 확인) | 용도 |
|---|---|---|
| 게임 전체화면 껍데기 | `sw/web/src/components/features/game/shared/GameShell.tsx` | 로비·게임·결과 전환 |
| 페이징 유틸리티 | `packages/shared/src/lib/paginate.ts` | 1,000행 상한 회피 |
| 쉼터 카드 등록 | `sw/web/src/components/features/rest/RestGameGrid.tsx` | 게임 카드 추가 |
| 캐시 태그 상수 | `@feelandnote/shared/constants/cache-tags` | 캐시 무효화 |
| 정적 Supabase 클라이언트 | `sw/web/src/lib/supabase/static` | 서버 조회 |
| i18n 문구 | `sw/web/messages/{ko,en}/rest.json` | 게임 문구 |

### 신규 제작 (경로 제안)

| 파일 | 역할 |
|---|---|
| `sw/web/src/actions/game/getSixDegreesGraph.ts` | 인접 리스트 구축 + 캐시 |
| `sw/web/src/actions/game/getSixDegreesPair.ts` | 출제 쌍 선정 (BFS로 최적 경로 3~5 확인) |
| `sw/web/src/components/features/game/six-degrees/SixDegreesGame.tsx` | 게임 본체 |
| `sw/web/src/components/features/game/six-degrees/SixDegreesLobby.tsx` | 로비 |
| `sw/web/src/components/features/game/six-degrees/SixDegreesResult.tsx` | 결과 화면 |
| `sw/web/src/components/features/game/six-degrees/SixDegreesBackground.tsx` | 배경 |
| `sw/web/src/components/features/game/six-degrees/PathVisualization.tsx` | 경로 시각화 |
| `sw/web/src/components/features/game/six-degrees/NeighborList.tsx` | 이웃 선택 UI |
| `sw/web/src/lib/game/six-degrees/bfs.ts` | BFS 최단 경로 계산 (클라이언트) |
| `sw/web/src/lib/game/six-degrees/types.ts` | 타입 정의 |

---

## 8. 공정성·오류 처리

| 상황 | 처리 |
|---|---|
| 그래프 조회 실패 | 로비에서 명시적 오류 표시. 빈 그래프로 게임을 시작하지 않는다 |
| 출제 쌍 선정 실패 (유효 쌍 부족) | "출제할 수 있는 문제가 부족합니다" 안내. 게임을 시작하지 않는다 |
| 이웃 목록 로딩 중 | 타이머 정지 + 입력 비활성. 로딩이 끝난 뒤 타이머 재개 |
| 아바타 로드 실패 | 이름 이니셜 폴백. 오답 처리하지 않음 |
| 연결 불가 쌍이 출제됨 | 출제 시 BFS로 경로 존재를 사전 검증. 연결 불가면 출제하지 않음 |
| 타이머 종료 | 실패 처리 + 최적 경로 공개. 부분 점수 없음 |

---

## 9. 모바일·접근성

| 항목 | 설계 |
|---|---|
| 최소 너비 | 320px 완주 가능 |
| 이웃 목록 | 2열 그리드. 아바타 + 이름. 스크롤 가능 |
| 경로 시각화 | 수평 → 모바일은 수직 스택으로 전환 |
| 색 외 구분 | 현재 위치: 굵은 테두리 + 아이콘. 방문 노드: 체크 아이콘. 미방문: 기본 |
| 진행 표시 | "현재 단계 / 최대 허용 단계" 텍스트 + 시각 막대. 막대는 최적 경로 대비 현재 길이를 나타냄 |
| 타이머 | 숫자 + 원형 진행 표시. 색맹 대응: 남은 시간 15초 이하에서 진동 패턴 추가 |
| 터치 | 이웃 카드 최소 44×44px 터치 영역 |
| 키보드 | 방향키/탭으로 이웃 탐색, Enter로 선택 |

---

## 10. i18n 키 계획

`sw/web/messages/{ko,en}/rest.json`에 추가:

```
"sixDegrees.title": "여섯 다리 / Six Degrees"
"sixDegrees.description": "두 인물을 잇는 최단 경로를 찾아라 / Find the shortest path between two figures"
"sixDegrees.lobby.difficulty.easy": "쉬움 / Easy"
"sixDegrees.lobby.difficulty.normal": "보통 / Normal"
"sixDegrees.lobby.difficulty.hard": "어려움 / Hard"
"sixDegrees.game.from": "출발 / From"
"sixDegrees.game.to": "도착 / To"
"sixDegrees.game.step": "{{current}}단계 / Step {{current}}"
"sixDegrees.game.neighbors": "이웃 인물 / Neighbors"
"sixDegrees.game.sharedContent": "공유 콘텐츠: {{title}} / Shared: {{title}}"
"sixDegrees.game.sharedTag": "같은 세력: {{name}} / Same group: {{name}}"
"sixDegrees.game.timeUp": "시간 초과 / Time's up"
"sixDegrees.game.success": "도착! / Arrived!"
"sixDegrees.result.yourPath": "내 경로 / Your path"
"sixDegrees.result.optimalPath": "최적 경로 / Optimal path"
"sixDegrees.result.steps": "{{count}}단계 / {{count}} steps"
"sixDegrees.result.score": "점수 / Score"
"sixDegrees.error.loadFailed": "그래프를 불러오지 못했습니다 / Failed to load graph"
"sixDegrees.error.noPairs": "출제할 수 있는 문제가 부족합니다 / Not enough valid pairs"
```

키 수: ko 18개 = en 18개. 누락 0.

---

## 11. 위험과 미해결

### 🔴 치명적 위험 (게이트 차단)

| # | 위험 | 영향 | 해소 조건 |
|---|---|---|---|
| R1 | **허브 붕괴**: 인기 콘텐츠(성경·논어 등)와 대형 태그(페이팔 마피아 14명, AI 선구자들 14명 등)가 허브가 되어 거의 모든 쌍의 최단 경로가 2 이하 | 퍼즐이 성립하지 않음. 게임을 만들어도 시시함 | §12 착수 게이트 G1 통과 |
| R2 | **고립 노드**: 태그 배정도 없고 콘텐츠도 1~2개뿐인 셀럽이 다수면 연결 불가 쌍이 너무 많아 출제 풀이 빈약 | 5문제 출제 자체가 불안정 | §12 착수 게이트 G2 통과 |

### 🟡 중간 위험

| # | 위험 | 대응 |
|---|---|---|
| R3 | 그래프 JSON 전송량이 예상(~80KB gzip)을 초과 | 실측 후 정수 인덱스 압축, 또는 서버 BFS + 이웃만 내려주는 방식으로 전환 |
| R4 | 태그 축만으로 대부분 연결되면 콘텐츠 축이 무의미 | 난이도 설계로 분리: "콘텐츠만" 모드 신설 가능 |
| R5 | 출제 쌍 캐시(7일)가 깨지면 같은 쌍이 반복 | 출제 시 seed를 날짜+라운드 번호로 분산 |

### ⚪ 낮은 위험

| # | 위험 | 대응 |
|---|---|---|
| R6 | BFS를 클라이언트에서 돌리면 저사양 기기에서 버벅임 | 노드 1,692개 BFS는 < 10ms. 문제없음 |
| R7 | celeb_tag_assignments가 1,000행 초과할 수 있음 | selectAllPages 사용으로 이미 대응 |

---

## 12. 검수 게이트 (납품 조건)

### 착수 게이트 (코드 작성 전에 통과해야 함)

| ID | 게이트 | 검증 방법 | 통과 기준 |
|---|---|---|---|
| **G1** | 경로 길이 분포 실측 | 아래 쿼리 규격으로 그래프를 구축하고, 무작위 1,000쌍의 BFS 최단 경로를 산출 | **경로 3~5인 쌍이 전체의 30% 이상**이어야 한다. 70% 이상이 경로 ≤ 2이면 **반려** |
| **G2** | 연결 가능 비율 | 같은 그래프에서 연결 불가(경로 ∞) 쌍의 비율 산출 | **연결 불가 쌍이 20% 이하**여야 한다. 초과하면 출제 풀이 빈약해 **반려** |
| **G3** | 허브 밀도 | degree(이웃 수) 상위 10 노드의 degree 목록 확인 | 상위 10의 평균 degree가 전체 노드의 50% 이상이면 **반려** (사실상 모든 쌍이 2단계) |

### G1 검증 쿼리·스크립트 규격

```sql
-- 1단계: 콘텐츠 공유 간선 추출
-- (같은 content_id를 가진 user_id 쌍)
SELECT a.user_id AS celeb_a, b.user_id AS celeb_b, a.content_id
FROM user_contents a
JOIN user_contents b ON a.content_id = b.content_id AND a.user_id < b.user_id
WHERE a.user_id IN (SELECT id FROM profiles WHERE profile_type = 'CELEB')
  AND b.user_id IN (SELECT id FROM profiles WHERE profile_type = 'CELEB');

-- 2단계: 태그 공유 간선 추출
-- (같은 tag_id에 배정된 celeb_id 쌍)
SELECT a.celeb_id AS celeb_a, b.celeb_id AS celeb_b, a.tag_id
FROM celeb_tag_assignments a
JOIN celeb_tag_assignments b ON a.tag_id = b.tag_id AND a.celeb_id < b.celeb_id;
```

위 두 결과를 합치면 인접 리스트가 된다. Python 또는 Node 스크립트로:
1. 인접 리스트 구축
2. 무작위 1,000쌍 샘플링 (np.random.choice)
3. 각 쌍에 BFS 실행, 경로 길이 히스토그램 산출
4. degree 분포 산출 (상위 10 허브 확인)

**이 스크립트를 돌리려면 DB 접속이 필요하다.** 로컬에서 Supabase 환경값이 없으므로, Supabase 대시보드 SQL 에디터에서 1·2단계를 실행하고 CSV로 내보낸 뒤 로컬에서 BFS를 돌리는 것이 현실적이다.

### 구현 납품 조건 (착수 게이트 통과 후)

| # | 조건 |
|---|---|
| 1 | `tsc --noEmit` 통과 |
| 2 | 변경 범위 ESLint + `git diff --check` 통과 |
| 3 | `pnpm build:web` 성공 |
| 4 | ko/en 문구 키 수 일치 (누락 0) |
| 5 | 출제 엔진 8회 완주: 빈 문제 0, 경로 ≤ 2 출제 0, 연결 불가 출제 0 |
| 6 | 표본 20쌍 사람 통독: 경로가 논리적으로 납득 가능한지, 우연의 일치로 보이는 연결이 아닌지 확인 |
| 7 | 실 DB·브라우저 한 판 완주 |

---

## 13. 착수 전 사람이 결정해야 하는 항목

| # | 결정 사항 | 영향 |
|---|---|---|
| 1 | **G1 실측을 누가, 언제 하는가** | 이것이 끝나기 전에는 코드 착수 불가 |
| 2 | 허브 붕괴 시 대안 채택 여부: (a) 태그 축 제거하고 콘텐츠 공유만으로 그래프 구성 (b) 고빈도 콘텐츠(user_count > N)를 간선에서 제외 (c) 게임 자체 반려 | 분포 실측 결과에 따라 결정 |
| 3 | 점수 기록 저장 여부 | `blind_game_scores`에 게임 구분 컬럼이 없다. 신규 테이블 또는 컬럼 추가 필요 |
| 4 | 카드 배경 이미지 발주 여부 | `RestGameGrid`의 `image` 속성. 없으면 카드가 텍스트만 됨 |
| 5 | 난이도별 그래프 분리 구현 여부 | "콘텐츠만" 모드를 두면 허브 문제 완화 가능하나 복잡도 증가 |

---

## 부록: 허브 붕괴가 확인될 경우의 대안

분포 실측에서 G1을 통과하지 못할 경우, 완전 반려 대신 검토할 수 있는 설계 변형:

1. **콘텐츠 전용 모드**: 태그 간선을 모두 제거하고, 콘텐츠 공유만으로 그래프를 구성한다. 태그가 허브의 주범이면 이것만으로 해결될 수 있다.
2. **허브 캡**: `user_count > 10`인 콘텐츠를 간선에서 제외한다. 모두가 읽은 고전은 "경유지"로 못 쓰게 된다. 퍼즐 난이도가 올라간다.
3. **가중 BFS**: 허브를 밟으면 비용이 높아지는 가중 그래프. "최소 비용 경로"를 찾게 한다. 구현 복잡도가 높다.
4. **완전 반려**: 데이터 구조상 이 게임은 성립하지 않는다고 결론 내고, 다른 후보를 올린다.

어떤 대안을 택할지는 실측 결과를 본 뒤 사람이 결정한다.
