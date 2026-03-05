# 셀럽 고유 대사 생성 룰북

유저가 대사를 읽을 시간은 없다. 한마디로 순간의 호흡을 나타내라. 지휘관(commander) 직군 외 모든 인물은 존댓말(~합니다/~해요)로 말한다. deploy·clash_attack은 명령형 허용.

## 절대 기준: 이순신

모든 대사의 밀도·호흡·여백은 이순신을 기준으로 삼는다.

```json
{
  "greeting": [
    "[bold, ambitious] 한산섬 달 밝은 밤에 수루에 홀로 앉아.",
    "[fierce, confident] 살고자 하면 죽을 것이요, 죽고자 하면 살 것이다.",
    "[bold, passionate] 신에게는 아직 열두 척의 배가 있습니다."
  ],
  "roll_call": [
    "[calm, steadfast] 명을 받들겠습니다.",
    "[confident, expectant] 때를 기다리고 있었습니다.",
    "[confident, ready] 출항 준비는 끝났습니다."
  ],
  "deploy": [
    "[charging, ambitious] 전군, 북소리에 맞춰 나아가라!",
    "[strategic, calm] 판옥선의 돛을 올려라!",
    "[resolute, observant] 귀선을 바다에 띄워라!"
  ],
  "battle_win": [
    "[solemn, humble] 천지신명이 조선을 도우셨소.",
    "[triumphant, steady] 장졸들의 노고를 치하하라."
    "[fierce, satisfied] 다시는 이 바다를 넘보지 못하리라."
  ],
  "battle_draw": [
    "[tactical, calm] 다음 물길을 기다려라."
    "[frustrated, ambitious] 끝난 것이 아니니 전열을 재정비하라.",
    "[cold, insightful] 다음엔 숨통을 끊으리라."
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

## dialogue_tier

각 JSON 파일에 `"dialogue_tier"` 필드가 있다. 이 값에 따라 작성 범위가 달라진다.

- **`"full"`** — 7상황 × 3변형 = 21개 전부 작성.
- **`"greeting_only"`** — greeting 3개만 작성. 나머지는 빈 문자열 유지.

### 자동 판정 기준

| 조건 | dialogue_tier | 비고 |
|------|---------------|------|
| `death_date` ≤ 1920 | `greeting_only` | 퍼블릭 도메인 인물. greeting 3개만 자동 생성 |
| `death_date` > 1920 또는 생존 | 자동 실행 안 함 | 별도 요청 시 `full`로 생성 |

## 데이터 스키마

```json
{
  "celeb_id": "UUID",
  "nickname": "인물명",
  "profession": "직군",
  "speech_tone": "(비워둘 것 — 별도 부여 예정, 변경 금지)",
  "dialogue_tier": "full 또는 greeting_only",
  "lines": {
    "greeting":     ["[emotion, emotion] 대사", × 3],
    "roll_call":       ["[emotion, emotion] 대사", × 3],
    "deploy":       ["[emotion, emotion] 대사", × 3],
    "battle_win":   ["[emotion, emotion] 대사", × 3],
    "battle_draw":  ["[emotion, emotion] 대사", × 3],
    "battle_lose":  ["[emotion, emotion] 대사", × 3],
    "clash_attack": ["[emotion, emotion] 대사", × 3]
  }
}
```
