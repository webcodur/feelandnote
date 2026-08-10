# 가림 해제 (Redact) — 발주서

> **최종 실측 체크: 26.07.31** — 부분 대조: `getTrackerRound.ts`(censorName 로직·safeWords 보호), `proximity/` 전체(게임 구조 패턴), `i18n/request.ts`(네임스페이스 등록 확인), `messages/ko/core.json`(shared.game 키), 현재 `celebs`로 이관된 bio 컬럼(코드 내 사용 확인). DB 실측 없음.

---

## 무엇을 하는 게임인가

어떤 인물의 소개글이 통째로 가려져 있다. 단어를 하나 추측하면, 그 단어가 포함된 모든 어절이 본문 전체에서 한꺼번에 드러난다. 드러난 조각을 이어 읽으며 "이 글이 누구를 말하는지"를 알아맞힌다.

이름은 영구적으로 가려져 있어서, 본문 안에서 직접 읽을 수 없다. 열린 단서를 종합하여 정체를 추론해야 한다. "단어 탐색"과 "정체 맞히기"를 자유롭게 오가며 진행한다.

---

## 기존 게임과의 축 차이

| 게임 | 핵심 축 | 차이 |
|------|---------|------|
| 미궁(tracker) | 콘텐츠 감상·퀴즈 | 단서를 출제자가 주고 4지선다 |
| 근접도(proximity) | 벡터 거리 | 추측 → 온도 피드백 → 좁힘 |
| 교차 격자(grid) | 조건 교차 | 행·열 조건을 동시에 만족하는 인물 |
| **가림 해제(redact)** | **텍스트 마이닝** | 유저가 단어를 던져 본문을 캐낸다. 단서 생산 자체가 유저의 행위 |

다른 게임은 "누구인지" 추론하는 데 외부 단서(온도·조건)를 주지만, 가림 해제는 텍스트 자체가 수수께끼이고 유저가 능동적으로 내용을 발굴한다.

---

## 한 판 완주 흐름

1. **게임 시작** — 가려진 본문이 즉시 표시된다 (별도 로비 없이 바로 진입).
2. **단어 추측** — 입력창에 단어를 치면 해당 어절이 전역 공개. 이력에 적중 수가 표시된다.
3. **힌트 사용** — 직군·시대·국적 힌트를 선택 사용 (한 번 쓰면 소멸).
4. **정체 맞히기** — 언제든 "정체 맞히기" 모드로 전환하여 인물 이름을 입력. 정답이면 승리, 오답이면 추측 1회 소모.
5. **종료** — 정답 시 "승리", 30회 소진 시 "패배", 포기 시 "패배". 정답 인물 공개.

---

## 출제·채점 규칙

| 항목 | 값 |
|------|-----|
| 최대 추측 횟수 | 30회 (단어 추측 + 정체 오답 합산) |
| 최소 입력 길이 | 2글자 (1글자 추측은 무시) |
| 매칭 방식 | 어절의 어근(조사·어미 제거)과 입력의 정규화를 포함 비교 |
| 기능어 자동 공개 | 1글자 어절 + 한국어 접속사·지시어 19종 |
| 이름 가림 | 닉네임 토큰(2글자+)을 본문에서 정규식 치환 → 영구 블록 |
| 힌트 | 직군·시대·국적 각 1회, 총 3종 |
| 중복 추측 방지 | 같은 단어 재입력 시 무시 (횟수 미소모) |
| 정답 판정 | 입력 이름의 공백 제거·소문자화와 정답의 동일 처리가 일치하면 승리 |
| 포기 | 언제든 가능. 결과 화면에 정답 공개 |

---

## 데이터 원천 표

| 테이블 | 컬럼 | 용도 |
|--------|------|------|
| `celebs` | `id`, `nickname`, `nickname_en`, `profession`, `nationality`, `birth_date`, `death_date`, `avatar_url`, `bio`, `bio_en` | 인물 메타 + 소개글 본문 |

### 본문 원천 판단

- **bio(소개글)를 사용한다.** 3인칭 서술 + 사실 기반 + 이름이 자연스럽게 빠져 있거나 1~2회만 등장하여 마스킹이 안전하다.
- **virtual_monologue(1인칭 독백)는 사용하지 않는다.** 1인칭이라 "나는 ~를 했다" 형태로 정체 특정이 너무 쉬워 게임이 성립하기 어렵다. 또한 독백은 감정·주관이 주이므로 단어 추측 재미(사실 파편 조립)가 떨어진다.

---

## 조회 설계

- **엔드포인트**: `actions/game/redact.ts` — `getRedactRound()`
- **페이징**: `selectAllPages` + `id` 정렬 (PostgREST 1,000행 상한 대응)
- **캐시**: `unstable_cache` + `CACHE_TAGS.CELEBS` + `STATIC_REVALIDATE`(7일)
- **필터**: `publication_status = 'active'`, `celeb_tier in ('full', 'light')`, `bio IS NOT NULL`, bio 80글자 이상
- **이름 마스킹**: 서버 측에서 `censorNameForRedact` 적용 후 전달 (클라이언트에 원문 노출 없음)
- **랜덤 선정**: 캐시된 후보 풀에서 `Math.random()` 선택 (일일 시드 미적용 — 매 라운드 새 인물)

---

## 파일 목록

| 경로 | 역할 |
|------|------|
| `sw/web/src/actions/game/redact.ts` | 서버 조회 + 이름 마스킹 |
| `sw/web/src/components/features/game/redact/types.ts` | 타입·상수 정의 |
| `sw/web/src/components/features/game/redact/engine.ts` | 토큰화·추측 처리·힌트 로직 |
| `sw/web/src/components/features/game/redact/fixture.ts` | 체험 표본 10명 + 마스킹 적용 |
| `sw/web/src/components/features/game/redact/RedactGame.tsx` | 메인 게임 오케스트레이터 |
| `sw/web/src/components/features/game/redact/RedactGameClient.tsx` | 클라이언트 래퍼 (라운드 전환) |
| `sw/web/src/components/features/game/redact/RedactTextDisplay.tsx` | 가려진 본문 표시 |
| `sw/web/src/components/features/game/redact/RedactGuessInput.tsx` | 입력 컴포넌트 |
| `sw/web/src/components/features/game/redact/RedactGuessList.tsx` | 추측 이력 표시 |
| `sw/web/src/components/features/game/redact/RedactResult.tsx` | 결과 화면 |
| `sw/web/src/app/[locale]/lab/games/redact/page.tsx` | 단독 시험 진입점 |
| `sw/web/messages/ko/game-redact.json` | 한국어 문구 |
| `sw/web/messages/en/game-redact.json` | 영어 문구 |

---

## 공정성·오류 처리

### 정체 유출 방지
- 이름 토큰(2글자+)을 정규식으로 본문에서 치환 (`■■■`). 서버 측 처리라 원문이 클라이언트에 도달하지 않는다.
- 기존 `getTrackerRound.ts`의 `censorName` 로직을 참고·재구현. 1글자 토큰은 오탐 위험으로 제외.
- 체험 표본의 bio는 의도적으로 3인칭 서술이라 이름이 거의 등장하지 않는다.

### 기능어 처리 (한국어 적응)
- **어절 단위(공백 기준 분할)** 를 채택. 형태소 단위보다 일관되고 형태소 분석기 의존이 없다.
- 매칭 시 한국어 접미사(조사·어미)를 제거한 어근으로 비교 → "물리"로 "물리학자이자"도 열린다.
- 1글자 어절 + 접속사·지시어(19종)는 게임 시작 시 자동 공개 → 조사만 맞히는 허무함 방지.

### 오류 처리
- DB 실패 시 체험 표본 전환 + 배너 표시 (조용한 폴백 금지).
- 후보 0명 시 명시적 에러 throw.
- 중복 추측 무시 (횟수 미소모).
- 2글자 미만 입력 무시.

---

## 모바일·접근성

- 320px 폭에서 완주 가능. 본문 영역은 `flex-wrap`으로 어절 자동 줄바꿈.
- 가림 블록은 `aria-hidden` 처리, 전체 영역에 `role="region"` + `aria-label`.
- 정오답을 색만으로 구분하지 않음: ✓ 아이콘(적중) + ✗ 아이콘(빗나감) 병기.
- 추측 이력에 `role="log"`.
- 입력 `autoFocus` + 제출 후 자동 포커스 유지.
- 조작 요소: hover 시 `border-white/25` 즉각 전환 (transition 없음). 클릭 시 `active:scale[0.98]`.

---

## 문구 키

| 키 | 용도 |
|---|---|
| `gameRedact.title` | 게임 이름 |
| `gameRedact.playing` | 브레드크럼 "추측 중" |
| `gameRedact.intro` | 규칙 설명 |
| `gameRedact.startGame` | 시작 버튼 |
| `gameRedact.guessPlaceholder` | 단어 입력 안내 |
| `gameRedact.identityPlaceholder` | 정체 입력 안내 |
| `gameRedact.identityGuessPrompt` | 정체 모드 안내 |
| `gameRedact.guessIdentity` | 정체 맞히기 버튼 |
| `gameRedact.backToWordGuess` | 단어 모드 복귀 |
| `gameRedact.guessCounter` | 추측 횟수 표시 |
| `gameRedact.revealedRatio` | 공개율 표시 |
| `gameRedact.giveUp` | 포기 버튼 |
| `gameRedact.guessHistory` | 이력 제목 |
| `gameRedact.hits` | 적중 표시 |
| `gameRedact.miss` | 빗나감 표시 |
| `gameRedact.fixtureNotice` | 체험 모드 배너 |
| `gameRedact.hint.*` | 힌트 관련 (6키) |
| `gameRedact.result.*` | 결과 화면 (7키) |

한·영 파일 키 수 일치: 각 33개 quoted string.

---

## 위험과 미해결

1. **bio가 너무 짧은 인물** — 80글자 미만은 필터로 제외했으나, 80~150글자도 단서가 빈약할 수 있다. 실서비스에서 최소 길이를 올릴 수 있다.
2. **이름이 일반 단어에 포함되는 인물** — "이"(이순신의 성)는 1글자라 제외했지만, 2글자 이상이면서 일반 어휘인 이름(예: "한비")은 오가림 위험. `safeWords` 보호 레이어를 추가할 수 있다.
3. **영어 모드** — 현재 bio_en은 있으나 영어는 Redactle 원본과 거의 같은 방식(단어 단위)이 자연스럽다. 현재 코드는 한국어에 최적화된 어근 매칭을 쓰는데, 영어에서는 stemming이 더 나을 수 있다. 후속 개선 대상.
4. **일일 라운드** — 현재는 매번 랜덤. 일일 고정(모든 유저가 같은 인물)으로 전환하려면 시드 로직 추가 필요.
5. **virtual_monologue 미사용** — 1인칭 독백은 정체 특정이 너무 쉬워 현재 배제. 향후 "어려움" 모드(bio)와 "쉬움" 모드(독백)로 분리할 수 있다.

---

## 남은 결정 사항

1. 일일 고정 vs 무작위 — 현재는 무작위. 소셜 공유("몇 회만에 맞췄다!")를 넣으려면 일일 고정이 필요하다.
2. bio 최소 길이 상향 — 80글자를 더 높일지.
3. 영어 모드 어근 매칭 — 현재 한국어 전용 접미사 제거만 있다. 영어권 유저에게는 별도 로직이 필요할 수 있다.
4. 힌트 패널티 — 현재 힌트 사용에 추측 횟수 소모 없음. 소모하게 할지.
5. 쉼터 카드 등록 — 통합 담당이 처리.
