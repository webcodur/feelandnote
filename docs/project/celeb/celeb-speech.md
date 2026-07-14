# 6. Speech 트랙

## 의존 관계

```
basic 완료 → speech_tone 배정 → quotes 작성 → dialogue 생성
```

- speech_tone: basic만 완료되면 독립 배정 가능 (persona 의존 없음)
- quotes: speech_tone 확정 후 어조 일치 기반 작성
- dialogue: quotes 완료 후 생성. **생몰 연대·생존 여부와 무관하게 모든 셀럽이 21개 전체 대사를 갖는다.**

---

## 6.1 speech_tone 배정

`profiles.speech_tone` (text 컬럼). **profiles 테이블에 직접 존재** (celeb_persona 아님).

### 6종 톤

| tone | 설명 | 영문 뉘앙스 | 인물 예시 |
|------|------|------------|----------|
| **bold** | 단언·선언·명령 | assertive, commanding | 나폴레옹, 스티브 잡스 |
| **composed** | 절제·관조 | measured, calm | 마르쿠스 아우렐리우스, 워렌 버핏 |
| **gentle** | 부드러운 구어 | warm, soft-spoken | 아인슈타인, 밥 로스 |
| **free** | 거침없는 구어 | casual, informal | 무하마드 알리, 일론 머스크 |
| **humble** | 겸양 | modest, graceful | 이순신, 간디 |
| **loyal** | 의무·사명 | firm, devoted | 유관순, 윤봉길 |

### 배정 기준

1. **직군 기반 후보 선정**
   - commander → bold, loyal, humble
   - leader → humble, loyal
   - politician → composed, bold
   - entrepreneur/investor → bold, composed, free
   - author/humanities_scholar → composed, gentle
   - actor/musician/influencer → free, gentle
   - scientist → composed, gentle
   - athlete → bold, free
2. **인물 성격·발언 스타일로 최종 결정** — 직군 기본값과 다르면 실제 말투 우선

### 배치 처리

```sql
UPDATE profiles SET speech_tone = CASE id
  WHEN '{id1}' THEN '{tone1}'
  WHEN '{id2}' THEN '{tone2}'
  ELSE speech_tone
END
WHERE id IN ('{id1}', '{id2}', ...);
```

---

## 6.2 quotes 작성·검수

### quote SSoT

- **SSoT**: `celeb_dialogues.lines.quote` / `celeb_dialogues.lines_en.quote`
- `profiles.quotes/quotes_en`은 하위호환용 잔류 (일반 유저 프로필에서도 사용)
- **읽기**: 셀럽 서버 액션이 celeb_dialogues에서 quote 추출
- **쓰기**: celeb_dialogues 우선 업데이트 + profiles 동기

### 포맷

- **50자 이내**, 한 문장, 한국어
- 따옴표로 감싸지 않음
- 문자열 내 큰따옴표는 작은따옴표로 대체
- quotes/quotes_en 동시 작성

### 출처 허용/불허

| 허용 | 불허 |
|------|------|
| 인터뷰, 연설, 기자회견, 저서, 서한, 조서 | 출연작 캐릭터 대사 |
| 공식 SNS 본인 발언 | 타인이 해당 인물에 대해 한 말 |
| 역사서에 기록된 직접 발언 | 노래 가사 |
| 업적·일화 기반 창작 (D 카테고리) | 시대착오적·범용적 창작 |
| **문학가 본인 작품 구절** (문학가 특칙) | |

### speech_tone별 어조 가이드

| tone | 한국어 어조 | 예시 |
|------|-----------|------|
| **bold** | 단언·선언·명령체 ("~하겠다", "~하라", "~이다") | 내 사전에 불가능은 없다 |
| **composed** | 절제·관조체 ("~일 뿐이다", "~할 따름이다") | 삶은 짧다. 우리가 낭비하기 때문에 짧은 것이다 |
| **gentle** | 부드러운 구어체 ("~이죠", "~하지 않을까요") | 상상력은 지식보다 중요하죠 |
| **free** | 거침없는 구어체 ("~거든", "~잖아") | 나는 마약을 하지 않는다. 내가 곧 마약이다 |
| **humble** | 겸양체 ("~할 뿐입니다", "~하겠습니다") | 신에게는 아직 열두 척의 배가 있습니다 |
| **loyal** | 의무·사명체 ("~해야 한다", "~하겠노라") | 역사는 바로 세워야 한다 |

### 검수 체크리스트

#### A. 즉시 탈락 (검색 불필요)

| # | 기준 | 조치 |
|---|------|------|
| A1 | 빈 값 | 웹 검색으로 확보 |
| A2 | 캐릭터 대사 | 본인 발언으로 교체 |
| A3 | 노래 가사 | 본인 인터뷰 발언으로 교체 |
| A4 | 복수 명언 합본 (`/`로 연결) | 가장 상징적인 1문장만 |
| A5 | 따옴표 래핑 | 따옴표 제거 |
| A6 | 원문 미번역 (한문·외국어) | 한국어로 번역 |
| A7 | 50자 초과 | 50자 이내로 축약 |
| A8 | 이스케이프 문자 | 정상 문자열로 교정 |

#### B. 검색 필요 판정

| # | 기준 | 조치 |
|---|------|------|
| B1 | 타인 명언 오귀속 | 원발화자 확인 → 교체 |
| B2 | 중복 귀속 | 원발화자 확인 → 비원발화자쪽 교체 |
| B3 | AI 생성 의심 | 실제 발언 확인 → 교체/빈 문자열 |
| B4 | 슬로건/구호 | 인물 철학이 담긴 발언으로 교체 |
| B5 | 풍자 대상의 말을 본인 말로 | 출처 확인 후 교체 |

#### C. AI 생성 의심 판별

아래 중 **2개 이상** 해당 시 AI 생성 의심:
1. "X는 Y이다" 정의형 문장
2. 고유 맥락/사건/작품이 없는 범용 문장
3. 같은 직군 다른 인물이 말해도 어색하지 않음
4. 웹 검색 시 연결 출처 없음

#### D. 품질·임팩트

| # | 기준 | 조치 |
|---|------|------|
| D1 | 범용 자기계발 문구 | 인물 고유 발언으로 교체 |
| D2 | 기업 슬로건형 | 구체적 경험에서 나온 발언으로 교체 |
| D3 | 의미 불명확 | 맥락 살아있는 발언으로 교체 |
| D4 | 인물 불일치 | 인물 철학에 부합하는 발언으로 교체 |
| D5 | 밋밋한 역사 인물 | 업적 기반 임팩트 문장으로 교체 |
| D6 | speech_tone 불일치 | 톤에 맞는 어조로 교체 |

### D 카테고리 교정 방법

1. **웹 검색 우선**: 해당 인물의 실제 발언 중 임팩트 있는 것을 찾는다
2. **역사 일화 기반 창작 허용**: 실제 발언이 없거나 밋밋한 경우, 핵심 업적·사건·철학 기반으로 창작 가능
3. **창작 필수 조건**: 인물 고유 업적이 녹아있을 것, 같은 직군 다른 인물이 말하면 어색할 것, 시대착오 금지

### 고대·근대 인물 특칙

기록 부족 인물은 **업적 기반 창작이 기본 전략**.

모범 — 광개토대왕(bold):
> 천제의 후손이 다스리는 땅에 경계란 없다. 사방 끝이 보이거든, 거기까지가 고구려다.

### 문학가·시인 특칙

**본인 작품 구절 사용 허용**. 문학가의 작품은 곧 정체성.

적용 대상: author, poet, playwright, humanities_scholar + 고대 문인(소동파, 칼리다사, 허난설헌, 황진이 등)

### 검수 배치 처리

```sql
-- 30명씩 조회
SELECT p.id, p.nickname, p.profession, p.quotes, p.quotes_en, p.speech_tone
FROM profiles p WHERE p.profile_type = 'CELEB'
ORDER BY p.nickname LIMIT 30 OFFSET {offset};

-- 교정 UPDATE (quotes/quotes_en 항상 동시)
UPDATE profiles SET
  quotes = CASE id WHEN '{id1}' THEN '{교정된}' ELSE quotes END,
  quotes_en = CASE id WHEN '{id1}' THEN '{교정된_en}' ELSE quotes_en END
WHERE id IN ('{id1}', ...);
```

### 검수 보고 형식

```
## 배치 N (OFFSET {offset})
- 검수: {총}명 / 정상: {n}명 / 교정: {n}명
  - A1(빈값): n건, B3(AI): n건, D5(밋밋): n건 ...
- UPDATE 완료
```

---

## 6.3 dialogue 생성

유저가 대사를 읽을 시간은 없다. 한마디로 순간의 호흡을 나타내라.

### 말투 규칙

commander 직군 외 모든 인물은 존댓말(~합니다/~해요). deploy·clash_attack은 명령형 허용.

### 생성 범위 — 전원 전체 대사

**모든 셀럽이 7상황 × 3변형 = 21개 전체 대사를 갖는다.** 생몰 연대·생존 여부·저작권 상태로 범위를 줄이지 않는다.

- 7상황: greeting, roll_call, deploy, battle_win, battle_draw, battle_lose, clash_attack
- 각 상황 3변형. 빈 문자열을 남기지 않는다.
- 현대 인물도 동일하게 21개를 채운다. 출연작 캐릭터 대사·노래 가사가 아닌, 본인 화법·철학·업적에 기반한 창작이면 된다.

> 과거 규칙(옛 인물만 전체, 현대는 인사말만)은 폐기됐다. 인사말만 있는 기존 인물은 나머지 18개를 채워 전체로 승격한다.

### 번역투 차단 게이트 (필수)

대사는 짧아 직역체가 즉시 드러난다. **각 대사를 작성한 뒤 문장별로 3회 재검토**하고, 아래에 걸리면 재작문한다. 상세 진단은 `ko-detranslate` 스킬 참조.

| # | 금지 | ❌ | ✅ |
|---|------|----|----|
| 1 | **사물·추상명사 주어** | 승리가 우리를 부른다 | 우리가 승리를 거머쥔다 |
| 2 | 동격 구문 (~인 N이다) | 내가 택한 길은 죽음뿐인 길이었다 | 나는 죽음을 각오하고 이 길을 택했다 |
| 3 | 수동태·사역 직역 (되어졌다·로 하여금) | 적은 무너뜨려졌다 | 적을 무너뜨렸다 |
| 4 | 번역 관용구 (~에 다름 아니다·~에 있어서·~을 통하여) | 이 전투에 있어서 | 이 전투에서 |
| 5 | em dash(—) | 나아가라 — 멈추지 말고 | 나아가라, 멈추지 마라 |
| 6 | 부자연 도치 | 결코 물러서지 않을 나다 | 나는 결코 물러서지 않는다 |

자가 점검: **"이 한마디의 주어가 사람(나·우리·그대·장졸)인가, 사물인가?"** 사물이면 십중팔구 번역투다. 한국어 대사의 골격은 *[사람]은 [대상]을 [동사]한다*.

### 절대 기준: 이순신

```json
{
  "greeting": [
    "[bold, ambitious] 한산섬 달 밝은 밤에 칼을 어루만지는데, 어디선가 피리 한 가락 불어와 애를 끓이는구나.",
    "[fierce, confident] 살고자 하면 죽을 것이요, 죽고자 하면 살 것이다.",
    "[bold, passionate] 신에게는 아직 열두 척의 배가 있습니다."
  ],
  "deploy": [
    "[charging, ambitious] 전군, 북소리에 맞춰 나아가라!",
    "[strategic, calm] 판옥선의 돛을 올려라!",
    "[resolute, observant] 귀선을 바다에 띄워라!"
  ],
  "battle_win": [
    "[solemn, humble] 천지신명이 조선을 도우셨소.",
    "[triumphant, steady] 장졸들의 노고를 치하하라.",
    "[fierce, satisfied] 다시는 이 바다를 넘보지 못하리라."
  ],
  "battle_lose": [
    "[bitter, proud] 나의 불찰이다.",
    "[solemn, heavy] 장졸들에게 면목이 없구나.",
    "[heavy, commanding] 훗날을 기약하고 함선을 보존하라."
  ],
  "clash_attack": [
    "[charging, fierce] 발포하라!",
    "[fierce, striking] 단숨에 돌파하라!",
    "[bold, advancing] 전부 수장시켜라."
  ]
}
```

### 데이터 스키마

```json
{
  "celeb_id": "UUID",
  "nickname": "인물명",
  "profession": "직군",
  "speech_tone": "(profiles.speech_tone)",
  "lines": {
    "greeting":     ["[emotion, emotion] 대사", "× 3"],
    "roll_call":    ["[emotion, emotion] 대사", "× 3"],
    "deploy":       ["[emotion, emotion] 대사", "× 3"],
    "battle_win":   ["[emotion, emotion] 대사", "× 3"],
    "battle_draw":  ["[emotion, emotion] 대사", "× 3"],
    "battle_lose":  ["[emotion, emotion] 대사", "× 3"],
    "clash_attack": ["[emotion, emotion] 대사", "× 3"]
  }
}
```

> **각 상황의 원소는 반드시 문자열** `"[emotion] 대사"` 이다. **`{ "text": ..., "quote": ... }` 같은 객체 원소로 저장하지 않는다.** 화면·게임·홈 모든 소비처가 문자열 배열을 전제하므로, 객체를 넣으면 셀럽 페이지가 서버 렌더에서 즉시 크래시(500)한다. 감정 태그는 문자열 맨 앞에 `[emotion, emotion]` 형태로 인라인한다. (2026-07-14: 이 규칙을 위반한 18명 일괄 교정, 마이그레이션 `fix_dialogue_object_lines_to_string`.)

---

변경 작업 시 `celeb-pipeline.md` §0 업데이트 가드를 따른다.
