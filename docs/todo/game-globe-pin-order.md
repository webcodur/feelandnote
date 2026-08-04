# 지구본 핀 — 쉼터 신작 게임 발주서 (O2)

> 🔴 **폐기됨(26.07.31) — 구현하지 마라.** 이 발주서는 자체 착안 1차 후보의 산출물이고, 살아남은 다섯이 결국 모두 「문항 읽고 보기 중에 고르기」로 수렴한 데다 모르면 못 푸는 지식 시험이라 전부 폐기됐다. 대체 결과물은 실존 데일리게임 포맷을 옮긴 7종이며 규격은 `docs/todo/game-wave2-contract.md`가 쥔다. 폐기 사유와 이 문서에서 건져낸 실측 소득은 루트 `game-idea-orders.md` §2에 있다. 이 문서는 축 중복 논증과 데이터 원천 실측 때문에 남겨 둔 것이다.

> **최종 실측 체크: 26.07.31** — 부분 대조: `WorldGlobe.tsx` Props 전량, `getCelebTimelineEvents.ts` 전문, `celeb-journey.md` 함정 7종, `GameShell.tsx`·`GameFullScreen.tsx` 전문, `RestGameGrid.tsx` 등록 구조, `types/supabase.ts`에 `celeb_timeline_events` 부재 확인, 여명 게임(`DawnGame/useDawnGame.ts`)의 `birth_date` 기반 확인. **DB 실측 없음**

---

## 1. 무엇을 하는 게임인가

회전하는 지구본 위에 금색 점 하나가 찍힌다. 그곳에서 일어난 사건의 설명을 읽고, 네 인물 중 누구의 행적인지를 고른다. 정답을 맞히면 다음 장소로 넘어가고, 틀리면 목숨을 잃는다. 10문제를 완주하거나 목숨이 다하면 한 판이 끝난다. 사건이 일어난 도시·국가를 눈으로 확인하고 인물의 발자취를 공간적으로 익히는 것이 핵심이다.

---

## 2. 기존 7종과의 축 차이 재검증

| 게임 | 놀이 축 | 지구본 핀과의 차이 |
|------|---------|-------------------|
| 여명 | **출생년도 순서**를 맞히는 정렬 퍼즐. `useDawnGame.ts`의 `parseBirthYear`가 `birth_date`에서 출생연도를 뽑고, 플레이어는 보드에 올바른 위치를 삽입한다 | 지구본 핀은 연도를 묻지 않는다. 사건 장소를 시각적으로 보여주고 **주인공이 누구인지** 고르게 한다 |
| 미궁 | 감상 콘텐츠·감상 여정·명언·성향 텍스트 단서를 단계 해금하며 6명 중 1명 지목 | 지구본 핀은 텍스트 단서를 한꺼번에 주고 **공간 문맥(지구본 위 점)**이 핵심 단서. 후보 4명, 해금 없음 |
| 패권 | 카드 상성 대결 | 완전히 다른 장르 |
| 천도 | 영지·인재 경영 시뮬 | 완전히 다른 장르 |
| 유랑 | 사건 선택형 여행 | 서사 분기가 없다 |
| 기억궁 | 짝 맞추기 | 기억력 게임이 아니다 |
| 초상 | 흐려진 사진 → 빨리 고르기 | 시각 인식 속도가 아니라 지리·역사 지식 |

**핵심 차별**: "어디서 무슨 일이 있었나"를 공간으로 경험하는 유일한 게임이다. 기존 게임 중 `celeb_timeline_events`의 좌표·장소·사건 서술을 쓰는 것이 하나도 없다.

**여명과의 축 겹침 위험**: "사건이 몇 년도에 일어났나?"를 추가 질문으로 넣으면 여명과 겹친다. **연도를 묻는 문제를 넣지 않는다.** 연도는 정답 공개 후 보충 정보로만 표시한다.

---

## 3. 한 판 완주 흐름

1. 쉼터 카드에서 "지구본 핀" 선택 → `GameShell`이 게이트·로비를 띄운다
2. 로비에서 난이도(보통/어려움) 선택 → "시작" 버튼
3. 서버 액션이 출제 후보를 한 번에 가져온다 (10문제 + 예비 2)
4. 화면 상단에 지구본이 해당 좌표를 정면에 놓고 금색 점으로 강조
5. 지구본 아래에 사건 제목·서술·장소명·사건 종류 표시 (인물명은 마스킹)
6. 하단에 인물 초상+이름 4장 카드 (2×2 그리드)
7. 플레이어가 카드를 탭 → 즉시 정오답 판정·연출
8. 정답이면 점수 적립 + 다음 문제로 지구본 회전 전환
9. 오답이면 목숨 −1 + 정답 표시 후 다음 문제
10. 10문제 완주 또는 목숨 소진 → 결과 화면 (점수·정답률·지도 요약)

---

## 4. 출제·채점 규칙

| 항목 | 값 |
|------|-----|
| 한 판 문제 수 | 10 |
| 예비 문제 | 2 (로딩 실패·중복 대비) |
| 목숨 | 3 |
| 제한시간 | 없음 (지구본을 돌려볼 시간 보장) |
| 정답 배점 | 기본 100점 |
| 연속 정답 보너스 | 3연속부터 +20점씩 증가 (3=120, 4=140, …) |
| 힌트 | 소거 1회 (오답 1명 제거, 사용 시 배점 ×0.5) |
| 오답 수 | 3명 (정답 1 + 오답 3 = 4지선다) |

### 출제 로직

1. `celeb_timeline_events` 중 **좌표(lat/lng) 보유 + source_url 존재** 행만 대상
2. fiction 인물의 서사 사건(`year IS NULL`)은 제외 — 현실 좌표 미부여 원칙
3. `kind`가 `birth`·`death`인 사건은 난이도 "보통"에서만 포함 (식별이 쉬움)
4. 오답 후보: 같은 `kind`이거나 같은 시대(±200년)인 다른 인물에서 추출
5. 한 판 안에서 같은 인물이 정답으로 2회 이상 나오지 않는다
6. 한 판 안에서 같은 사건이 나오지 않는다 (id 기준)

### 난이도별 차이

| | 보통 | 어려움 |
|---|---|---|
| 사건 종류 | 전체 (`birth`·`death` 포함) | `birth`·`death` 제외 |
| 오답 풀 | 시대 ±200년 | 시대 ±100년 + 같은 국적 우선 |
| 서술 표시 | 제목 + 설명 + 장소명 | 제목 + 장소명만 (설명 숨김) |

---

## 5. 데이터 원천 표

| 테이블 | 컬럼 | 용도 | 결측 위험 |
|--------|------|------|-----------|
| `celeb_timeline_events` | `id`, `celeb_id`, `year`, `title`, `title_en`, `description`, `description_en`, `kind`, `place_name`, `place_name_en`, `lat`, `lng`, `source_url` | 출제 문제 본체 | ⚠️ **web `types/supabase.ts`에 없다** — `overrideTypes` 우회 필요 |
| `profiles` | `id`, `nickname`, `nickname_en`, `avatar_url`, `nationality`, `birth_date`, `death_date`, `profession` | 정답·오답 인물 표시 | 초상 없는 인물은 출제 제외 |
| `celeb_influence` | `celeb_id`, `total_score` | 출제 우선순위 (영향력 높은 인물 우선) | 미확인: 현재 1,581행 기준 |

### celeb-journey.md 함정에서 도출한 출제 제외 조건

| 함정 | 출제 제외 규칙 |
|------|---------------|
| 1. 동명 지명 → 좌표 어긋남 | `place_qid` 없는 행 제외 (재검증 못 한 좌표). ⚠️ `place_qid`는 `celeb-journey.md`의 스키마 표에 있지만 기존 액션(`getCelebTimelineEvents.ts`)의 select에는 포함돼 있지 않다. 신규 액션에서 직접 select해야 한다 |
| 2. 긴 지형 중심점 | 추가 제외 불필요 — place_qid로 필터하면 검증된 좌표만 남는다 |
| 3. 근거 링크 위조 | `source_url IS NULL` 행 제외 |
| 7. 갱신 0행 사고 | 적재 검증으로 해소됨. 게임이 추가로 할 것 없음 |

**종합 필터**: `lat IS NOT NULL AND lng IS NOT NULL AND source_url IS NOT NULL AND year IS NOT NULL AND place_qid IS NOT NULL`

---

## 6. 조회 설계

### 새 서버 액션 필요

`getCelebTimelineEvents.ts`는 **인물 1명 단위** 조회다. 출제에는 여러 인물의 사건을 섞어야 하므로 별도 액션이 필요하다.

**`getGlobePinRound.ts`** (신규):

```
목적: 10+2문제분의 사건 + 각 문제의 인물 4명 정보를 한 번에 반환
```

### 1,000행 상한 대응

- `celeb_timeline_events`는 현재 3,547건이므로 전수 조회 시 상한에 걸린다
- 그러나 **전수 조회가 필요 없다** — 출제는 랜덤 샘플 12건이면 된다
- 전략: `limit(12)` + 서버 측 랜덤 오프셋 또는 DB RPC(`get_globe_pin_round`)로 랜덤 추출
- 오답 인물 조회: 정답 인물의 `profession`·`nationality`·`birth_date` 범위로 `.in()` 대신 조건 필터 (462개 in() 실패 이력 회피)

### 캐시 키

```
['globe-pin-round', difficulty, seed]
```

- `seed`: 요청 시각 기반 분 단위 — 같은 분에 같은 난이도면 캐시 히트
- 단일 키로 12문제분 전체를 들고 있으므로 라운드 중 추가 요청 없음
- `revalidate`: `STATIC_REVALIDATE` (7일) — 캐시 키에 시각이 포함돼 자연 만료

### 전송량

- 1문제: 사건 타이틀+설명+장소(~300B) + 인물 4명(닉네임+초상URL, ~400B) ≒ 700B
- 12문제: ~8.4KB (gzip 후 ~3KB)
- egress 부담 무시 가능

---

## 7. 재사용 부품 / 신규 제작 파일 목록

### 재사용

| 부품 | 경로 | 용도 |
|------|------|------|
| 전체화면 껍데기 | `sw/web/src/components/features/game/shared/GameShell.tsx` | 게이트·로비·게임 전환 |
| 공용 지구본 | `sw/web/src/components/shared/WorldGlobe/WorldGlobe.tsx` | 문제 좌표 표시, `focusId`로 회전, `activeId`로 강조 |
| 전체화면 포털 | `sw/web/src/components/shared/GameFullScreen.tsx` | `reserveSubtitleSpace=false` (자막 불필요) |

### 신규 제작

| 파일 (경로 제안) | 역할 |
|-----------------|------|
| `sw/web/src/components/features/game/globe-pin/GlobePinGameWrapper.tsx` | `GameShell` config 전달 |
| `sw/web/src/components/features/game/globe-pin/GlobePinGame.tsx` | 메인 게임 컴포넌트 |
| `sw/web/src/components/features/game/globe-pin/GlobePinLobby.tsx` | 난이도 선택·규칙 설명 |
| `sw/web/src/components/features/game/globe-pin/GlobePinResult.tsx` | 결과 화면 |
| `sw/web/src/components/features/game/globe-pin/GlobePinBackground.tsx` | 배경 |
| `sw/web/src/actions/game/getGlobePinRound.ts` | 서버 액션 — 출제·오답 생성 |

### WorldGlobe와의 통합

지구본은 `markers` prop에 정답 좌표 1개를 넘기고, `focusId`를 매 문제마다 바꿔 자동 회전시킨다. `activeId`로 현재 문제 점을 강조. `onSelect`는 사용하지 않는다 (마커 클릭이 아니라 하단 카드 선택이 입력).

지구본 높이: `GameFullScreen`의 콘텐츠 영역은 `flex-1 overflow-y-auto`이므로 지구본에 `maxHeight={320}` (모바일) ~ `maxHeight={400}` (데스크탑)을 주고 나머지를 문제 영역에 배분한다. `fillContainer=false`.

---

## 8. 공정성·오류 처리

| 상황 | 처리 |
|------|------|
| 조회 실패 | 에러 화면 표시, 빈 목록으로 위장하지 않음 (throw 유지) |
| 사건 데이터 부족 (12건 미만) | 로비에서 "데이터가 부족해 게임을 시작할 수 없습니다" 안내 |
| 지구본 원본(world-110m.json) 로드 실패 | 지구본 영역 빈 상태 + 문제 텍스트만으로 진행 허용 (지도는 힌트일 뿐 필수 입력이 아님) |
| 인물 초상 로드 실패 | 이니셜 플레이스홀더 표시, **오답 처리하지 않음** |
| 지구본 로딩 중 | 선택지 카드 `disabled` + 시각적 불투명도 변경 (입력 차단) |
| 정답 인물의 초상이 DB에 없는 경우 | 출제 대상에서 사전 제외 (`avatar_url IS NOT NULL`) |

---

## 9. 모바일·접근성

| 항목 | 규격 |
|------|------|
| 최소 폭 | 320px에서 완주 가능 |
| 선택지 배치 | 2×2 그리드 (2열) |
| 지구본 크기 | 모바일: `maxHeight=240`, 터치 드래그로 회전 가능 |
| 색 외 구분 | 정답=✓ 아이콘 + 테두리, 오답=✗ 아이콘 + 테두리 (초록/빨강만으로 구분하지 않음) |
| 진행 막대 | 10칸 중 현재 문제 위치 + `aria-valuenow`·`aria-valuemax` |
| 목숨 표시 | 아이콘 + "남은 기회 N회" 텍스트 (`aria-live="polite"`) |
| 지구본 접근성 | `role="img"` + `aria-label="문제 장소가 표시된 지구본"` (기존 Props 활용) |
| 키보드 | 숫자키 1~4로 선택지, H키 힌트, Enter 다음 문제 |

---

## 10. i18n 키 계획

`sw/web/messages/{ko,en}/rest.json` → `rest.arena.globePin.*`

```json
{
  "label": "지구본 핀 / Globe Pin",
  "description": "어디서 무슨 일이 있었나 / What happened here?",
  "intro": "... / ...",
  "startGame": "시작 / Start",
  "difficulty": { "normal": "보통 / Normal", "hard": "어려움 / Hard" },
  "question": { "who": "이 사건의 주인공은? / Whose footprint is this?" },
  "hint": { "eliminate": "하나 지우기 / Eliminate one", "used": "사용됨 / Used" },
  "result": { "perfect": "올클리어! / Perfect!", "score": "점수 / Score", "accuracy": "정답률 / Accuracy" },
  "lives": "남은 기회 / Lives remaining",
  "progress": "문제 {current}/{total}",
  "notEnoughData": "출제 데이터가 부족합니다 / Not enough data to start",
  "globeLabel": "문제 장소가 표시된 지구본 / Globe showing event location",
  "eventKind": { "birth": "탄생 / Birth", "death": "사망 / Death", "battle": "전투 / Battle", "publish": "출판 / Publication", "education": "학업 / Education", "work": "활동 / Work", "travel": "이동 / Travel", "office": "취임 / Office", "meeting": "만남 / Meeting", "other": "기타 / Other" }
}
```

---

## 11. 위험과 미해결

### 위치 찍기 모드 — 1차 범위 밖

`WorldGlobe`의 Props에는 `onSelect(id: string)`만 있다. **클릭한 지점의 위경도를 되돌리는 콜백이 없다.** 따라서 "지구본 위에 직접 위치를 찍고 오차 거리로 채점" 방식은 현재 부품으로 불가능하다.

이 모드를 추가하려면:
1. `WorldGlobe`에 `onClickCoord?: (lat: number, lng: number) => void` 콜백 추가
2. `handleClick` 내부에서 `projection.invert`로 클릭 지점을 위경도로 변환 (코드에 `projection.invert`가 이미 `countryAt` 함수에서 쓰이므로 기술적으로 가능)
3. 하버사인 거리로 채점

**별건으로 분리한다.** 1차는 4지선다 모드만 구현하고, 위치 찍기는 공용 부품 개조 후 2차로 검토한다.

### `celeb_timeline_events`가 web 타입에 없다

`sw/web/src/types/supabase.ts`에 이 테이블이 정의되어 있지 않다. 기존 `getCelebTimelineEvents.ts`는 `.overrideTypes<EventRow[], { merge: false }>()`로 우회 중이다. 신규 액션도 **동일한 우회를 사용**한다. 타입 재생성은 이 발주 범위 밖이다.

### 데이터 분포 미확인 (DB 실측 불가)

문서 기준 3,547건·210명이지만, 실제로 `lat IS NOT NULL AND source_url IS NOT NULL AND year IS NOT NULL` 조건을 건 뒤 몇 건이 남는지 미확인이다.

**착수 게이트 쿼리**:
```sql
SELECT count(*) FROM celeb_timeline_events
WHERE lat IS NOT NULL AND lng IS NOT NULL
  AND source_url IS NOT NULL
  AND year IS NOT NULL
  AND place_qid IS NOT NULL;
```
문서의 "좌표 보유 3,354건, 근거 누락 0"이 맞다면 대부분이 남을 것이다. 다만 `place_qid` 누락 비율은 미확인이다. 12건 출제에 충분한지 이 쿼리로 재야 한다.

### 오답 풀 품질

같은 `kind` + 비슷한 시대의 다른 인물이 3명 이상 존재하지 않는 경우가 있을 수 있다. 이때는 조건을 완화(시대 범위 확장 → 전체 풀에서 랜덤)해야 한다. 완화 단계를 액션에 구현해야 한다.

### 전체화면 내 지구본 높이

`GameFullScreen`의 콘텐츠 영역은 `flex-col` + `flex-1` + `overflow-y-auto`이다. 지구본과 문제 카드가 세로로 쌓이므로 모바일(~600px 높이)에서 지구본이 너무 크면 카드가 스크롤 밖으로 밀린다. `maxHeight` 값을 반응형으로 조정하거나 모바일에서는 지구본을 접을 수 있어야 한다.

---

## 12. 검수 게이트 (납품 조건)

1. `pnpm build:web` 성공 (캐시 없는 `tsc --noEmit` 포함)
2. 변경 범위 ESLint·`git diff --check` 통과
3. `rest.json` ko/en 키 수 일치 (누락 0)
4. 출제 엔진 8회 완주 — 빈 문제·중복 정답·후보 부족 0
5. **표본 20문제 사람 통독** — 마스킹 후에도 답이 새는 문제(서술에 인물명 잔존), 시시한 오답(시대·직군이 너무 다른 인물), 좌표가 터무니없는 곳(바다 한가운데)을 골라낸다
6. 320px 뷰포트에서 전체 흐름 완주 (지구본 터치 회전 + 선택지 탭)
7. 키보드만으로 완주 (1~4 선택, H 힌트, Enter 다음)
8. 지구본 로딩 실패 시 게임 진행 가능 확인
9. 실 DB·브라우저 한 판 완주 (환경변수 부재로 못 했다면 보고에 명시)

---

## 13. 착수 전 사람이 결정해야 하는 항목

| # | 결정 사항 | 영향 |
|---|-----------|------|
| 1 | 게임 공개 이름 한/영 최종 확정 ("지구본 핀" vs "행적 추적" vs 다른 이름) | i18n 키·카드 텍스트 |
| 2 | 쉼터 카드 배경 이미지 발주 여부 (`/images/games/globe-pin-card.webp`) | RestGameGrid 카드 |
| 3 | lucide 아이콘 확정 (현재 제안: `MapPin` 또는 `Globe`) | 게이트·카드 |
| 4 | 위치 찍기 모드를 2차 범위로 공식 승인할지, 영구 제외할지 | WorldGlobe 개조 판단 |
| 5 | fiction 인물 서사 사건을 향후 출제 대상에 포함할지 (현재 좌표 미부여라 불가) | 출제 필터 |
| 6 | 착수 게이트 쿼리 실행 결과 — 유효 사건 건수가 100건 미만이면 재검토 | 게임 성립 여부 |
| 7 | 오디오(BGM) 필요 여부 — 여명·천도처럼 별도 BGM을 붙일지, 무음으로 갈지 | 오디오 배선 |

---

## 부록: 위치 찍기 모드 — 별건 메모

`WorldGlobe.tsx`의 `countryAt` 함수(line ~기능: hover 국가 판정)가 이미 `projection.invert?.([localX, localY])`로 클릭 지점을 위경도로 변환하고 있다. 기술적으로는 이 로직을 `onClickCoord` 콜백으로 노출하면 된다.

변경 범위:
- `Props`에 `onClickCoord?: (lat: number, lng: number) => void` 추가
- `handleClick` 내부에서 `hitTest`가 null(마커를 안 짚음)이고 `onClickCoord`가 있으면 `projection.invert`로 좌표를 꺼내 호출
- 채점: 하버사인 공식으로 정답 좌표와의 거리(km) 산출, 거리 구간별 점수 부여

이것은 **공용 부품 변경**이므로 지구본을 쓰는 다른 화면(인물 상세 행적)에 영향이 없는지 확인이 선행돼야 한다. `onClickCoord`가 없으면 기존 동작과 동일하므로 하위 호환은 유지된다.
