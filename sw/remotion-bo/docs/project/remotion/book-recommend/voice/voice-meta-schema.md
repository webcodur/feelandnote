# 셀럽 발화 voice 메타 스키마 (locale 공유)

## 목적

ElevenLabs TTS 합성용 감정태그·tail dots 토글, 자막 강조 메타를 **본문 텍스트와 분리**하여 저장한다. 본문(`text`/`quote`/`philosophy`/`featuredQuote`)은 **verbatim 보존** (publication-grade R1·R4 유지). 합성·자막 단계에서만 메타가 적용된다.

**locale 공유 원칙**: 한 라인의 voice 메타는 ko·en 두 파일에 **동일한 값**을 가진다. 한 인물의 같은 발화는 한국어판이든 영문판이든 같은 감정·tail·강조로 처리된다.

## 신설 필드

| 위치 | 본문 필드 | 신설 필드 |
|---|---|---|
| `host.featuredQuote` | string | `host.featuredQuoteVoice` |
| `host.philosophy` | string | `host.philosophyVoice` |
| `books[i].quotePairs[j].quote` | string | `books[i].quotePairs[j].voice` |
| `shorts/N.json segments[k].text` (role=celeb) | string | `shorts/N.json segments[k].voice` |

## voice 필드 스키마

```typescript
interface VoiceMeta {
  /** ElevenLabs 합성 prefix 감정 태그. 0~2개. EMOTIONS 12종 중 선택.
   *  비어 있으면 panel default 적용. */
  tags?: string[]

  /** 본문 끝에 ' ... ... ...' suffix 추가 (자연스러운 페이드).
   *  미지정 시 panel default 적용. */
  trail?: boolean

  /** 자막 단어별 강조. wordIndex는 본문 단어 0-based 인덱스 배열.
   *  voiceTimings의 word-level 데이터에 type 필드를 부착하는 데 사용.
   *  주의: ko·en 본문 단어 수가 다르므로 emphasis는 locale별로 따로 저장. */
  emphasis?: Array<{
    wordIndex: number[]   // 연속 단어 묶음
    type: 'bold' | 'italic'
  }>
}
```

### EMOTIONS 12종 (ScenarioVoice.tsx 라인 21 정의)

```
calm, warm, gentle, kind,
serious, confident, passionate, reflective,
sad, melancholic, dramatic, playful
```

## UI 구분: 라인 voice vs 전송 옵션

ExpandedVoicePanel에는 두 입력 영역이 별도로 존재한다. 헷갈리지 말 것.

| 항목 | 라인 voice | 전송 옵션 |
|---|---|---|
| **저장 위치** | JSON 파일(해당 세그먼트의 `voice` 필드) | 패널 메모리(닫으면 사라짐) |
| **적용 범위** | 이 한 줄에만 영구 고정 | 라인 voice 미지정인 라인 전부에 일시 적용 |
| **우선순위** | 1순위(라인 voice가 있으면 항상 우선) | 폴백(라인 voice가 비어 있을 때만) |
| **커밋 가능 여부** | 가능(파일 변경) | 불가능(세션 한정) |
| **용도** | "이 셀럽 대사는 항상 [whispering, desperate]" — 작품 단위 고정 | "지금 일괄 생성할 때만 [confident]" — 임시 조정 |

병합 로직(`ExpandedVoicePanel.tsx`):

```ts
emotions: lineMeta.tags?.length > 0 ? lineMeta.tags : eleSendOpts.emotions
trail:    typeof lineMeta.trail === 'boolean' ? lineMeta.trail : eleSendOpts.trailEnabled
```

작업 권장 흐름:
1. 임시로 전송 옵션을 바꿔가며 ELE 생성으로 톤을 탐색
2. 마음에 드는 조합이 나오면 라인 voice에 입력해 영구 저장
3. 다음 작업자/재합성 시 라인 voice가 자동 적용됨

## 합성 동작

### ElevenLabs (engines.ts synthesizeElevenlabs)

```
input text  = "I am a slow walker, but I never walk back."
voice.tags  = ["steady", "resolute"]   // 또는 ["confident", "calm"]
voice.trail = true

→ buildSendText() →

API에 전송: "[steady, resolute] I am a slow walker, but I never walk back. ... ... ..."
```

본문 텍스트는 **그대로 JSON에 보존**. 합성 시점에만 prefix·suffix 동적 부착.

### voice 필드 누락 / 비어있을 때

- `voice` 자체 없음 → panel default 적용 (현재 ScenarioVoice의 `eleSendOpts` fallback)
- `voice.tags` 빈 배열 → 태그 없음으로 합성 (단, `synthesizeElevenlabs`이 `[tag]` 강제 검증 중이라 panel default 적용 필수)
- `voice.trail` undefined → panel default

## 자막 emphasis 적용

```typescript
// voice.emphasis = [{ wordIndex: [3, 4], type: "bold" }]
// 본문 = "I am a slow walker, but I never walk back."
// 단어 인덱스: 0=I, 1=am, 2=a, 3=slow, 4=walker, ...
// → "slow walker" 두 단어가 bold 처리됨
```

voiceTimings의 word-level 메타에 `type: "bold"` 필드 추가. Remotion 렌더 컴포넌트가 해당 단어를 강조 표시.

## 데이터 흐름

```
BO (ScenarioVoice)
  ↓ 사용자가 라인별 tags·trail·emphasis 입력
PATCH /api/<series>/voice/meta/<name>
  ↓ ko.json·en.json 양쪽 동일 voice 필드 저장 (단 emphasis는 locale별)
JSON (en.json + shorts/en-N.json)
  ↓ pnpm voice:tts --engine elevenlabs
synthesizeElevenlabs(text, voiceId, ...)
  ← buildSendText(text, voice) prefix + suffix 합성
  → ElevenLabs API
```

## ko·en 공유 정책

| 메타 | 공유? | 이유 |
|---|---|---|
| `tags` | ✅ ko/en 동일 | 같은 인물의 같은 감정 — locale 무관 |
| `trail` | ✅ ko/en 동일 | tail dots는 음성 페이드 효과 — locale 무관 |
| `emphasis` | ❌ locale별 | 본문 단어 수·순서가 다름 — wordIndex가 어긋남 |

BO 저장 API는 `tags`·`trail` 변경 시 두 파일 동시 PATCH, `emphasis`는 현재 편집 중인 locale 파일만 PATCH.

## 구현 영향

| 영역 | 작업 |
|---|---|
| BO ScenarioVoice | 라인별 voice 입력 UI 추가, panel 전역 sendOptions은 default fallback으로 격하 |
| BO API | `/api/<series>/voice/meta/<name>` PATCH 엔드포인트 신설 |
| 백엔드 voice:tts | ElevenLabs 호출 시 `voice` 필드 읽어 buildSendText 적용 |
| Remotion 렌더 | voiceTimings의 word-level `type` 필드를 보고 `<span class="font-bold">` 등 적용 (별도 구현) |

## 마이그레이션

기존 에피소드 (Lincoln 포함):
- `voice` 필드 부재 → panel default 적용 (현재 동작 유지)
- 라인별 메타가 필요한 신규 작업 시 BO에서 입력
- 마이그레이션 일괄 작업 불필요. 자연 채워짐.
