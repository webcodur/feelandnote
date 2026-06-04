# 서재 탐방 — 1권 모드(SOLO)

한 인물·한 권을 16:9 자유 서술 영상으로 만드는 포맷. 롱폼·쇼츠와 평행한 세 번째 변형이지만, **별도 편집 데이터가 없다.** 책 본문 한 곳이 단일 SSoT.

- 다른 변형과의 비교는 [longform.md](longform.md) · [shorts.md](shorts.md) 참조
- 렌더 명령·출력 경로·컴포지션 ID·유튜브 변형 키는 [render.md](render.md)에 통합
- 음성 합성은 [voice/tts.md](voice/tts.md)의 「1권 모드 향후 작업」 절 참조

## 개념

- **롱폼**: 한 인물 × N권을 한 영상에 묶음
- **쇼츠**: 한 인물 × 한 권 핵심을 60~90초로
- **1권 모드(SOLO)**: 한 인물 × 한 권을 16:9 자유 서술로 깊이 다룸

레이아웃은 단순하다. 화면 중앙에 시네마틱 이미지, 하단에 자막. 인용 마디는 자막 영역 안에서 색·크기·이탤릭으로 차별화한다.

## 단일 데이터 원천

**솔로 전용 데이터 파일은 없다.** 책 한 권의 본문(`book.{ko,en}.json`)이 그대로 솔로의 재료다:

| book 필드 | 솔로에서 쓰임 |
|----------|--------------|
| `book.summary` | 핵심 요약 마디 |
| `book.contextMain` | 감상 배경 마디 |
| `book.quotePairs[]` | 인용 + 여운 마디 |
| `book.images[]` (text 앵커 포함) | 화면 전환점 (롱폼·쇼츠와 동일 풀) |
| `narrator.serviceGreeting` | 인사 마디 (자동 생성) |
| `narrator.celebIntro` | 인물 소개 마디 (자동 생성, 첫 단락만) |
| 자동 생성 | 책 표지 마디, 아웃트로 마디 |

본문을 한 번 다듬으면 롱폼·솔로 둘 다 동시에 갱신된다.

## 자동 변환 흐름

```
book.{ko,en}.json + meta.{ko,en}.json
  ↓ (sw/remotion/src/compositions/BookRecommend/solo-build.ts)
buildSoloSegments(book, host, narrator, locale)
  → SoloSegment[] 자동 생성
buildSoloScript(bookRecommendScript, bookIndex, epName, slug)
  → SoloScript (마디 배열 + 본문 + 호스트 + 총 길이)
  ↓
soloEpisodes[`{person}-B{NN}`] (script.ts)
  ↓
BookRecommendSolo.tsx (16:9 컴포지션)
```

호스트 측 작업·BO 편집 화면 없음. 책 본문이 곧 솔로 회차.

## Remotion 컴포지션

`BookRecommendSolo.tsx` (1920×1080). 중앙 이미지 + 하단 자막의 단순 레이아웃.

- **음성 미연결**: wav가 아직 없으므로 마디 길이는 텍스트 글자 수 기반 추정(KO 0.18초/글자, EN 0.06초/글자)
- **인용 강조**: `kind: 'quote'` 마디는 자막 영역에서 색 `#f0d9a8`, 크기 56px, 이탤릭 + 출처(`quoteSource`)는 작게
- **이미지 전환**: 한 마디가 길 때 `imageChangeAt` 배열에 의해 마디 안에서 화면을 갈아 끼움. 텍스트 앵커는 마디 텍스트 안 구절 위치 → 글자수 비율 × 마디 길이로 산정 (wav 통합 시 voiceTimings 자연 승격)
- **Studio 트리**: `BookRecommendSolo` 폴더 안 인물별 하위 폴더에 등록

컴포지션 ID 규약·출력 경로·CLI 명령은 [render.md](render.md) 참조.

## 음성 파일명 규약

`vnSolo(bookIndex, segIndex, segId)` ([voice-names.ts](../../../../sw/remotion/src/compositions/BookRecommend/voice-names.ts))

```
voice/{locale}/solo-B{NN}/S{nn}-{segId}.wav
```

실제 wav 생성·정렬 파이프라인 통합은 [voice/tts.md](voice/tts.md) 향후 작업 절 참조.

## 사용 흐름 한눈에

1. **본문 작성** — 시나리오 페이지에서 책 탭(롱폼 작업)을 그대로 진행. 솔로 전용 단계 없음
2. **확인** — Remotion Studio 트리에서 `BookRecommendSolo → {Person} → {Person}-KO-B01-VID` 재생
3. **렌더** — [render.md](render.md) 「명령어」 참조 (`pnpm render:all -- --only solos` 또는 BO 렌더 페이지 「SOLO」 박스)
4. **업로드** — [render.md](render.md) 「CLI 업로드」 참조 또는 BO 유튜브 페이지 「SOLO」 박스

## 향후 작업 (미구현)

음성·자막은 [voice/tts.md](voice/tts.md) 「1권 모드(SOLO) 향후 작업」 절. 이 문서에는 BO·유튜브 영역만:

- **patchMetadata 솔로** — `youtube-upload.ts`의 patch-meta는 현재 longform·shorts만 지원
- **db-sync 솔로** — 업로드 기록을 DB(`profiles.youtube_videos`)로 옮기는 분기 필요
- **YouTubePanel variant 그리드 통합** — 솔로는 별도 박스(`SoloUploadBox`). 메인 variant 그리드에 통합 + 메타 편집기 노출
- **솔로 영상 썸네일** — 자동 썸네일 생성 단계 미구현
- **솔로 전용 태그** — `buildTags` 분기 없음 (현재 롱폼 태그 셋 그대로)

## 폐기된 시도 (참고)

초기 설계에서는 솔로를 별도 데이터(`solo.{ko,en}.json` + `EpisodeData.solos`)로 분리하고, BO 시나리오 페이지에 「솔로」 3번째 탭과 자유 마디 편집기를 두었다. 같은 책 데이터가 두 곳(롱폼 슬롯 / 솔로 마디)으로 흩어져 동기화 부담이 커졌고, 인사·인물 소개·아웃트로 같은 정형 마디는 어차피 고정 변환이라 분리할 명분이 없었다. 따라서 책 본문 한 곳이 단일 SSoT가 되도록 솔로 데이터·편집 화면을 폐기하고, Remotion의 자동 변환 흐름만 남겨 두었다.
