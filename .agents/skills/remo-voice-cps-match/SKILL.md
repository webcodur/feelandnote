---
name: remo-voice-cps-match
description: BookRecommend 음성 발화속도(자/초)를 목표값으로 통일하는 배속(*PlaybackRate) 자동 산출·반영. 각 책의 요약·맥락·인용·후속 구간 음성을 목표 자/초(기본 6.5)로 들리도록 영상 배속을 계산해 book.ko.json에 기록한다. 렌더 결과에 그대로 반영된다. "배속 맞춰줘", "발화속도 통일", "자초 맞춰", "이 책 6.5자초로", "오디오 속도 일정하게", "이 구간 빠르게/느리게" 등으로 호출. /remo-voice-cps-match <에피소드> [옵션] 로 실행.
---

# Voice CPS Match — 발화속도 통일 배속 산출

BookRecommend 롱폼 음성의 **체감 발화속도(자/초)를 목표값으로 통일**하는 단일 진입점.
각 본문 구간의 영상 배속(`*PlaybackRate`)을 계산해 `book.ko.json`에 기록한다. remotion 로드 시
`<Audio playbackRate>`로 적용되어 **렌더 결과에 그대로 반영**된다(원본 wav·타이밍 파일은 건드리지 않음).

## 동작 원리

```
원본 자/초 = 공백 제외 글자수 ÷ 실측 wav 길이(토막은 전부 합)
배속 r     = 목표 자/초 ÷ 원본 자/초          (clampRate 0.5~2.0)
```

배속 r을 걸면 재생 시간이 1/r로 줄어 실효 속도가 (원본 × r) = 목표에 수렴한다.
배속은 **필드 단위 한 값**이라(remotion `playback-rate.ts` 규약), 토막이 여러 개인 필드는
필드 전체 평균(전체 글자수 ÷ 전체 토막 wav 합)을 목표에 맞춘다.

엔진 선택은 `voice/<locale>/voice-select.json`의 `slots[파일명] ?? default`를 따른다.

## 실행

```
pnpm voice:match-cps --episode <에피소드> [옵션]
```

(sw/remotion 디렉토리에서. 또는 `tsx scripts/voice/match-cps.ts ...`)

### 옵션

| 옵션 | 기본 | 설명 |
|------|------|------|
| `--episode <name>` | (필수) | 에피소드명. 예: `elon-musk` |
| `--target <자/초>` | `6.5` | 목표 발화속도. 사용자가 다른 값 지정 시 그 값 |
| `--book <번호>` | 전체 | 특정 책만(1부터). 미지정 시 모든 책 |
| `--field <key>` | 전체 | 특정 구간만: `title` `summary` `context` `quote` `after` |
| `--include-title` | off | 제목 구간도 포함(기본 제외) |
| `--locale <ko\|en>` | `ko` | 데이터/음성 로케일 |
| `--apply` | off | 실제 저장. **없으면 dry-run(미리보기)** |

## 대상 구간 정책

- **기본 포함**: 요약(summary)·감상맥락(context)·직접인용(quote)·인용후속(after)
- **기본 제외**: 제목(title) — 짧은 글자를 길게 끄는 의도적 연출이라 통일하면 어색해진다.
  `--include-title`을 줄 때만 포함한다.
- 음성이 아직 없는 구간(미생성)은 자동 skip하고 누락으로 표시한다.

## 사용자 호출 해석

- "배속 맞춰줘 / 발화속도 통일 / 자초 맞춰" → 기본 6.5자/초, 전체 책. **dry-run 먼저 보여주고 승인받아 `--apply`.**
- "이 책 N자초로" / "3번 책 6자초" → `--book 3 --target 6.0`
- "이 요약만 / 이 구간만" → `--field summary` 등(맥락에서 책 특정)
- 막연히 "이 구간 빠르게/느리게"는 통일이 아니라 단건 조정 — 그 구간의 현재 자/초를 보고
  사용자가 원하는 자/초를 되물어 `--field`로 처리.

## 절차

1. **dry-run 실행** → 구간별 `현재 자/초 → 산출 배속` 표를 사용자에게 보여준다.
2. **클램프 경고 확인** — 0.5~2.0 한계로 목표에 못 닿는 구간(주로 극단적으로 느린 짧은 구간)은
   실효 자/초를 함께 보고한다. 목표 미달을 숨기지 않는다.
3. 사용자 승인 후 `--apply`로 저장.
4. **렌더는 자동으로 돌리지 않는다.** 적용은 데이터(배속 필드)만 바꾼다. 영상 확인이 필요하면
   사용자가 명시적으로 렌더를 요청할 때만 `/remo-render-bookrecommend` 등으로 진행한다.

## 안전

- 책 본문 텍스트는 절대 수정하지 않는다. `*PlaybackRate` 필드만 set/삭제한다.
- 배속이 1.00(±0.005)이면 필드를 비워 원본 속도로 둔다(불필요한 필드 누적 방지).
- `--apply` 전 dry-run으로 변경 건수를 항상 먼저 보고한다.

## 데이터 경로 (참고)

- 책 데이터: `public/episodes/<ep>/books/<NN>-*/book.<locale>.json`
- 음성 wav: `public/episodes/<ep>/voice/<locale>/<engine>/D<NN><필드코드>...wav`
- 배속 적용: remotion `src/compositions/BookRecommend/playback-rate.ts`
