# O3 — 오늘의 한 문제

> 🔴 **폐기됨(26.07.31) — 구현하지 마라.** 이 발주서는 자체 착안 1차 후보의 산출물이고, 살아남은 다섯이 결국 모두 「문항 읽고 보기 중에 고르기」로 수렴한 데다 모르면 못 푸는 지식 시험이라 전부 폐기됐다. 대체 결과물은 실존 데일리게임 포맷을 옮긴 7종이며 규격은 `docs/todo/game-wave2-contract.md`가 쥔다. 폐기 사유와 이 문서에서 건져낸 실측 소득은 루트 `game-idea-orders.md` §2에 있다. 이 문서는 축 중복 논증과 데이터 원천 실측 때문에 남겨 둔 것이다.

> **최종 실측 체크: 26.07.31** — 부분 대조: `sw/web/src/types/supabase.ts`(blind_game_scores·celeb_dialogues·daily_figures 테이블), `sw/web/src/components/features/game/portrait/PortraitGame.tsx`(localStorage 최고 기록), `packages/shared/src/constants/cache-tags.ts`(CACHE_TAGS 6종), `sw/web/src/lib/cache.ts`(STATIC_REVALIDATE 604800), `sw/web/src/actions/library/today-figure.ts`(날짜 시드·캐시 키), `sw/web/src/components/features/rest/RestGameGrid.tsx`(카드 등록 구조), `sw/web/src/lib/utils/celeb-dialogues.ts`(lines JSON path), `sw/web/src/app/[locale]/(main)/celeb/[slug]/DialogueSection.tsx`(대사 키 9종). DB 실측 없음.

---

## 1. 무엇을 하는 게임인가

매일 자정이 지나면 전 이용자에게 똑같은 문제 하나가 주어진다. "이 문장은 누가 한 말인가?" — 인물 네 명 중 실제 화자를 고른다. 하루에 한 번뿐이므로 시간 제한은 없고, 맞으면 연속 정답(스트릭)이 이어진다. 틀리면 스트릭이 끊긴다. 결과 공유 버튼을 누르면 스포일러 없이 "N일 연속 정답" 또는 "오늘 틀렸다"만 전달된다.

이 게임은 **O1 목소리 재판의 문제 은행을 하루 한 문제만 꺼내 전원에게 같은 조건으로 내는 얇은 껍데기**다. 문제 생성·채점 로직은 O1과 공유하고, 이 문서는 일일 출제·스트릭 관리·공유·캐시 설계만 다룬다.

---

## 2. 기존 7종과의 축 차이 재검증

| 기존 게임 | 핵심 축 | O3과의 겹침 여부 |
|---|---|---|
| 여명 DAWN | 출생 연도 정렬 | ✗ 축 다름 |
| 미궁 LABYRINTH | 복합 단서로 6명 중 1명 지목 | **부분 겹침** — 아래 논증 |
| 패권 HEGEMONY | 카드 상성 대결 | ✗ |
| 천도 CHEONDO | 경영 시뮬 | ✗ |
| 유랑 WANDER | 선택형 사건 여행 | ✗ |
| 기억궁 MEMORY | 짝 맞추기 | ✗ |
| 시대의 초상 | 초상 식별 | ✗ |

**미궁과의 축 논증**: 미궁은 감상문·여정·명언·성향을 5단계 해금하며 6명 중 인물을 좁히는 게임이다(`getTrackerRound.ts`의 `censorName`으로 이름을 마스킹). O3은 **문장 하나만** 보여주고 4지선다에서 화자를 고른다 — 단서 축적·단계 해금이 없다. 게다가 **하루 한 문제**라는 일일 의례 속성은 미궁에 없다. 결론: 데이터 원천이 일부 겹치나 놀이 방식이 다르다. **반려하지 않는다.**

---

## 3. 한 판 완주 흐름

1. 이용자가 쉼터에 진입하면 "오늘의 한 문제" 카드가 보인다.
2. 카드를 누르면 전체화면 진입. 오늘 이미 풀었으면 결과 화면을 바로 보여준다.
3. 아직 안 풀었으면 인용문 한 문장 + 선택지 4명(이름·초상)이 표시된다.
4. 선택지를 고른다(시간 제한 없음).
5. 정오답 판정·정답 인물 공개. 연속 정답 수 표시.
6. 결과 공유 버튼(텍스트 복사). "내일 다시 도전" 안내.

---

## 4. 출제·채점 규칙

| 항목 | 값 |
|---|---|
| 문제 수 | **하루 1문제** |
| 선택지 수 | 4 (정답 1 + 오답 3) |
| 시간 제한 | 없음 |
| 힌트 | 없음 |
| 정답 점수 | +1 스트릭 |
| 오답/타임아웃 | 스트릭 0 리셋 |
| 최고 스트릭 | 브라우저에 보관 |

### 출제 결정론

- 날짜 문자열(ISO `YYYY-MM-DD`)을 시드로 사용해, 같은 날 같은 문제가 나온다.
- 서버가 날짜 시드로 후보 풀에서 정답 인물 1명 + 오답 3명을 뽑는다.
- 오답 3명은 정답과 같은 **직군·시대 대역** 안에서 골라, "아무나 골라도 너무 쉬운" 문제를 방지한다.
- 인용문은 `celeb_dialogues.lines` → `quote` 키를 사용한다 (O1 문제 은행의 기본 모드).

### O1 의존 가정

> ⚠️ O1 발주서(`docs/todo/game-quote-trial-order.md`)는 작성 완료됐으나 서버 액션 인터페이스 합의가 아직이다. 아래 가정은 O1 §6 반환 타입에 기반한다. O1 구현 확정 시 맞춰 조정한다.

- O1이 "인물 명언 → 화자 4지선다" 라운드를 생성하는 `getDailyQuoteQuestion(dateStr: string)` 형태의 서버 액션을 제공한다.
- 반환 타입: `{ quote: string; choices: { id, nickname, avatarUrl }[]; answerId: string }`.
- O3은 이 함수를 호출해 날짜 캐시를 씌우고, 판정·스트릭·공유를 덧입힌다.

---

## 5. 데이터 원천 표

| 용도 | 테이블 | 컬럼 | 비고 |
|---|---|---|---|
| 인용문 | `celeb_dialogues` | `lines->quote` / `lines_en->quote` | 한·영 1,411쌍 일치(문서 기준). **빈 문자열 제외 필수** |
| 선택지 이름·초상 | `profiles` | `nickname`, `nickname_en`, `avatar_url`, `profession`, `nationality`, `birth_date` | 직군·시대 대역 매칭에 사용 |
| 일일 시드 | 없음 (날짜 문자열 자체가 시드) | — | `today-figure.ts`와 같은 패턴 |
| 성적 기록 | 없음 (브라우저 localStorage) | — | `blind_game_scores`는 미사용 확인(코드 참조 0). 1차 서버 저장 불필요 |

### 결측 위험

| 위험 | 근거 |
|---|---|
| 명언이 빈 문자열인 인물이 뽑히면 문제 성립 불가 | 문서상 1,411쌍이나 빈 문자열 포함 시 부풀려짐 |
| 초상 URL이 null이면 선택지 렌더링 불가 | 아바타 미등록 7명 + 비활성 미등록 7명(문서 기준) |
| en locale에서 `quote_en`이 null인 인물 | 영문 완비 실측 1,547명(문서 기준)이나 30명 미만 비어있을 수 있음 |

**착수 게이트 쿼리** (DB 접근 후 실행):
```sql
-- 명언 보유 + 초상 보유 인물 수 (게임 후보 풀 크기)
SELECT count(*) FROM celeb_dialogues d
JOIN profiles p ON p.id = d.celeb_id
WHERE p.avatar_url IS NOT NULL
  AND p.profile_type = 'CELEB'
  AND d.lines->>'quote' IS NOT NULL
  AND d.lines->>'quote' <> '';
```

---

## 6. 조회 설계

### 서버 액션

```
getDailyQuestion(dateStr: string, locale: string)
```

1. `unstable_cache`로 `[daily-question, dateStr, locale]` 키에 캐싱.
2. `revalidate`: 86400(24시간). 태그: `CACHE_TAGS.DIALOGUES`.
3. 후보 풀 조회는 O1의 캐시를 재사용(같은 태그·같은 revalidate).
4. 반환값에는 **정답 id를 포함하지 않는다** — 클라이언트가 선택 후 서버 액션 `checkDailyAnswer(dateStr, selectedId)` 호출로 판정.

### 1,000행 상한 대응

- 후보 풀 전체(명언 보유 인물 ~1,400명)를 `selectAllPages`로 조회. 2차 정렬키: `celeb_id`.
- 선택된 4명의 profiles만 별도 조회(4건이므로 상한 무관).

### 전송량 절약

- 클라이언트에는 `{ quote, choices: [{id, nickname, avatarUrl}], expiresAt }` 만 전달.
- 정답 id는 서버에만 남긴다(사전 노출 방지).
- 예상 응답: ~500B(JSON) × 1회/일.

### 사전 노출 방지

1. 서버 응답에 `answerId`를 **포함하지 않는다**. 판정은 `checkDailyAnswer` server action.
2. 캐시 키에 날짜가 들어 있으므로 내일 문제는 내일이 되기 전에 생성되지 않는다.
3. `dateStr`은 서버 측 `new Date().toISOString().slice(0,10)`으로 결정(클라이언트가 전달하지 않는다).
4. `checkDailyAnswer`도 서버 날짜를 재산출해 비교하므로, 클라이언트가 날짜를 위조해 제출해도 무효.

---

## 7. 재사용 부품 / 신규 제작 파일 목록

### 재사용

| 부품 | 경로 | 용도 |
|---|---|---|
| 전체화면 껍데기 | `sw/web/src/components/shared/GameFullScreen.tsx` | 게임 프레임 |
| 쉼터 카드 등록 | `sw/web/src/components/features/rest/RestGameGrid.tsx` | `GAME_SECTIONS` 배열에 항목 추가 |
| 캐시 상수 | `packages/shared/src/constants/cache-tags.ts` → `CACHE_TAGS.DIALOGUES` | 무효화 태그 |
| 정적 클라이언트 | `sw/web/src/lib/supabase/static.ts` → `createStaticClient` | 서버 조회 |
| 페이징 | `packages/shared/src/lib/paginate.ts` → `selectAllPages` | 1,000행 상한 돌파 |
| 대사 유틸 | `sw/web/src/lib/utils/celeb-dialogues.ts` → `DIALOGUE_BRIEF_SELECT_WITH_ID` | 명언 추출 |
| localStorage 최고 기록 패턴 | `PortraitGame.tsx` L30·L59·L115 | 동일 패턴 복제 |

### 신규 제작 (경로 제안)

| 파일 | 역할 |
|---|---|
| `sw/web/src/actions/game/getDailyQuestion.ts` | 서버 액션: 날짜 시드 → 문제 생성 + 캐시 |
| `sw/web/src/actions/game/checkDailyAnswer.ts` | 서버 액션: 정답 판정 (날짜 재산출) |
| `sw/web/src/components/features/game/daily/DailyQuestionGame.tsx` | 메인 클라이언트 컴포넌트 |
| `sw/web/src/components/features/game/daily/DailyQuestionLobby.tsx` | 로비(스트릭 표시·시작 버튼) |
| `sw/web/src/components/features/game/daily/DailyQuestionResult.tsx` | 결과·공유 |
| `sw/web/src/components/features/game/daily/types.ts` | 타입·상수 |
| `sw/web/messages/ko/rest.json` 내 `rest.arena.daily` 네임스페이스 | 한국어 문구 |
| `sw/web/messages/en/rest.json` 내 `rest.arena.daily` 네임스페이스 | 영어 문구 |

---

## 8. 공정성·오류 처리

| 상황 | 처리 |
|---|---|
| 명언·초상 로딩 실패 | "오늘의 문제를 불러오지 못했습니다" 메시지. 빈 선택지로 시작하지 않는다. |
| 선택지 초상 로드 실패 | 이름만 표시. 오답 처리하지 않는다. |
| 후보 풀 부족(4명 미만) | 게임 카드를 비활성 표시. 이유를 안내한다. |
| 이미 오늘 풀었는데 재방문 | localStorage 플래그로 감지, 결과 화면 즉시 표시. |
| 브라우저 시각 ≠ 서버 시각 | 서버가 날짜를 결정하므로 영향 없음. 클라이언트는 응답의 `expiresAt`으로 만료 표시. |
| 자정 전후 경계 | 서버 날짜 전환 시 캐시 키가 바뀐다. 클라이언트는 응답에 포함된 `dateStr`과 현재 표시 날짜가 다르면 새로 요청. |

---

## 9. 모바일·접근성

| 기준 | 설계 |
|---|---|
| 320px 완주 | 인용문은 전폭, 선택지는 **2열**(2×2). 이름은 말줄임. |
| 색 외 구분 | 정답=체크마크 아이콘 + 테두리 강조, 오답=×아이콘 + 흐려짐. 색만으로 구분하지 않는다. |
| 키보드 | 숫자키 1~4로 선택. Enter로 결과 화면 닫기. |
| 스크린 리더 | 선택지 버튼에 `aria-label="인물명"`. 판정 후 `aria-live="polite"`로 결과 안내. |
| 진행 막대 | 없음(1문제이므로). 스트릭 수치로 연속 진행도를 시각화. |

---

## 10. i18n 키 계획

`rest.arena.daily` 네임스페이스. ko/en 동시 작성.

| 키 | ko | en |
|---|---|---|
| `label` | 오늘의 한 문제 | Daily Question |
| `description` | 매일 하나, 같은 문제 | One question a day, same for everyone |
| `question` | 이 문장은 누가 한 말일까요? | Who said this? |
| `alreadyPlayed` | 오늘은 이미 풀었습니다 | You already played today |
| `correct` | 정답! | Correct! |
| `incorrect` | 아쉽습니다 | Not quite |
| `answerReveal` | 정답은 {name}입니다 | The answer is {name} |
| `streak` | {count}일 연속 정답 | {count}-day streak |
| `bestStreak` | 최고 연속 기록 {count}일 | Best streak: {count} days |
| `streakBroken` | 연속 기록이 끊겼습니다 | Streak broken |
| `nextQuestion` | 다음 문제까지 {hours}시간 {minutes}분 | Next question in {hours}h {minutes}m |
| `share` | 결과 공유 | Share result |
| `shareText` | 📖 느낌과기록 오늘의 한 문제 — {count}일 연속 정답! | 📖 Feelandnote Daily — {count}-day streak! |
| `shareTextFail` | 📖 느낌과기록 오늘의 한 문제 — 오늘은 틀렸다! | 📖 Feelandnote Daily — missed today! |
| `shareTextFirst` | 📖 느낌과기록 오늘의 한 문제 — 첫 정답! | 📖 Feelandnote Daily — first correct! |
| `loadError` | 오늘의 문제를 불러오지 못했습니다 | Could not load today's question |
| `notEnoughData` | 출제할 수 있는 인물이 부족합니다 | Not enough data to generate a question |

**공유 문구는 정답·인용문을 포함하지 않는다** — 스포일러 방지.

---

## 11. 위험과 미해결

| # | 위험 | 심각도 | 대응 |
|---|---|---|---|
| 1 | O1이 확정되기 전에 O3 착수 불가 | 🔴 | O1 발주서 확정이 선행. O3은 O1의 함수를 호출하는 얇은 층이다 |
| 2 | 날짜 시드가 동일 인물을 반복 출제 | 🟡 | 시드 알고리즘에 최근 N일 출제 이력 배제 로직 필요. 이력은 localStorage 또는 서버 캐시에 보관 |
| 3 | `blind_game_scores` 테이블은 미사용 | 🟡 | 게임 구분 컬럼(`game_type`)이 없다. 서버 저장이 필요해지면 DDL 발주 별건 |
| 4 | 서버 시간대 | 🟡 | Vercel Edge는 UTC. "오늘"을 KST(UTC+9)로 정할지 UTC로 정할지 결정 필요(§13) |
| 5 | 후보 풀 크기 미실측 | 🟡 | 착수 게이트 쿼리(§5) 결과가 200 미만이면 오답 다양성이 부족해 게임 품질 위험 |
| 6 | 캐시 갱신 경계에 두 사람이 다른 문제를 받을 수 있음 | 🟢 | `revalidate=86400` + 태그 무효화 없이 자연 만료이므로 날짜 전환 시 짧은 불일치 가능. 게임 무결성에는 경미 |

---

## 12. 검수 게이트 (납품 조건)

1. `pnpm build:web` 성공.
2. `tsc --noEmit` 에러 0.
3. ko/en 문구 키 수 일치(누락 0).
4. 동일 날짜 시드로 3회 호출 → 동일 문제 반환 확인.
5. 날짜 변경 시(mock) 다른 문제 반환 확인.
6. 정답 id가 클라이언트 응답에 **포함되지 않음** 확인(네트워크 탭 검증).
7. `checkDailyAnswer` 호출 시 서버 날짜 재산출 → 위조 날짜 거부 확인.
8. localStorage 스트릭: 정답 시 +1, 오답 시 0 리셋, 최고 기록 갱신 검증.
9. 이미 푼 날에 재방문 → 결과 화면 즉시 표시 확인.
10. 표본 20문제(날짜 20일분) 사람 통독: 정답 인물과 문장이 실제 일치하는지, 오답 3명이 너무 쉽지 않은지.
11. 모바일 320px에서 선택지 2열이 잘리지 않고 완주 가능.
12. 공유 문구에 정답·인용문 미포함 확인.

---

## 13. 착수 전 사람이 결정해야 하는 항목

| # | 결정 사항 | 선택지 | 추천 |
|---|---|---|---|
| 1 | **기준 시간대** | (A) KST 고정 — 한국 서비스라 자정이 명확 (B) UTC — 글로벌 일관성 (C) 이용자 현지 시각 — 구현 복잡 | **(A) KST 고정** — 이용자 대부분 한국, 기존 `daily_figures`도 KST 크론(실측: `today-figure/route.ts`) |
| 2 | **O1 목소리 재판 확정 대기** | 착수 가능 시점 | O1 발주서 완성 + 서버 액션 인터페이스 합의 후 |
| 3 | **서버 성적 저장 여부** | (A) 1차 localStorage only (B) `blind_game_scores` 확장 | **(A)** — 테이블에 `game_type` 컬럼 추가는 DDL 별건. 1차는 브라우저 전용으로 충분 |
| 4 | **스트릭 리셋 시점** | (A) 오답 즉시 리셋 (B) 하루 안 풀면 리셋 | **(A)** — 단순. "안 풀면 유지"가 합리적(푸는 의무 없음). 안 풀면 스트릭 유지, 틀리면 리셋 |
| 5 | **카드 이미지** | 신규 제작 or 기존 에셋 재활용 | `/images/games/` 내 신규 webp 1장 필요 (로비 카드 배경) |
| 6 | **최근 출제 배제 일수** | 7일 / 14일 / 30일 | 후보 풀 크기에 따라 조정. 풀 500+이면 30일도 가능 |
| 7 | **O3을 공개 카드로 등록하는 시점** | O1과 동시 or 독립 | O1 없이 O3만 낼 수 있음(O3이 자체 출제도 가능). 단 코드 중복 발생 |
