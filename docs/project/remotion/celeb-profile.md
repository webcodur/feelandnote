# 인물 열전 — 시리즈 기획서

셀럽 한 명의 인물상을 **페르소나 + 영향력 + 명언**으로 조명하는 영상 시리즈. 서재 탐방의 전편으로, "이 사람은 누구인가"에 답한다.

## 시리즈 위치

```
인물 열전 (who)  →  서재 탐방 (input)  →  창작 서가 (output)
celeb-profile       book-recommend         celeb-works
```

---

## 데이터 소스

| DB 테이블 | 사용 데이터 | 영상 섹션 |
|-----------|-----------|----------|
| `profiles` | nickname, bio, speech_tone, avatar_url, title | 인물 소개 |
| `celeb_persona` | abilities(4), inner_virtues(4), outer_virtues(4), dispositions(4), rationale | 페르소나 |
| `celeb_influence` | 6축 점수 + transhistoricity + total_score, exp | 영향력 |
| `celeb_dialogues` | lines.quote | 대표 명언 |
| `profiles.cultural_journey` | 감상 여정 텍스트 | 감상 철학 (서재 탐방 예고) |

---

## 롱폼 섹션 구성

```
Brand(4s) → Intro(인물 리빌) → Bio(인물 소개)
→ Persona(능력+덕목+성향 시각화) → Influence(영향력 6축)
→ Quote(대표 명언) → Bridge(서재 탐방 예고) → Logo
```

### 섹션 상세

| # | 섹션 | 화자 | 내용 | 비주얼 |
|---|------|------|------|--------|
| 0 | Brand | — | feelandnote 로고 | 서재 탐방과 공용 |
| 1 | Intro | 나레이터 | "인물 열전, 오늘의 주인공은..." + 이름 리빌 | 실루엣 → reveal (서재 탐방과 동일 패턴) |
| 2 | Bio | 나레이터 | profiles.bio 기반 인물 소개 | 아바타 + 텍스트 오버레이 |
| 3 | Persona | 나레이터 | 능력 4항목 → 덕목 8항목 → 성향 4항목 순서로 소개. rationale로 마무리 | 레이더 차트 애니메이션 |
| 4 | Influence | 나레이터 | 6축 점수 + 통시성. 각 축별 exp 한 줄씩 | 헥사곤 차트 or 바 차트 애니메이션 |
| 5 | Quote | 셀럽 | celeb_dialogues.lines.quote (대표 명언) | 아바타 + 인용문 타이포 |
| 6 | Bridge | 나레이터 | "이 인물의 서재가 궁금하다면..." — 서재 탐방 연결 | 책 실루엣 티저 |
| 7 | Logo | — | 치임 + 로고 | 공용 |

### 화자 규칙

| 역할 | 담당 | 말투 |
|------|------|------|
| 나레이터 | Kore (여성) | 정중체 (~입니다, ~합니다) |
| 셀럽 | Gemini/ElevenLabs | 해당 인물 speech_tone |

- Bio 섹션은 서술체 (~이다, ~했다). 서재 탐방 celebIntro와 동일 톤.
- Persona/Influence 섹션은 정중체. 시청자에게 설명하는 톤.

---

## 페르소나 시각화 설계

### 능력 (abilities) — 레이더 차트

```
        통솔
       / | \
    매력 — + — 무력
       \ | /
        지력
```

- 4축 레이더 차트. 점수 0~100.
- 각 축이 순차적으로 그려지는 애니메이션.
- 축 채워질 때 해당 reason_ko 자막 표시.

### 덕목 (virtues) — 8각형 레이더 차트

```
     절제
   겸양   근면
  공정       성찰
   인자   용기
     충성
```

- inner_virtues(4) + outer_virtues(4) = 8축.
- 능력과 같은 방식으로 순차 애니메이션.

### 성향 (dispositions) — 양방향 바 차트

```
비관 ◄████████░░░░░░░░░░░░► 낙관
보수 ◄░░░░░░░░░░████████░░► 진보
개인 ◄░░░░░░░░░░░░██████░░► 사회
신중 ◄████████████░░░░░░░░► 대담
```

- -50 ~ +50 범위. 중앙이 0.
- 각 바가 순차적으로 채워지며 reason_ko 표시.

### Rationale 마무리

페르소나 시각화 끝에 rationale_ko 텍스트를 나레이터가 읽으며 종합 정리.

---

## 영향력 시각화 설계

### 6축 헥사곤 차트

```
      정치
    /      \
  문화      전략
  |          |
  경제      기술
    \      /
      사회
```

- 각 0~10. 축 순차 채워지며 exp 한 줄 자막.
- 채워진 면적 = 종합 영향력 시각 표현.

### 통시성 (transhistoricity)

- 0~40 점 게이지 바. "인류사 전체에 걸친 영향력" 설명.
- total_score(0~100) 최종 표시.

---

## 쇼츠 (9:16)

### 콘셉트

**"이 사람의 능력치를 까본다"**

게임 캐릭터 스탯 리뷰 느낌. 20~35초.

### 4비트 구조

| Beat | 시간 | 내용 |
|------|------|------|
| 1: 훅 | 0~3s | "알렉산더 대왕의 무력 98, 겸양 15" — 극단적 수치로 훅 |
| 2: 소개 | 3~8s | 아바타 + 이름 + 한줄 bio |
| 3: 스탯 | 8~25s | 능력 4축 레이더 차트 애니메이션 + 핵심 reason 2~3개 |
| 4: 펀치 | 25~30s | 대표 명언 + "전체 분석 → 프로필" CTA |

### 훅 패턴

```
"통솔 92, 겸양 15 — 이 사람은 누구일까"
"무력 98, 절제 20 — 역사상 가장 위험한 천재"
"지력 97, 대담함 +45 — 모든 것을 바꾼 사람"
```

---

## 영상 길이 추정

| 항목 | 추정 시간 |
|------|----------|
| Brand + Intro + Bio | ~60s |
| Persona (능력+덕목+성향+rationale) | ~90~120s |
| Influence (6축+통시성) | ~60~90s |
| Quote | ~15s |
| Bridge + Logo | ~15s |
| **합계** | **~4~5분** |

서재 탐방(8~35분)보다 짧다. 인물 소개에 집중하므로 적절한 길이.

---

## 에피소드 데이터 구조

```typescript
interface CelebProfileScript {
  locale?: 'ko' | 'en'
  host: {
    nickname: string
    nickname_en: string
    bio: string
    title: string
    avatar_url: string
    speech_tone: string
    featuredQuote?: string
    featuredQuoteDuration?: number
    geminiVoice?: string
    elevenlabsVoiceId?: string
  }
  persona: {
    abilities: Record<string, { score: number; reason: string; duration?: number }>
    innerVirtues: Record<string, { score: number; reason: string; duration?: number }>
    outerVirtues: Record<string, { score: number; reason: string; duration?: number }>
    dispositions: Record<string, { score: number; reason: string; duration?: number }>
    rationale: string
    rationaleDuration?: number
  }
  influence: {
    axes: Record<string, { score: number; exp: string; duration?: number }>
    transhistoricity: { score: number; exp: string; duration?: number }
    totalScore: number
  }
  narrator: {
    intro: string
    introDuration?: number
    bioNarration: string
    bioDuration?: number
    personaIntro: string
    personaIntroDuration?: number
    influenceIntro: string
    influenceIntroDuration?: number
    bridge: string
    bridgeDuration?: number
  }
  voiceTimings?: Record<string, { start: number; end: number }[]>
}
```

---

## 음성 파일 구조

```
public/voice/<episode-name>/
  narrator-intro.wav              ← 인물 열전 인트로
  narrator-bio.wav                ← 인물 소개
  narrator-persona-intro.wav      ← "이 인물의 능력치를 살펴보겠습니다"
  persona-ability-command.wav     ← 통솔 reason
  persona-ability-martial.wav     ← 무력 reason
  persona-ability-intellect.wav   ← 지력 reason
  persona-ability-charm.wav       ← 매력 reason
  persona-virtue-*.wav            ← 덕목 8개 reason (필요 시 선별)
  persona-disposition-*.wav       ← 성향 4개 reason (필요 시 선별)
  persona-rationale.wav           ← 종합 해설
  narrator-influence-intro.wav    ← "영향력을 평가합니다"
  influence-political.wav         ← 정치 exp
  influence-strategic.wav         ← 전략 exp
  influence-tech.wav              ← 기술 exp
  influence-social.wav            ← 사회 exp
  influence-economic.wav          ← 경제 exp
  influence-cultural.wav          ← 문화 exp
  influence-transhistoricity.wav  ← 통시성 exp
  celeb-quote.wav                 ← 대표 명언 (셀럽 음성)
  narrator-bridge.wav             ← 서재 탐방 연결
```

---

## 제작 조건

서재 탐방과 동일: `celeb_persona` + `celeb_influence` + `celeb_dialogues` 보유 + `celeb_tier = full`.

Phase 1 대상은 서재 탐방 lineup과 동일 인물부터 시작한다.

---

## 서재 탐방과의 차이

| 항목 | 인물 열전 | 서재 탐방 |
|------|----------|----------|
| 주제 | 인물 자체 | 인물의 독서 |
| 핵심 데이터 | persona + influence | celeb_contents (BOOK) |
| 길이 | 4~5분 | 8~35분 |
| 비주얼 특징 | 차트 애니메이션 | 표지 + 배경 이미지 |
| 화자 수 | 나레이터 + 셀럽(명언만) | 나레이터 + 요약맨 + 셀럽 |
| 시리즈 코드 | `celeb-profile` | `book-recommend` |

---

## TODO

- [ ] CelebProfile 컴포지션 생성 (`sw/remotion/src/compositions/CelebProfile/`)
- [ ] 레이더 차트 컴포넌트 구현
- [ ] 헥사곤 차트 컴포넌트 구현
- [ ] 양방향 바 차트 컴포넌트 구현
- [ ] 에피소드 JSON 생성 스크립트 (DB → JSON 변환)
- [ ] TTS 파이프라인 확장 (celeb-profile 시리즈 지원)
- [ ] 파일럿 에피소드 제작 (알렉산더 대왕)
