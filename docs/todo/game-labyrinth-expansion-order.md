# 미궁 확장 발주서 — 독백 단서 + 단서 선택 난이도

> 🔴 **폐기됨(26.07.31) — 구현하지 마라.** 이 발주서는 자체 착안 1차 후보의 산출물이고, 살아남은 다섯이 결국 모두 「문항 읽고 보기 중에 고르기」로 수렴한 데다 모르면 못 푸는 지식 시험이라 전부 폐기됐다. 대체 결과물은 실존 데일리게임 포맷을 옮긴 7종이며 규격은 `docs/todo/game-wave2-contract.md`가 쥔다. 폐기 사유와 이 문서에서 건져낸 실측 소득은 루트 `game-idea-orders.md` §2에 있다. 이 문서는 축 중복 논증과 데이터 원천 실측 때문에 남겨 둔 것이다.

> **최종 실측 체크: 26.07.31** — 부분 대조: `TrackerGame.tsx` 전량, `getTrackerRound.ts` 전량, `tracker/` 하위 5파일 전량, `labyrinth/LabyrinthGame.tsx`, `messages/{ko,en}/rest.json`의 labyrinth 키 전량, `fill-virtual-monologue-gpt.ts` buildPrompt, `getCelebBySlug.ts` virtual_monologue 컬럼 참조, `virtual-monologue-quality-overhaul.md` 기준선. **DB 실측 없음** — 독백 보유 인물 수·내용 표본은 문서 기준이며 착수 전 재실측한다.

---

## 1. 무엇을 하는 게임인가

미궁은 이미 공개된 게임이다. 현자 6인의 행적(감상문·감상 여정)을 단서로 하나씩 해금하며 정답 인물을 찾아 등용한다. 이번 확장은 두 가지를 더한다.

1. **독백 단서** — 인물이 자기 삶과 신념을 1인칭으로 말한 글을 새 단서로 추가한다. 이름·별명·대표작·연대를 가린 뒤 보여주므로, 인물의 사상과 어조만으로 누구인지 추리해야 한다.
2. **단서 선택 난이도** — 지금은 단서가 정해진 순서로 열리지만, 새 난이도에서는 유저가 어떤 종류의 단서를 열지 직접 고른다. 감상문·감상 여정·독백·성향 중 원하는 축을 먼저 볼 수 있다.

기존 쉬운 모드(순서 고정)는 그대로 남긴다. 확장은 **추가** 선택지이며 기존 플레이를 깨지 않는다.

---

## 2. 기존 7종과의 축 차이 재검증

### 미궁 자체 확장이므로 "신작 중복" 문제는 없다

상위 발주서(§1)에서 문체 감별·스무고개를 미궁과 축이 겹친다고 판정해 독립 발주를 취소하고 **미궁 확장으로 흡수**했다. 이 문서가 그 흡수분이다.

### 기존 미궁과의 차이 (코드 근거)

| 현행 | 확장 | 코드 근거 |
|------|------|-----------|
| 단서 = 감상문 4개 + 감상 여정 1개, 고정 순서 | 단서 = 감상문 + 감상 여정 + **독백** + **성향 차트**, 유저 선택 | `TrackerGame.tsx` stage1~5 고정 매핑 → 축 추가 + 선택 UI |
| 단서 종류를 유저가 고를 수 없음 | 선택 난이도에서 유저가 축을 고름 | 현행 `hintStages` 배열이 고정 5종 |
| 인물명 마스킹 대상 = 감상문·여정·소개·명언 | + **독백 본문** | `censorName`이 이미 `bio`, `quotes`, `culturalJourney`에 적용됨 → 독백에도 동일 적용 |

### 다른 게임과의 축 차이

- **여명**: 탄생 순서 정렬. 텍스트 추리가 아니다.
- **패권**: 카드 상성 대전. 전략 게임이다.
- **천도**: 영지 경영 시뮬.
- **시대의 초상**: 시각(사진) 인식. 텍스트를 읽지 않는다.
- **기억궁**: 짝 맞추기. 기억력 게임이다.
- **유랑**: 선택형 사건 여행. 추리가 아니다.

**결론: 축 중복 없음. 발주 유효.**

---

## 3. 한 판 완주 흐름

### 모드 A: 기존 (순서 고정, 하위 호환)

변경 없음. 현행 stage1→2→3→4→5 그대로.

### 모드 B: 단서 선택 난이도 (신규)

1. 유저가 로비에서 **"단서 선택"** 난이도를 고른다.
2. 라운드 시작: 정답 인물 1명 + 오답 5명이 표시된다.
3. **1단서 무료 해금** — 유저가 4종(감상문 / 감상 여정 / 독백 / 성향) 중 하나를 골라 첫 단서로 연다.
4. 유저가 오답 인물을 확인(X)하면 다음 단서 해금 — 다시 남은 종류 중 하나를 고른다.
5. 이를 4회 반복하면 총 4종이 모두 열린다(감상문은 해금 시 2개를 한꺼번에 보여줌).
6. 유저가 확신이 서면 아무 시점에나 등용(O)한다.
7. 결과 화면 → 다음 라운드 또는 종료.

**핵심 차이**: 단서가 열리는 순서를 유저가 정한다. 감상문부터 볼 수도, 독백부터 볼 수도 있다.

---

## 4. 출제·채점 규칙

| 항목 | 현행 | 확장 (모드 B) |
|------|------|---------------|
| 후보 수 | 6명 (정답 1 + 오답 5) | 동일 |
| 단서 수 | 5개 (감상문 4 + 여정 1) | 4종 (감상문 2묶음 / 여정 / 독백 / 성향) |
| 해금 조건 | 확인(X) 1회당 1단서 해금 | 동일. 단 유저가 종류를 선택 |
| 제한시간 | 없음 | 없음 (유지) |
| 힌트 | 없음 | 없음 (유지) |
| 정답 판정 | 등용(O) 클릭 시 즉시 판정 | 동일 |
| 오답 패널티 | 현자 종적을 감춤 (라운드 실패) | 동일 |
| 확인(X) 보상 | 단서 해금 | 단서 해금 + 종류 선택권 |

### 독백 단서 마스킹 규칙

기존 `censorName` 함수의 동작을 그대로 적용한다:

1. 보호 단어(`safeWords`) — 작품명·작가명을 임시 치환해 보호.
2. 닉네임 전체 → `■■■` 치환.
3. 닉네임 토큰(성/이름)별 부분 치환 (2글자 이상: 앞에 한글/영문이 없을 때만, 1글자: 조사 뒤따를 때만).
4. 보호 단어 복구.

**독백 전용 추가 마스킹** (신규):

5. **연도·세기 마스킹**: `/(기원전\s*)?\d{1,4}(년|세기|세기\s*(초|말|중반))/g` → `■■■■`
6. **대표작·저서 마스킹**: 독백에서 인용하는 작품명은 `safeWords`에 넣어 보호하는 것이 아니라 **가려야** 한다. 인물 단서이므로. → 별도 `monologueDangerWords` 목록을 생성해 치환.
7. **별명·칭호 마스킹**: `profiles.title` / `profiles.title_en` 값을 `censorName` 토큰에 추가.

### 성향 단서 표시

`celeb_persona` 16축 값을 레이더 차트 또는 막대 그래프로 표시. 축 이름만 보여주고 수치와 시각화로 인물 성격을 추론하게 한다. 이름이 드러나지 않으므로 추가 마스킹 불필요.

---

## 5. 데이터 원천 표

| 용도 | 테이블.컬럼 | 실측 확인 | 결측 위험 |
|------|-------------|-----------|-----------|
| 독백 본문 (ko) | `profiles.virtual_monologue` | `getCelebBySlug.ts` L156에서 select 확인 | 문서 기준 활성 1,476명 중 보유율 거의 100%(결측 1명 relation 티어). **퍼블릭 도메인 후보에 한정하면 보유율 미실측** |
| 독백 본문 (en) | `profiles.virtual_monologue_en` | 동일 select에 포함 | 미완(후속 작업). **영어 접속 시 fallback으로 한국어 독백 사용 또는 이 단서 비활성** |
| 칭호 (마스킹용) | `profiles.title`, `profiles.title_en` | `getCelebBySlug.ts` L156 확인 | nullable. 없으면 칭호 마스킹 건너뜀 |
| 성향 16축 | `celeb_persona.*` | `getTrackerRound.ts` L302에서 select 확인 | 후보 자격 조건에 persona 존재가 포함됨 → 결측 0 |
| 감상문 4개 | `user_contents.review` | 현행 그대로 | 후보 자격 조건에 4건 이상 포함 → 보장 |
| 감상 여정 | `profiles.cultural_journey` | 현행 그대로 | 후보 자격 조건에 포함 → 보장 |
| 보호 단어 | `contents` → `content_locales.title`, `creator` | 현행 그대로 | — |

### 착수 전 DB 실측 게이트

```sql
-- 퍼블릭 도메인(1920년 이전 사망) + persona + review 4건 이상 + cultural_journey 중
-- virtual_monologue가 NULL 또는 빈 문자열인 인물 수
SELECT count(*) FROM profiles p
WHERE p.profile_type = 'CELEB' AND p.status = 'active'
  AND p.death_date IS NOT NULL
  AND p.death_date < '1921'
  AND EXISTS (SELECT 1 FROM celeb_persona cp WHERE cp.celeb_id = p.id)
  AND (SELECT count(*) FROM user_contents uc WHERE uc.user_id = p.id AND uc.review IS NOT NULL AND uc.review != '') >= 4
  AND p.cultural_journey IS NOT NULL AND p.cultural_journey != ''
  AND (p.virtual_monologue IS NULL OR p.virtual_monologue = '');
```

이 값이 **후보 총수의 10% 이상**이면 독백 단서를 모드 B 전용(선택 시에만 열림)으로 제한하고, 독백 없는 인물은 해당 축 비활성 처리한다.

---

## 6. 조회 설계

### 현행 구조 (변경하지 않는 것)

| 계층 | 동작 | 캐시 |
|------|------|------|
| `getCachedTrackerCandidates` | RPC `get_tracker_candidates` 호출 → 자격 후보 id 목록 | `unstable_cache` 7일, 태그 celebs·contents·persona |
| `getCachedFallbackEligible` | profiles + celeb_persona + user_contents 직접 조회, `selectAllPages` + `selectInChunks` 사용 | 동일 |
| `getCachedDistractorPool` | 오답 후보 300명 (limit 300) | 동일 |
| 라운드별 | 선정된 1명의 본문(여정·소개·명언) + 옵션 6명 톤·대사 | 캐시 없음 (랜덤) |

### 확장 추가분

| 추가 조회 | 방법 | 전송량 |
|-----------|------|--------|
| 독백 본문 | 선정된 1명에 대해 `profiles.virtual_monologue` / `virtual_monologue_en` 조회. **이미 `buildRound`에서 `profiles` select가 `bio, bio_en, cultural_journey, cultural_journey_en`을 받는 지점에 2컬럼 추가하면 됨** → 추가 요청 0 | 독백 평균 1,000자 ≈ 2KB. gzip 후 ~600B |
| 칭호 | 동일 select에 이미 포함 가능 (현재 미포함 → 추가) | 수십 바이트 |
| 성향 16축 | **이미 `buildRound`에서 `celeb_persona` 전 16축을 조회하고 `TrackerRound.persona`로 반환 중**. 현행 UI에서 미사용이지만 데이터는 이미 클라이언트에 도달함 | 추가 전송 0 |

### 1,000행 상한·`selectInChunks` 회귀 방지

- 후보 조회 경로는 **건드리지 않는다**. `getCachedTrackerCandidates`와 `getCachedFallbackEligible`의 로직을 그대로 유지.
- 독백·칭호는 **선정된 1명만** 조회하므로 `in()` 목록 문제 무관.
- 오답 풀 `getCachedDistractorPool`의 limit 300도 변경하지 않음.

**🔴 회귀 방지 조건**: 확장 코드가 `selectAllPages`·`selectInChunks`를 새로 호출하거나, 기존 캐시 키를 변경하거나, RPC 인자를 바꾸면 안 된다. PR 검수 시 이 세 함수의 diff가 0임을 확인한다.

---

## 7. 재사용 부품 / 신규 제작 파일 목록

### 재사용 (변경 없이 또는 최소 수정)

| 부품 | 경로 | 용도 |
|------|------|------|
| 이름 마스킹 | `sw/web/src/actions/game/getTrackerRound.ts` → `censorName` | 독백에도 동일 적용. 연도·칭호 마스킹만 추가 |
| 인물 카드 6장 | `tracker/MultipleChoice.tsx` + `TrackerCard.tsx` | 변경 없음 |
| 콘텐츠 단서 표시 | `tracker/ContentReveal.tsx` | 감상문 단서 그대로 |
| 감상 여정 표시 | `tracker/CulturalJourneyReveal.tsx` | 그대로 |
| 결과 화면 | `tracker/TrackerResult.tsx` | 변경 없음 |
| 게임 셸 | `labyrinth/LabyrinthGame.tsx` → `GameShell` | 그대로 |
| 로비 | `labyrinth/LabyrinthLobby.tsx` | **난이도 선택 UI 추가** |
| 배경·오디오 | `labyrinth/LabyrinthBackground.tsx`, `hooks/useLabyrinthAudio.ts` | 변경 없음 |

### 신규 제작

| 파일 (경로 제안) | 역할 |
|------------------|------|
| `tracker/MonologueReveal.tsx` | 독백 단서 표시 컴포넌트. `CulturalJourneyReveal`과 유사 구조, 마스킹된 독백 렌더링 |
| `tracker/PersonaReveal.tsx` | 성향 16축 레이더/막대 차트 단서 표시 |
| `tracker/ClueSelector.tsx` | 모드 B에서 유저가 단서 종류를 고르는 선택 UI (4종 버튼) |
| `getTrackerRound.ts` 내 `censorMonologue` 함수 | 독백 전용 추가 마스킹 (연도·칭호·대표작) |

### 기존 파일 수정 (최소 범위)

| 파일 | 변경 내용 |
|------|-----------|
| `getTrackerRound.ts` | `buildRound` 내 profiles select에 `virtual_monologue`, `virtual_monologue_en`, `title`, `title_en` 추가. `TrackerRound` 타입에 `monologue: string | null` 필드 추가. `censorMonologue` 호출 |
| `TrackerGame.tsx` | 모드 상태 추가 (`clueMode: 'fixed' | 'choice'`). 모드 B일 때 `ClueSelector` 표시, 선택 결과에 따라 단서 순서 결정 |
| `labyrinth/LabyrinthLobby.tsx` | 난이도 선택(기존 순서 / 단서 선택) 버튼 추가 |
| `messages/{ko,en}/rest.json` | 신규 키 추가 (§10 참조) |

---

## 8. 공정성·오류 처리

### 하위 호환

- 모드 A(순서 고정)의 동작은 **1바이트도 변하지 않는다**. 모드 B는 별도 코드 경로로 분기.
- `TrackerRound` 타입에 `monologue` 필드를 추가할 때 `| null`로 선언하여, 독백이 없는 인물도 라운드가 성립한다.
- 모드 B에서 독백을 선택했으나 해당 인물에 독백이 없으면 → "이 단서를 사용할 수 없습니다" 안내 + 다른 종류를 고르게 한다. **빈 단서를 보여주지 않는다.**

### 마스킹 후 문제 성립성

🔴 **핵심 판정**: 독백은 마스킹 후에도 문제로 성립하는가?

프로젝트 기록에 따르면 독백은 "남들이 나를 이렇게 부른다" 식 오프닝과 대표작·연대가 핵심이며, 가리면 남는 게 없을 수 있다. 그러나 `buildPrompt` 규격을 실측한 결과:

- 독백은 **1인칭 독백 800~1200자**로 삶과 신념을 말하는 글이다.
- 이름은 첫 문단에 드러나지만 **반드시 "저는 ○○입니다"로 시작하지는 않는다** (규격 명시).
- 사상·감정·경험·업적의 서술이 본문 대부분을 차지한다.
- 연도를 가리고 이름을 가려도, **어떤 시대에 어떤 분야에서 무엇을 믿고 행동한 사람인지**는 남는다.

**판정: 조건부 채택.** 마스킹 후 잔여 정보량은 인물마다 다르다. 영향력 높은 인물(독백이 길고 풍부)은 충분히 성립하지만, 짧거나 일반적인 독백은 단서 가치가 낮을 수 있다.

**대책**:
- 독백 800자 미만인 인물은 이 단서를 비활성 처리한다.
- **착수 전 사람 표본 검수 게이트**: 퍼블릭 도메인 후보 중 무작위 20명의 독백을 마스킹 적용 후 사람이 직접 읽고, 6지선다에서 정답을 추릴 수 있는지 확인한다. 성립률 70% 미만이면 이 모드를 반려한다.

### 조회 실패

- `getTrackerRound` 반환이 `null`이면 → 기존과 동일하게 로딩 실패 표시, idle로 복귀.
- 독백 조회가 실패해도 라운드 자체는 성립 (모드 A로 fallback 또는 해당 축 비활성).

### 자산 로딩 전 입력 정지

- 기존 `stage === "loading"` 상태에서 모든 입력이 차단됨 (현행 유지).
- 모드 B에서 단서 선택 후 데이터 로딩이 필요한 경우 → 선택 버튼 비활성 + 스피너.

---

## 9. 모바일·접근성

### 320px 대응

- 현행 미궁은 좌우 2패널(lg 이상)·세로 쌓기(sm)로 이미 반응형.
- `ClueSelector` 4종 버튼 → **2×2 그리드** (각 버튼 최소 140px). 320px에서 2열 배치 가능.
- `PersonaReveal` 레이더 차트 → 모바일에서는 **단순 막대 그래프**로 전환 (16축 × 높이 8px = 128px).
- `MonologueReveal` → 현행 `CulturalJourneyReveal`과 동일 레이아웃 (max-h-[45vh] + 스크롤).

### 색 외 구분

- 단서 종류 아이콘을 각각 다르게: 감상문 = 책 아이콘, 여정 = 길 아이콘, 독백 = 말풍선 아이콘, 성향 = 뇌 아이콘.
- 선택/비선택 상태를 테두리 두께 + 아이콘 크기로도 구분 (색만으로 구분하지 않음).
- 현행 확인(X) 토스트의 초록색 → 아이콘(ShieldCheck) + 텍스트로 이미 이중 전달됨. 유지.

### 진행 막대

- 현행 5단계 표시기(`hintStages`) → 모드 B에서는 "열린 단서 수 / 4" 진행 표시.
- `aria-label`로 "4개 중 2개 단서 해금됨" 등 의미 전달.

---

## 10. i18n 키 계획

현행 `rest.arena.labyrinth` 키 구조 (실측):
- `rest.arena.labyrinth.label` / `description` / `headerDesc` / `headerSub` / `catchphrase`
- `rest.arena.labyrinth.startTracking` / `startTrackingDesc` / `rulesDesc` / `rulesIntro`
- `rest.arena.labyrinth.clueUnlockTitle` / `clue1`~`clue4` / `clueCulturalJourney` + 각 `Desc`
- `rest.arena.labyrinth.tip1` / `tip2`
- `rest.arena.labyrinth.game.*` (stages, prompts, toasts, content types 등)

### 추가 키 (ko/en 동시)

```
rest.arena.labyrinth.difficultySelect        "난이도 선택" / "Select Difficulty"
rest.arena.labyrinth.modeFixed               "순서 고정" / "Fixed Order"
rest.arena.labyrinth.modeFixedDesc            "단서가 정해진 순서로 열립니다" / "Clues unlock in fixed order"
rest.arena.labyrinth.modeChoice              "단서 선택" / "Choose Clues"
rest.arena.labyrinth.modeChoiceDesc           "어떤 단서를 먼저 볼지 직접 고릅니다" / "Choose which clue to reveal first"

rest.arena.labyrinth.game.clueTypes.review    "감상문" / "Reviews"
rest.arena.labyrinth.game.clueTypes.journey   "감상 여정" / "Cultural Journey"
rest.arena.labyrinth.game.clueTypes.monologue "독백" / "Monologue"
rest.arena.labyrinth.game.clueTypes.persona   "성향" / "Persona"

rest.arena.labyrinth.game.selectClue          "열 단서를 고르세요" / "Choose a clue to reveal"
rest.arena.labyrinth.game.monologueTitle      "독백" / "Monologue"
rest.arena.labyrinth.game.personaTitle        "성향 분석" / "Persona Analysis"
rest.arena.labyrinth.game.clueUnavailable     "이 인물은 해당 단서가 없습니다" / "This clue is unavailable for this figure"

rest.arena.labyrinth.game.stages.monologue    "독백" / "Monologue"
rest.arena.labyrinth.game.stages.persona      "성향" / "Persona"
```

총 추가 키: **14개** (ko 14 + en 14 = 28 항목). 기존 키 변경 0.

---

## 11. 위험과 미해결

| # | 위험 | 심각도 | 대책 |
|---|------|--------|------|
| 1 | **독백 마스킹 후 답이 새는 문장 잔존** — 이름을 안 쓰고 "내 책 ○○에서"처럼 작품명을 직접 언급하는 경우 | 높음 | 인물의 `user_contents` 작품명 목록을 `dangerWords`에 포함 + 착수 전 표본 20명 사람 검수 |
| 2 | **독백 마스킹 후 단서 가치 제로** — 짧거나 일반적 서술만 남는 인물 | 중간 | 800자 미만 비활성 + 표본 검수 게이트 |
| 3 | **영문 독백 미완** — `virtual_monologue_en`이 후속 작업으로 아직 진행 중 | 낮음 | 영어 접속 시 독백 축 비활성 또는 ko fallback. 모드 B에서 3종만 선택 가능으로 축소 |
| 4 | **기존 RPC 회귀** — `get_tracker_candidates`를 건드리면 부재 컬럼 사고 재발 | 치명 | 후보 조회 로직 변경 금지. PR diff 검수 조건에 명시 |
| 5 | **selectInChunks/selectAllPages 호출 추가** — 독백 조회에 새 페이징 로직을 넣을 이유 없지만 실수 가능 | 치명 | 독백은 선정된 1명만 조회 (단일 .single()). 목록 조회 금지 |
| 6 | **모드 B에서 독백이 없는 인물이 걸렸을 때 UX 깨짐** | 중간 | 선택 시 서버가 `monologue: null` 반환 → 클라이언트가 "이 단서 없음" 표시 + 다른 종류 자동 제안 |
| 7 | **성향 차트가 인물 직접 노출** — 16축 패턴이 너무 독특해 1명으로 좁혀짐 | 낮음 | 오답 5명도 같은 직군·시대이므로 성향이 유사. 기존 유사도 기반 오답 선정이 이를 보장 |

---

## 12. 검수 게이트 (납품 조건)

1. `pnpm build:web` 성공 (tsc + next build).
2. `messages/ko/rest.json`과 `messages/en/rest.json`의 labyrinth 하위 키 수 일치 (누락 0).
3. 모드 A(순서 고정) 8회 완주 — 기존 동작과 **1px 차이 없음**. 단서 순서·해금·등용·확인·결과 전부 동일.
4. 모드 B(단서 선택) 8회 완주 — 4종 단서 각각 1회 이상 첫 선택으로 열어봄. 빈 문제·중복 정답·후보 부족 0.
5. 독백 마스킹 **표본 20명 사람 통독** — 마스킹 후에도 6지선다로 정답 추릴 수 있는지 확인. 성립률 70% 이상.
6. 기존 `getTrackerRound.ts`의 `getCachedTrackerCandidates`, `getCachedFallbackEligible`, `getCachedDistractorPool`, `selectInChunks`, `selectAllPages` 5개 함수에 **diff 0**.
7. 독백 없는 인물이 모드 B에서 걸렸을 때 → 크래시 없이 대체 UI 표시 확인.
8. 320px 뷰포트에서 모드 B 전체 흐름 완주.
9. `eslint` · `git diff --check` 통과.

---

## 13. 착수 전 사람이 결정해야 하는 항목

| # | 결정 사항 | 이유 |
|---|-----------|------|
| 1 | **표본 20명 독백 마스킹 검수 통과 여부** | 성립률 70% 미만이면 독백 모드 반려. DB 접속이 필요하므로 사람이 실행 |
| 2 | **영어 접속 시 독백 단서 처리** — 비활성 vs ko fallback | `virtual_monologue_en` 완성 시점 미정. 임시 방침 필요 |
| 3 | **독백 최소 길이 기준** — 800자? 600자? | 짧은 독백의 단서 가치가 어느 선에서 무의미해지는지 표본 검수 결과로 판단 |
| 4 | **모드 B 이름** — "단서 선택", "자유 탐문", "고급" 등 | 유저 대면 용어. 로비에 표시됨 |
| 5 | **성향 차트 시각화 방식** — 레이더 vs 막대 vs 수치 나열 | 디자인 판단. 레이더가 예쁘지만 16축이면 읽기 어려울 수 있음 |
| 6 | **모드 B에서 감상문 묶음 크기** — 2개 한꺼번에 vs 1개씩 (그러면 5종 6단서) | 밸런스 판단. 2개 묶음이면 정보량이 기존과 같아 무난 |
| 7 | **퍼블릭 도메인 후보 중 독백 보유율 실측** | DB 쿼리 실행 필요. 결과에 따라 독백 단서 활성 범위 결정 |
