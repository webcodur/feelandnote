# Speech 실행 파이프라인

무엇을 쓸지는 [`celeb-speech.md`](celeb-speech.md)가 쥔다. 이 문서는 **그것을 어떤 순서로 어떤 도구로 실행하는지**만 쥔다.

```
1 대상 선별 → 2 자료 회수 → 3 최소 입력 작성 → 4 패치 조립 → 5 반영
   스크립트        스크립트        사람 판단        스크립트      스크립트
```

임계값(한마디·상황별 대사 상한, 상황 키, 개수)은 `sw/web-bo/scripts/lib/celeb-speech-research.ts`의 상수가 SSoT다. 이 문서와 룰북은 숫자를 복제하지 않는다.

---

## 0. 준비

| 항목 | 값 |
|---|---|
| 실행 위치 | `sw/web-bo` |
| 필요한 키 | `.env`의 `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` |
| 중간 산출물 | `sw/web-bo/.tmp-celeb-fill/` (`.tmp-*`는 git 추적 밖) |

중간 산출물은 배치가 끝나면 지운다. 완료 보고서나 진행 문서로 보존하지 않는다.

---

## 1. 대상 선별

```bash
pnpm celeb:speech:1-targets --current-dialogue-batch --include-placeholders --include-quote-blanks \
  --out .tmp-celeb-fill/targets.json
```

| 옵션 | 고르는 대상 |
|---|---|
| `--current-dialogue-batch` | 한국어 21개는 있고 영문이 빈 사람 |
| `--include-placeholders` | 한마디가 자리 표시 값인 사람 (재조사 대상) |
| `--include-quote-blanks` | 한마디가 비어 있는 사람 |

출력에는 각자의 현재 `lines` 해시가 함께 담긴다. 다만 **4단계가 DB에서 해시를 다시 계산**하므로 이 값은 참고용이다. 손으로 옮겨 적지 않는다.

> 남은 인원을 직접 세어야 할 때는 PostgREST 응답이 **1000행에서 잘린다**는 점을 기억한다. `offset`으로 넘기지 않으면 "결손 780명" 같은 허수가 나온다.

---

## 2. 자료 회수

```bash
pnpm celeb:speech:2-collect probe   "Steven Bartlett"
pnpm celeb:speech:2-collect extract "https://..."
pnpm celeb:speech:2-collect verify  "https://..." "확인할 문장"
```

| 하위 명령 | 하는 일 |
|---|---|
| `probe` | 위키백과 신원 + 위키인용 후보 + 구텐베르크 본인 저서의 1인칭 문장 |
| `extract` | 본문에서 따옴표 직접 인용문을 뽑는다. 0건이면 1인칭 평문을 대신 보여 준다 |
| `verify` | 그 문장이 본문에 실제로 있는지 대조한다 |

### 2.1 막힌 호스트 우회

WAF가 막으면 `HTTP 403`으로 끊긴다. 별도 회수기로 페이지를 파일에 저장한 뒤 같은 추출기에 그대로 태운다.

```bash
pnpm celeb:speech:2-collect extract --file .tmp-celeb-fill/dump.html --url "https://원본주소"
```

`--url`은 기록용이므로 생략해도 동작한다. 우회로 받은 자료라는 사실은 3단계 `inspected`의 확인 내용에 적는다.

### 2.2 어떤 경로가 잘 들었나

인플루언서 89명을 채우며 실제로 통한 순서다. 위에서부터 시도한다.

| 순위 | 경로 | 강점 |
|---:|---|---|
| 1 | 화자 이름이 붙은 대담 전사 | 진행자와 발언이 갈려 있어 귀속이 깨끗하다 |
| 2 | 1인 문답 형식 글 인터뷰 | 질문은 매체, 답은 본인. 인용이 한 번에 여러 건 나온다 |
| 3 | 공식 기록 보관처 발언 전문 | 정부·기관 아카이브. 전문이 통째로 남는다 |
| 4 | 모국어 매체·백과 원문 | 영어권에서 안 나오는 사람은 여기서 나온다 |
| 5 | 영상 자막 | 수동 자막만 쓴다. 자동 자막은 쓰지 않는다 |

**영상형 인물이라고 자막부터 뒤지지 않는다.** "영상만 있어 불가"로 분류했던 6명 중 5명이 1·2번 경로에서 풀렸다.

### 2.3 귀속 판별

추출기는 1인칭 문장을 모아 줄 뿐 **누가 말했는지는 판정하지 않는다.** 다음을 사람이 확인한다.

- 다화자 전사에서 진행자·트레이너·가족의 1인칭이 섞인다. 인용 앞뒤에 그가 말했다는 표기가 있는지 본다.
- 표기가 없으면 그 사람만 할 수 있는 내용인지로 좁히고, 무엇을 근거로 골랐는지 `inspected`에 적는다.
- 검색 요약에 있던 문장이라도 **본문에서 확인되지 않으면 쓰지 않는다.**
- 후보 목록 위쪽 몇 줄만 보고 "쓸 게 없다"고 접지 않는다. 이미 연 자료를 다시 훑어 풀린 사례가 네 건이다.

---

## 3. 최소 입력 작성

사람이 쓰는 것은 판단이 든 값뿐이다. 스키마 뼈대·출처 배선·해시는 4단계가 만든다.

```json
{
  "slug": "steven-bartlett",
  "tone": "composed",
  "wiki": "Steven_Bartlett_(businessman)",
  "identity": "한국어 신원 한 줄",
  "quote_ko": "...", "quote_en": "...", "quote_src": "https://...",
  "facts":     [["한국어 사실", "https://..."]],
  "anchors":   ["...", "...", "..."],
  "queries":   ["...", "...", "..."],
  "inspected": [["https://...", "본문에서 무엇을 확인했는지"]],
  "channels":  ["신문 인터뷰 기사", "백과 요약 항목"],
  "assessment": "판정 근거 한 문단",
  "lines": { "greeting": ["", "", ""], "roll_call": ["", "", ""], "deploy": ["", "", ""],
             "battle_win": ["", "", ""], "battle_draw": ["", "", ""], "battle_lose": ["", "", ""],
             "clash_attack": ["", "", ""] }
}
```

| 필드 | 비고 |
|---|---|
| `wiki` | 영문 위키백과 문서 제목. 항목이 없으면 `identity_src`에 다른 1차 출처 URL을 쓴다 |
| `original`·`lang` | 원문이 영어가 아닐 때만. 원문이 한국어면 `original`과 `quote_ko`가 글자 그대로 같아야 한다 |
| `facts` 2건·`anchors` 3건·`queries` 3건·`inspected` 2건 | 룰북 최소 개수. 미달이면 4단계가 막는다 |

한국어가 든 JSON이므로 Edit 도구로 고치지 않는다. 새로 쓰거나 스크립트로 읽기→파싱→쓰기 한다.

### 3.1 직접 발언을 끝내 못 찾은 경우

`"unavailable": true`와 `"unavailable_reason"`을 넣는다. 한마디는 표준 자리 표시 값으로 자동 대체되고, 룰북이 요구하는 **출처 3곳·서로 다른 호스트 2곳**을 4단계가 먼저 센다. 대표 정보만 확보되면 21개 대사는 그대로 만든다.

---

## 4. 패치 조립

```bash
pnpm celeb:speech:3-patch .tmp-celeb-fill/in-01.json .tmp-celeb-fill/patch-01.json
```

자동으로 채우는 것: 스키마 뼈대, `identity.sourceUrl`, `voiceSamples`, `quoteOutcome`, `dialogueDecision`, `schemaVersion`, 그리고 **DB에서 현재 `lines`를 읽어 계산한 `expectedLinesSha256`**.

여기서 먼저 거르는 것: 필수 필드, 한마디 길이, 최소 개수, 상황별 대사 길이·중복·줄표·새 발화 지시 태그.

> 해시를 손으로 쓰면 반드시 낡는다. 이번 배치에서 이미 채워져 있던 한 명을 덮어쓸 뻔한 것을 이 해시가 잡았다.

---

## 5. 반영

```bash
pnpm celeb:fill apply --file .tmp-celeb-fill/patch-01.json --only-slugs "slug-a,slug-b"          # dry-run
pnpm celeb:fill apply --file .tmp-celeb-fill/patch-01.json --only-slugs "slug-a,slug-b" --apply  # 반영
```

- `--only-slugs`에는 담당 slug **전체**를 명시한다. 인덱스나 오프셋으로 범위를 추론하지 않는다.
- PowerShell은 인자를 쉼표로 쪼개므로 목록을 **따옴표로 묶는다**.
- 적용기는 쓰기 직전 현재값을 다시 읽어 해시가 달라졌으면 거부한다. 거부되면 값을 고치지 말고 **3단계부터 다시** 돌린다.
- `보존 N`은 이미 값이 있어 건드리지 않은 칸의 수다. 0이 아니면 무엇이 남았는지 확인한다.

반영이 끝나면 `.tmp-celeb-fill/`을 비운다.

---

## 6. 관련 문서

| 문서 | 책임 |
|---|---|
| [`celeb-speech.md`](celeb-speech.md) | 말투·한마디·대사의 작성 규칙과 검수 게이트 |
| [`celeb-pipeline.md`](celeb-pipeline.md) | 인물 데이터 전체 파이프라인에서 speech 트랙의 자리 |
| [`../../../sw/web-bo/scripts/README.md`](../../../sw/web-bo/scripts/README.md) | 백오피스 명령 색인 |
