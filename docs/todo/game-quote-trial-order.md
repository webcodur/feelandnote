# 목소리 재판 (Quote Trial) — 개별 발주서

> 🔴 **폐기됨(26.07.31) — 구현하지 마라.** 이 발주서는 자체 착안 1차 후보의 산출물이고, 살아남은 다섯이 결국 모두 「문항 읽고 보기 중에 고르기」로 수렴한 데다 모르면 못 푸는 지식 시험이라 전부 폐기됐다. 대체 결과물은 실존 데일리게임 포맷을 옮긴 7종이며 규격은 `docs/todo/game-wave2-contract.md`가 쥔다. 폐기 사유와 이 문서에서 건져낸 실측 소득은 루트 `game-idea-orders.md` §2에 있다. 이 문서는 축 중복 논증과 데이터 원천 실측 때문에 남겨 둔 것이다.

> **최종 실측 체크: 26.07.31** — 부분 대조: `sw/web/src/types/supabase.ts` (celeb_dialogues Row·profiles Row), `sw/web/src/lib/game/voice/types.ts` (DialogueLines), `sw/web/src/lib/utils/celeb-dialogues.ts` (DIALOGUE_BRIEF_SELECT), `sw/web/src/actions/game/getTrackerRound.ts` (미궁 출제·오답 설계 전문), `sw/web/src/actions/game/getCelebCards.ts` (패권 카드 풀 조회), `sw/web/src/actions/game/getDawnDialogues.ts` (여명 대사 조회), `sw/web/src/components/features/game/TrackerGame.tsx` (미궁 단서 렌더링 확인), `sw/web/src/components/features/game/tracker/CulturalJourneyReveal.tsx`·`TrackerResult.tsx`, `sw/web/src/components/features/rest/RestGameGrid.tsx` (쉼터 카드 등록), `sw/web/src/components/features/game/shared/GameShell.tsx`, `packages/shared/src/constants/cache-tags.ts`, `packages/shared/src/lib/paginate.ts`, `sw/web/src/lib/cache.ts`, `sw/web/messages/ko/rest.json`. **DB 실측 없음** — 건수·분포는 문서 기준이며 착수 전 재실측한다.

---

## 1. 무엇을 하는 게임인가

인물의 얼굴과 이름이 화면에 뜬다. 그 아래 문장 두 개(또는 네 개)가 나타나고, 그중 이 인물이 실제로 남긴 말을 고른다. 정답은 서비스에 등록된 검수 완료 명언이고, 오답은 **다른 인물의 진짜 명언**이다. 문장을 지어내거나 변형하는 것은 절대 금지다. 10문제를 풀고 정답률·연속 정답 기록을 남긴다.

부가 모드 2종(착수 전 유저 결정 필요):
- **빈칸 모드**: 명언의 핵심 단어 하나를 가리고, 보기 3개 중 원래 단어를 고른다.
- **번역 대조 모드**: 영문 문장을 보여주고, 한국어 보기 중 같은 뜻의 문장을 고른다.

---

## 2. 기존 7종과의 축 차이 재검증

### 미궁(LABYRINTH)과 겹치는가?

코드 근거로 논증한다.

| 비교 축 | 미궁 | 목소리 재판 |
|---------|------|-------------|
| **주어진 것** | 이름을 가린 텍스트 단서(감상문·감상 여정) | 인물의 이름·얼굴(공개) |
| **맞히는 것** | 6명 후보 중 **누구**인가 | 2~4개 문장 중 **어떤 말**이 이 사람 것인가 |
| **단서 원천** | `user_contents.review` + `culturalJourney` (stage 1-5) | `celeb_dialogues.lines->quote` (명언 텍스트 자체) |
| **이름 마스킹** | `censorName`으로 인물명 블라인드 처리 | 인물명을 오히려 정답 선택의 기준으로 노출 |
| **판정 구조** | 5단계 해금 → 최종 인물 지목 (추리) | 매 문제 독립 선택 (지식·감각) |

**실측 확인**: `TrackerGame.tsx`에서 `round.quotes`는 데이터에 포함되지만 **게임 단서로 렌더되지 않는다** (grep 결과 `round.quotes` 참조 0건). 미궁의 플레이어는 명언을 보지 못한다. 따라서 명언 진위 판별은 미궁과 **축이 겹치지 않는다.**

### 다른 게임과의 차이

| 게임 | 차이 |
|------|------|
| 여명(DAWN) | 출생년도 순서 맞추기 — 텍스트 판별 요소 없음 |
| 패권(HEGEMONY) | 카드 상성 전투 — 명언은 카드 장식이지 판정 대상이 아님 |
| 천도(CHEONDO) | 경영 시뮬 — 장르 자체가 다름 |
| 시대의 초상 | 흐려진 사진 식별 — 시각 인식 vs 텍스트 인식 |

**판정: 축 중복 없음. 발주 진행.**

---

## 3. 한 판 완주 흐름

1. 쉼터 카드를 눌러 진입. 전체화면(`GameShell`) 전환.
2. 로비에서 난이도(2지선다 / 4지선다)를 고르고 시작 버튼.
3. 서버가 10문제 묶음을 한 번에 조회해 클라이언트에 전달.
4. 매 문제마다:
   - 인물 아바타·이름·수식어 표시.
   - 보기 문장 2개(또는 4개) 표시. 보기 순서는 랜덤.
   - 제한시간 15초 카운트다운.
   - 플레이어가 선택하면 정오답 즉시 표시 + 정답 문장의 주인공 표기.
   - 시간 초과 시 "시간 초과"로 오답 처리하되, 정답을 공개한다.
5. 10문제 완료 후 결과 화면: 정답 수 / 10, 연속 정답, 최고 기록.
6. "다시" 또는 "나가기" 선택.

---

## 4. 출제·채점 규칙

| 항목 | 값 |
|------|-----|
| 한 판 문제 수 | 10 |
| 보기 수 (기본) | 2 (어려움 모드: 4) |
| 제한시간 | 15초/문제 |
| 정답 배점 | 기본 100점. 5초 이내 답변 시 +50 보너스 |
| 오답·시간초과 | 0점 |
| 연속 보너스 | 3연속부터 ×1.5 (5연속 ×2.0, 10연속 ×3.0) |
| 만점 | 이론 최대 3,000점 (전부 5초 이내 + 10연속) |
| 힌트 | 없음 (출제 자체가 난이도 조절) |

### 출제 조건

- **정답 후보**: `lines->quote`가 빈 문자열이 아니고 null이 아닌 인물만.
- **오답 후보**: 정답 인물과 **다른 인물**의 `lines->quote`(역시 빈 문자열 제외).
- **오답 난이도 설계**: 정답 인물과 같은 `profession` 또는 같은 시대(생년 ±150년) 내에서 우선 추출. 해당 풀이 부족하면 전체에서 랜덤.
- **중복 방지**: 한 판 10문제에서 같은 인물이 정답으로 두 번 나오지 않는다. 오답 문장도 한 판 내에서 중복 사용하지 않는다.
- **퍼블릭 도메인 제한 없음**: 미궁·패권과 달리 현대 인물도 출제한다(명언은 인용이지 초상이 아니므로 저작인격권 문제 없음).

---

## 5. 데이터 원천 표

| 용도 | 테이블 | 컬럼 | 실측 근거 | 결측 위험 |
|------|--------|------|-----------|-----------|
| 정답 명언 (한국어) | `celeb_dialogues` | `lines->quote` (JSON path) | `celeb-dialogues.ts` DIALOGUE_BRIEF_SELECT 실측 | 빈 문자열 존재 (AGENTS.md: "빈 문자열 제외 필수") |
| 정답 명언 (영어) | `celeb_dialogues` | `lines_en->quote` (JSON path) | 동일 | 영문 명언 미번역 0명(26.07.16 완료) — 그러나 빈 문자열은 별개 |
| 인물 이름 | `profiles` | `nickname`, `nickname_en` | supabase.ts Row 실측 | null 가능 |
| 인물 수식어 | `profiles` | `title`, `title_en` | supabase.ts Row 실측 | null 가능 |
| 인물 아바타 | `profiles` | `avatar_url` | supabase.ts Row 실측 | null 가능 (아바타 미등록) |
| 직군 (오답 난이도) | `profiles` | `profession` | supabase.ts Row 실측: `string \| null` | null이면 `'other'` 취급 |
| 생년 (오답 난이도) | `profiles` | `birth_date` | supabase.ts Row 실측: `string \| null` | null이면 시대 매칭 포기, 랜덤 |
| 활성 상태 | `profiles` | `status`, `profile_type` | 기존 게임 조회에서 `.eq("status","active").eq("profile_type","CELEB")` 패턴 실측 | — |

### 착수 전 실측 게이트 (DB 접속 필요)

```sql
-- 1. 명언 보유 인물 수 (출제 풀 크기)
SELECT count(*) FROM celeb_dialogues
WHERE lines->>'quote' IS NOT NULL AND lines->>'quote' != '';

-- 2. 직군별 분포 (오답 풀 충분성)
SELECT p.profession, count(*)
FROM celeb_dialogues cd
JOIN profiles p ON p.id = cd.celeb_id
WHERE p.status = 'active' AND p.profile_type = 'CELEB'
  AND cd.lines->>'quote' IS NOT NULL AND cd.lines->>'quote' != ''
GROUP BY p.profession ORDER BY count(*) DESC;

-- 3. 영문 명언 보유 인물 수 (번역 대조 모드 성립 조건)
SELECT count(*) FROM celeb_dialogues
WHERE lines_en->>'quote' IS NOT NULL AND lines_en->>'quote' != '';
```

**최소 성립 조건**: 명언 보유 인물 50명 이상(10문제 × 5배 풀). 문서 기준 1,411쌍이므로 충족 가능성 높으나, 빈 문자열 제외 후 실측이 필요하다.

---

## 6. 조회 설계

### 전체 풀 조회 (서버 캐시, 한 판 시작 시 사용)

```
캐시 키: ["quote-trial-pool"]
태그: [CACHE_TAGS.CELEBS, CACHE_TAGS.DIALOGUES]
revalidate: STATIC_REVALIDATE (7일)
```

**조회 전략**: 명언 보유 인물은 약 1,400명으로 추정되며 1,000행 상한에 걸린다. `selectAllPages`로 분할 조회한다. 정렬키는 `celeb_id` (유일키, 1:1 테이블).

**select 필드 (egress 최소화)**:
```
celeb_dialogues: celeb_id, quote:lines->quote, quote_en:lines_en->quote
profiles (join): nickname, nickname_en, title, title_en, avatar_url, profession, birth_date
```

대사 전문(`lines` JSONB 통째)을 가져오지 않는다. JSON path로 `quote` 키만 추출한다 — 기존 `DIALOGUE_BRIEF_SELECT_WITH_ID` 패턴과 동일.

### 한 판 출제 (클라이언트 진입 시 1회)

서버 액션이 캐시된 풀에서 10문제를 뽑아 반환한다. 반환 페이로드:

```ts
interface QuoteTrialRound {
  questions: QuoteTrialQuestion[]; // 10개
}
interface QuoteTrialQuestion {
  celebId: string;
  nickname: string;
  title: string | null;
  avatarUrl: string | null;
  choices: QuoteTrialChoice[]; // 2 또는 4개
  correctIndex: number; // 서버가 셔플 후 정답 위치
}
interface QuoteTrialChoice {
  text: string;
  authorNickname: string; // 정오답 공개 시 표시
}
```

**전송량 추정**: 10문제 × (인물 메타 ~200B + 선택지 4개 × ~150B) ≈ **8KB** (gzip 후 ~3KB). egress 부담 무시 가능.

### 1,000행 상한 대응

- 풀 조회: `selectAllPages` 사용 (2차 정렬키 `celeb_id`).
- 출제 시 `in()` 호출 없음 — 캐시된 풀에서 인메모리 필터. URL 길이 문제 불발.

---

## 7. 재사용 부품 / 신규 제작 파일 목록

### 재사용

| 부품 | 경로 (실측) | 용도 |
|------|-------------|------|
| 전체화면 래퍼 | `sw/web/src/components/features/game/shared/GameShell.tsx` | 진입·전체화면·로비/게임 전환 |
| 쉼터 카드 등록 | `sw/web/src/components/features/rest/RestGameGrid.tsx` | 카드 추가 |
| 캐시 유틸 | `packages/shared/src/lib/paginate.ts` (`selectAllPages`) | 풀 조회 |
| 정적 Supabase 클라이언트 | `sw/web/src/lib/supabase/static.ts` (`createStaticClient`) | 서버 조회 |
| 캐시 태그 | `packages/shared/src/constants/cache-tags.ts` | `CELEBS`, `DIALOGUES` |
| 명언 JSON path select | `sw/web/src/lib/utils/celeb-dialogues.ts` | `DIALOGUE_BRIEF_SELECT_WITH_ID` 패턴 참조 |
| i18n 문구 | `sw/web/messages/{ko,en}/rest.json` | 게임 문구 추가 |

### 신규 제작 (경로 제안)

| 파일 | 경로 제안 | 역할 |
|------|-----------|------|
| 서버 액션 (풀 조회 + 출제) | `sw/web/src/actions/game/getQuoteTrialRound.ts` | 10문제 생성·반환 |
| 게임 컴포넌트 | `sw/web/src/components/features/game/quote-trial/QuoteTrialGame.tsx` | 게임 로직·UI |
| 로비 | `sw/web/src/components/features/game/quote-trial/QuoteTrialLobby.tsx` | 난이도 선택 |
| 결과 화면 | `sw/web/src/components/features/game/quote-trial/QuoteTrialResult.tsx` | 점수·기록 |
| 문제 카드 | `sw/web/src/components/features/game/quote-trial/QuestionCard.tsx` | 단일 문제 렌더 |
| 배경 | `sw/web/src/components/features/game/quote-trial/QuoteTrialBackground.tsx` | 분위기 배경 |
| 타입 | `sw/web/src/components/features/game/quote-trial/types.ts` | 인터페이스 |
| GameShell 래퍼 | `sw/web/src/components/features/game/quote-trial/QuoteTrialShell.tsx` | GameShell config 조립 |
| 카드 이미지 | `sw/web/public/images/games/quote-trial-card.webp` | 쉼터 카드 배경 |

---

## 8. 공정성·오류 처리

| 상황 | 처리 |
|------|------|
| 풀 조회 실패 | 에러를 사용자에게 표시("문제를 불러오지 못했습니다"). 빈 목록으로 조용히 시작하지 않는다 |
| 아바타 로딩 실패 | 기본 실루엣 아이콘 대체. 문제 진행은 중단하지 않는다 |
| 명언 텍스트가 빈 문자열 | 풀에서 사전 제외 (출제 조건). 만약 런타임에 발견되면 해당 문제 스킵 + "문제 준비 중" 표시 |
| 풀 부족 (10문제 구성 불가) | 가능한 수만큼 출제하고 "문제가 부족합니다" 안내 |
| 타이머 시작 전 자산 미로딩 | **타이머는 모든 선택지 텍스트가 렌더된 후에 시작한다.** 로딩 중 입력을 받지 않는다 |
| 동일 인물이 정답+오답 후보에 동시 등장 | 출제 로직에서 정답 인물의 명언은 오답 풀에서 제외 |

---

## 9. 모바일·접근성

| 항목 | 사양 |
|------|------|
| 최소 너비 | 320px에서 완주 가능 |
| 선택지 배치 | 2지선다: 세로 1열 (터치 영역 48px 이상). 4지선다: 세로 1열 또는 2×2 그리드 (320px에서는 1열 폴백) |
| 정오답 구분 | 색(초록/빨강) **+ 아이콘**(✓ / ✗) + `aria-label` 텍스트. 색각 이상자 대응 |
| 진행 막대 | 상단에 10칸 중 현재 위치. `role="progressbar"` + `aria-valuenow`/`aria-valuemax` |
| 타이머 | 시각적 감소 바 + 남은 초 숫자 + `aria-live="polite"` (5초 미만일 때 알림) |
| 키보드 | 숫자키 1-4로 선택. Enter로 다음 문제. Tab 이동 지원 |
| 화면 낭독기 | 문제: "OOO의 명언을 고르시오". 선택지: 순서+텍스트. 결과: 정답/오답+정답 문장 읽기 |
| 즉각 반응 | 선택지 hover 시 테두리 색 즉시 변경 (`transition` 없음). 배경 확대는 별도 엘리먼트에서 `transition-transform` |

---

## 10. i18n 키 계획

`sw/web/messages/{ko,en}/rest.json` 내 `rest.arena.quoteTrial` 네임스페이스.

| 키 | ko | en |
|----|----|----|
| `label` | 목소리 재판 | Quote Trial |
| `description` | 이 인물이 진짜 남긴 말은? | Which quote truly belongs to this person? |
| `intro` | 인물의 이름과 얼굴이 공개됩니다. 보기 중 이 인물이 실제로 남긴 명언을 고르세요. | You'll see a person's name and face. Pick the quote that actually belongs to them. |
| `startGame` | 재판 시작 | Start Trial |
| `difficulty.easy` | 2지선다 | 2 choices |
| `difficulty.hard` | 4지선다 | 4 choices |
| `timer.expired` | 시간 초과 | Time's up |
| `result.score` | 점수 {score}점 | Score: {score} |
| `result.streak` | 최대 연속 {streak} | Best streak: {streak} |
| `result.perfect` | 만점! | Perfect! |
| `question.prompt` | 이 인물의 명언은? | Which is this person's quote? |
| `question.saidBy` | — {name} | — {name} |
| `question.round` | {current} / {total} | {current} / {total} |
| `error.loadFailed` | 문제를 불러오지 못했습니다 | Failed to load questions |
| `error.poolInsufficient` | 문제가 부족합니다 | Not enough questions available |
| `retry` | 다시 하기 | Retry |
| `exit` | 나가기 | Exit |

빈칸·번역 모드 키는 해당 모드 확정 시 추가한다(§13 참조).

---

## 11. 위험과 미해결

| # | 위험 | 영향 | 대응 |
|---|------|------|------|
| 1 | 명언 풀이 예상보다 작다 (빈 문자열 제외 후) | 10문제 구성이 불가능하거나 반복이 잦다 | 착수 게이트 SQL로 사전 실측. 최소 50명 미달 시 발주 재검토 |
| 2 | 특정 직군(예: 군인)에 명언 보유 인물이 2명 미만 | 같은 직군 오답이 불가하면 난이도 균형 붕괴 | 직군 풀 부족 시 시대 매칭으로 폴백, 그래도 부족 시 전체 랜덤 |
| 3 | 명언이 매우 짧아 구분 불가 ("나는 생각한다" 수준) | 정오답 구분이 운에 의존 | 최소 길이 필터(10자 이상)를 출제 조건에 추가 검토 |
| 4 | 같은 인물의 명언이 다른 인물에게 오귀속된 채 DB에 남아 있을 가능성 | 정답이 둘일 수 있다 | 26.07.16 전수 감사 완료됐으나, 신규 인물은 검수가 선행 조건 |
| 5 | `web types/supabase.ts`에 `celeb_dialogues` Row가 `lines: Json`으로만 되어 있어 JSON path 반환 타입이 `unknown` | 타입 안전성 저하 | `overrideTypes` 또는 `as` 캐스팅 사용 (기존 `getTrackerRound.ts` 패턴 답습) |
| 6 | 빈칸 모드의 "핵심 단어" 선정 기준이 자의적 | 형태소 분석기 필요? 유지보수 부담 | §13에서 유저 결정 대기. 초기 범위에서 제외 가능 |
| 7 | 번역 대조 모드에서 한·영 문장이 직역이 아닌 경우(프로젝트 원칙: "번역이 아니라 같은 사람이 다시 쓴 것") | 정답 판정이 애매해질 수 있다 | 이 모드는 명언(`quote`)에만 적용 — 명언은 원문 인용이므로 번역 스타일 문제 없음. 단 실측 필요 |

---

## 12. 검수 게이트 (납품 조건)

상위 발주서(`game-idea-orders.md`) §7 공통 조건에 더해:

| # | 조건 | 검증 방법 |
|---|------|-----------|
| 1 | `tsc --noEmit` 에러 0 | CI |
| 2 | 변경 범위 `eslint` + `git diff --check` 통과 | CI |
| 3 | `pnpm build:web` 성공 | 빌드 |
| 4 | ko/en 문구 키 수 일치 (누락 0) | 스크립트 또는 수동 대조 |
| 5 | 출제 엔진 회귀 8회 완주 — 빈 문제 0, 중복 정답 0, 후보 부족 0 | 단위 테스트 또는 스크립트 |
| 6 | 표본 20문제 사람 통독 — 답이 새는 문제·시시한 오답·출처 불분명 명언 0 | 수동 |
| 7 | 실 DB + 브라우저 1판 완주 | 수동. 환경변수 부재 시 미검증으로 보고 |
| 8 | 오답이 정답 인물과 **다른 인물**의 진본 명언임을 로직으로 보장 | 코드 리뷰 |
| 9 | 빈 문자열 명언이 선택지에 출현하지 않음 | 단위 테스트 |
| 10 | 320px 뷰포트에서 모든 선택지 텍스트가 잘리지 않고 스크롤 없이 읽힘 | 수동 QA |

---

## 13. 착수 전 사람이 결정해야 하는 항목

| # | 질문 | 선택지 | 기본값 제안 |
|---|------|--------|-------------|
| 1 | 빈칸 모드를 초기 범위에 포함할 것인가? | 포함 / 후속 | **후속** — 핵심 단어 선정 로직이 추가 설계 필요 |
| 2 | 번역 대조 모드를 초기 범위에 포함할 것인가? | 포함 / 후속 | **후속** — 한·영 명언 대응 품질 실측이 선행 |
| 3 | 쉼터 카드 이미지 발주를 별도로 하는가? | 별도 / 개발자가 임시 제작 | 별도 발주 (game-card-images.md 패턴) |
| 4 | 게임 이름 최종 확정 | "목소리 재판" / "명언 법정" / 기타 | 목소리 재판 |
| 5 | 점수 저장을 어디에 하는가? | localStorage / `blind_game_scores` 테이블(컬럼 추가) / 신규 테이블 | **localStorage** — `blind_game_scores`는 게임 구분 컬럼이 없고 코드 참조 0건이라 쓰려면 마이그레이션 필요 |
| 6 | 명언 최소 길이 필터를 몇 자로 할 것인가? | 10자 / 15자 / 제한 없음 | 10자 |
| 7 | 현대 인물(1920년 이후 사망·생존)도 출제 대상인가? | 포함 / 퍼블릭 도메인만 | **포함** — 명언 인용은 초상과 달리 법적 제한 없음 |

---

## 부록: 축 중복 상세 논증

미궁의 `getTrackerRound.ts`에서 `chosenQuote`는 다음과 같이 사용된다:

```ts
quotes: quotes ? censorName(quotes, nickname, safeWords) : null,
```

이 값은 `TrackerRound.quotes`로 클라이언트에 전달되지만, `TrackerGame.tsx`에서 **화면에 렌더되는 곳이 없다** (stage1-4는 `ContentReveal`=감상문, stage5는 `CulturalJourneyReveal`=감상여정). `quotes` 필드는 장래 확장을 위해 데이터에 포함되어 있을 뿐, 현재 미궁의 플레이어는 명언을 **한 번도 보지 못한다.**

따라서:
- 미궁 = "이름 모르는 인물의 감상문·여정을 읽고 → 누구인가?" (추리)
- 목소리 재판 = "이름 아는 인물의 명언 후보를 읽고 → 어떤 말이 진짜인가?" (판별)

인풋(주어지는 것)과 아웃풋(맞히는 것)이 모두 반대이므로, 같은 데이터 테이블(`celeb_dialogues`)을 쓰더라도 놀이 경험은 완전히 다르다.
