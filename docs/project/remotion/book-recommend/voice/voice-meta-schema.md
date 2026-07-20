# Voice Meta Schema (SSoT)

라인별 ElevenLabs TTS 합성 메타. 본문 텍스트는 verbatim으로 보존하고, 합성 시점에만 prefix/suffix를 동적으로 부착한다.

## 적용 범위

ElevenLabs 인물 음성 합성 대상 대사에만 의미가 있다. Gemini 해설 합성에는 사용하지 않는다.

| 라인 | path | locale 분리 |
|------|------|-------------|
| 셀럽 대표 명언 | `host.featuredQuoteVoice` | 공용(ko/en 동일) |
| 셀럽 감상철학 | `host.philosophyVoice` | 공용 |
| 도서 인용 | `books[i].quotePairs[j].voice` | 공용 |
| 쇼츠 셀럽 세그먼트 | `shorts[k-1].segments[m].voice` (별도 파일 `shorts/<locale>-K.json`) | 공용 |

ko·en 동일 위치에 동일 voice 메타가 들어간다(`tags`/`trail` 한정). 단, `emphasis`는 단어 인덱스가 locale별로 다르므로 locale별 저장이 가능하다.

## 타입

```ts
export type VoiceMeta = {
  /** ElevenLabs 합성 prefix 감정 태그. 0~2개. ELE_EMOTIONS 중 선택. */
  tags?: string[]
  /** 본문 끝에 ' ... ... ...' 추가 여부. */
  trail?: boolean
  /** 자막 단어 강조. wordIndex는 본문 단어 0-based. ko·en 단어수 다르므로 locale별 저장. */
  emphasis?: Array<{
    wordIndex: number[]
    type: 'bold' | 'italic'
  }>
}

export type VoiceMetaContext = {
  defaultTags: string[]
  defaultTrail: boolean
}
```

`ELE_EMOTIONS` 값은 `sw/remotion-bo/src/components/scenario-voice/types.ts` 단일 정의.

## 합성 텍스트 구성

```
[t1, t2] {본문 그대로} ... ... ...
```

- `tags`가 비어 있고 panel default도 비어 있으면 prefix 미부착. 단, ElevenLabs 엔진은 prefix를 강제하므로 CLI는 에러로 종료.
- `trail`이 false면 suffix 미부착.
- 기존 `buildEleText(text, EleSendOpts)` 헬퍼와 동일한 결과를 만든다.

## 우선순위

1. 라인의 `voice.tags`(non-empty) → 사용
2. 비어 있으면 panel `eleSendOpts.emotions` (BO 미리듣기) 또는 CLI `--default-tags` / `ELE_DEFAULT_TAGS` (백엔드)
3. 둘 다 비어 있으면 prefix 없음(ElevenLabs 엔진은 에러)

`trail`도 동일 흐름: 라인 `voice.trail` (boolean 명시) → panel/CLI fallback.

## 직렬화 규칙

- `tags`가 빈 배열이거나 `trail`만 true인 경우 등 메타가 사실상 비어 있으면 voice 키 자체를 삭제한다.
- 본문 필드(`text`/`quote`/`philosophy`/`featuredQuote`)는 어떤 경우에도 수정하지 않는다.
- JSON indent는 파일이 사용하는 들여쓰기 폭을 그대로 유지한다(주로 2 또는 4 space).

## API

`PATCH /api/<series>/voice/meta/<name>`

```
body: {
  path: string                   // dot/bracket notation
  value: VoiceMeta               // 빈 객체면 키 삭제
  locale?: 'ko' | 'en' | 'both'  // default: 'both'
}
```

- `path`: 예) `'host.philosophyVoice'`, `'books[2].quotePairs[0].voice'`, `'shorts[1].segments[3].voice'`
- `shorts[k]...` 로 시작하면 `shorts/<locale>-(k+1).json` 파일을 갱신한다. 그 외에는 `<locale>.json` 본체를 갱신한다.
- stage 자동 탐색: `live → done → todo → pre-todo`.
