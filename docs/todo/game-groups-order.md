# 넷씩 넷 (Groups) — 발주서

> **최종 실측 체크: 26.07.31** — 부분 대조: `celeb_tags`·`celeb_tag_assignments` 스키마(db-celeb.md), `profiles.profession`·`nationality` 컬럼(db-core.md·supabase.ts), `celeb-professions.ts` 15종, `getPortraitFigures.ts` 조회 패턴, `GameFullScreen.tsx` 래퍼, `GameShell.tsx` 구조, `i18n/request.ts` 네임스페이스 등록 확인, `messages/{ko,en}/game-groups.json` 자리 파일 확인, `.env` 부재 실측. DB 실측 없음.

---

## 무엇을 하는 게임인가

16명의 역사 인물이 섞여 나온다. 이 안에는 공통점으로 묶이는 4명씩 4조가 숨어 있다. 어떤 넷이 한 묶음인지 골라서 제출한다. 4번 틀리면 탈락, 4묶음을 모두 찾으면 성공. 하루에 한 판, 누가 풀어도 같은 문제가 나온다.

핵심 재미는 **함정**이다. "이 넷이 한 묶음 같은데?" 싶지만 하나가 빠지는 구조. 예를 들어 한국인 4명 중 장영실은 과학자이기도 하지만 "과학자" 묶음은 외국인 과학자들이 차지하고 있어, 장영실은 "한국인" 묶음에만 해당한다.

---

## 기존 게임과의 축 차이

| 기존 게임 | 재미 축 | 이 게임의 차이 |
|-----------|---------|----------------|
| 시대의 초상 | 인물 외모 인식 | 인물 관계·분류 추론 |
| 미궁 | 개인 추측(좁히기) | 4명 관계 일괄 판단 |
| 여명 | 배치 퍼즐 | 선택-제출 반복 (소거법) |
| 패권 | 대전 | 단독 추론 |

고유 축: **분류 추론 + 함정 함정 함정**. 정답을 몰라도 소거법으로 좁힐 수 있다는 점이 NYT Connections 중독성의 원천이며, 이 게임도 같은 구조를 따른다.

---

## 한 판 완주 흐름

1. **로비** — 규칙 설명 + 오늘 날짜 표시 + 시작 버튼
2. **보드** — 4×4 격자에 인물 이름 16개. 4명 선택 후 "제출"
3. **판정** — 정답이면 해당 묶음이 색 배경으로 상단에 고정. 오답이면 셰이크 + 실수 카운트 감소
4. **소거** — 미풀린 인물만 남은 격자로 축소. 4묶음 완료 시 결과로 이동
5. **결과** — 전체 정답 4색 표시 + 이모지 추측 히스토리 + 다시 하기

---

## 출제·채점 규칙

| 항목 | 수치 |
|------|------|
| 인물 수 | 16명 (4×4) |
| 묶음 수 | 4개 |
| 묶음 크기 | 정확히 4명 |
| 실수 허용 | 4회 (맞힌 것은 소비하지 않음) |
| 난이도 단계 | 4 (노랑=쉬움, 초록=보통, 파랑=어려움, 보라=매우 어려움) |
| 날짜 시드 | YYYY-MM-DD → mulberry32 PRNG |
| 결정론 | 같은 날짜 = 같은 문제 (전 유저 동일) |

**함정 설계 규칙** (출제 시 반드시 지킬 것):
- 한 인물은 정확히 한 묶음에만 해당해야 한다. 축이 겹치면(프랑스인이면서 작가) 둘 중 하나의 묶음에만 넣고, 나머지 축의 묶음에는 이 인물을 포함시키지 않는다.
- "겹칠 듯 안 겹치는" 배치로 함정을 구성한다: 같은 시대 다른 직군, 같은 직군 다른 국적 등.
- 직군 기반 묶음에서는 국적을 모두 다르게, 국적 기반 묶음에서는 직군을 모두 다르게 배치한다.

---

## 데이터 원천 표 (실측 테이블·컬럼)

| 테이블 | 컬럼 | 용도 |
|--------|------|------|
| `profiles` | `id`, `nickname`, `nickname_en`, `avatar_url`, `profession`, `nationality`, `status` | 인물 기본 정보 |
| `celeb_tags` | `id`, `name`, `name_en`, `slug`, `parent_id` | 세력 태그(묶음 기준) |
| `celeb_tag_assignments` | `celeb_id`, `tag_id` | 인물↔태그 매핑 |

**직군(profession)**: `profiles.profession` — 15종 (`leader`, `politician`, `commander`, `entrepreneur`, `investor`, `scientist`, `humanities_scholar`, `social_scientist`, `director`, `musician`, `visual_artist`, `author`, `actor`, `influencer`, `athlete`)

**국적(nationality)**: `profiles.nationality` — 자유 텍스트, 실측 70+ 국가

**세력 태그(tag)**: `celeb_tags` — 실측 40종 + 계층 구조(parent_id)

---

## 조회 설계

### 실제 경로 (배포 환경)

```
getGroupsData()
  → isFixtureMode() 체크 (env 유무)
  → fetchGroupsPool(locale)
    → celeb_tags (parent_id IS NULL) 조회
    → celeb_tag_assignments + profiles 임베드 조회
    → 인원 4명 이상인 태그를 묶음 후보로 등록
    → 직군별 국적-다양 4명 묶음 추가
  → unstable_cache (7일, tags: ['tags', 'celebs'])
```

### 체험 경로 (로컬·env 부재)

```
getGroupsData()
  → isFixtureMode() = true
  → getFixturePool(locale) — 6묶음 24명 하드코딩 표본
  → 화면에 "체험 모드" 배너 표시
```

---

## 파일 목록

| 경로 | 역할 |
|------|------|
| `sw/web/src/components/features/game/groups/types.ts` | 타입 정의 |
| `sw/web/src/components/features/game/groups/engine.ts` | 퍼즐 생성·판정·검증 로직 |
| `sw/web/src/components/features/game/groups/fixture.ts` | 체험 표본 데이터 |
| `sw/web/src/components/features/game/groups/GroupsGame.tsx` | 메인 게임 컴포넌트 (상태 관리) |
| `sw/web/src/components/features/game/groups/GroupsBoard.tsx` | 보드 격자 UI |
| `sw/web/src/components/features/game/groups/GroupsLobby.tsx` | 로비 |
| `sw/web/src/components/features/game/groups/GroupsResult.tsx` | 결과 화면 |
| `sw/web/src/actions/game/groups.ts` | 서버 액션 (DB 조회 + 체험 폴백) |
| `sw/web/src/app/[locale]/lab/games/groups/page.tsx` | 단독 시험 페이지 |
| `sw/web/messages/ko/game-groups.json` | 한국어 문구 (24키) |
| `sw/web/messages/en/game-groups.json` | 영어 문구 (24키) |

---

## 공정성·오류 처리

- **날짜 시드**: mulberry32 PRNG로 결정론적. 같은 날 같은 풀 → 같은 퍼즐. 유저 간 공정.
- **겹침 방지**: 풀에서 4묶음을 선택할 때 인물 ID 중복을 검사하고, 겹치면 해당 묶음을 건너뛴다.
- **조회 실패**: throw로 드러낸다. `?? []` 위장 없음. 환경값 부재 시 체험 표본으로 돌아가되 배너로 명시.
- **빈 풀**: 4묶음 미만이면 로비에서 "데이터 부족" 메시지와 함께 시작 버튼 비활성화.
- **검증 함수**: `validatePuzzle()`이 16명·4묶음·중복 없음을 사전 검사. 실패 시 게임 진입 차단.

---

## 모바일·접근성

- 4×4 격자는 320px 폭에서도 유지 (각 셀 최소 높이 56px, 텍스트 축소)
- 선택 상태를 흰색 원 인디케이터 + 배경 변경으로 표시 (색맹 대응: 색만이 아닌 아이콘)
- 풀린 묶음은 색 배경 + 라벨 텍스트 + 인물명 나열로 정보 전달
- `aria-pressed`로 선택 상태 전달
- `role="status"`로 남은 기회 표시
- 키보드: Enter로 제출, 숫자키로 선택 (데스크탑 보너스)

---

## 문구 키

최상위: `gameGroups` (변경 금지)

```
gameGroups.title
gameGroups.description
gameGroups.howToPlay
gameGroups.rule1 / rule2 / rule3
gameGroups.todayPuzzle
gameGroups.start
gameGroups.notEnoughData
gameGroups.fixtureMode
gameGroups.submit
gameGroups.deselect
gameGroups.mistakesRemaining
gameGroups.mistakesLeft
gameGroups.oneAway
gameGroups.breadcrumb.playing / .result
gameGroups.result.win / .lose / .winDetail / .loseDetail / .solved / .history / .playAgain
```

총 24키, 한·영 동일.

---

## 위험과 미해결

1. **DB 풀 크기**: 세력 태그 40종 중 인원 4명 이상이 충분한지는 실 DB 연결 후 확인 필요. 표본은 6묶음으로 8일 분 다양성을 검증했으나, 실 데이터에서 겹침 없이 뽑을 수 있는 조합 수는 미확인.

2. **겹침 검증의 완전성**: 현재는 풀 조립 시 인물 ID 중복만 체크한다. "한 인물이 여러 축에 걸리는" 의미적 겹침은 출제 풀 설계 단계에서 사전에 걸러야 하며, 런타임에는 ID 기반 검사만 수행한다.

3. **태그 데이터 의존**: `celeb_tag_assignments`의 `sort_order`로 상위 4명만 취하므로, 정렬이 의미 있는지(유명한 인물이 먼저 오는지) 확인 필요.

4. **하루 한 판 제한 미구현**: 현재는 날짜 시드로 같은 문제가 나올 뿐, "이미 풀었으면 재플레이 차단"은 없다. localStorage 기반으로 추가 가능하지만 이번 범위에서는 빼고 자유 재플레이로 뒀다.

5. **"하나만 더" 힌트**: 문구 키 `oneAway`는 정의했지만 현재 UI에서 사용하지 않는다. NYT Connections처럼 3/4 맞을 때 표시하려면 추가 구현 필요.

---

## 남은 결정 사항

- 실 DB 연결 후 풀 크기 검증 → 부족하면 태그·직군·국적 조합을 늘리는 전략 필요
- "하나만 더!" 힌트 노출 여부
- 하루 한 판 제한 (localStorage) 적용 여부
- 쉼터 등록 시 카드 디자인·설명 문구 (통합 담당 범위)
