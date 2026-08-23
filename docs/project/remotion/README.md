# Remotion 영상 제작

Remotion으로 만드는 영상 시리즈의 문서 허브다. 이 문서는 진입점만 쥐고, 시리즈별 데이터·제작 규격과 파이프라인 단계는 하위 문서가 쥔다.

## 시리즈

| 시리즈 | 먼저 볼 문서 | 범위 |
|---|---|---|
| 서재 탐방 | [`book-recommend/`](book-recommend/README.md) | 인물의 추천 도서를 소개하는 롱폼·쇼츠·SOLO |
| 책과 사람 | [`book-person/`](book-person/README.md) | 나레이터 단독 세로 쇼츠 |
| 세력도감 | [`faction/`](faction/README.md) | 인물을 진영별로 묶는 시네마틱과 본서비스 세력도감 |
| 가상 담화 | [`discourse/`](discourse/README.md) | 인물의 1인칭 독백·반박·대담 |
| 랭킹 | [`ranking/`](ranking/README.md) | 한 축의 순위를 나레이터가 읽고, 인물마다 설명·이미지가 한 번씩 나온다 |

세력도감의 제작 규칙은 [`faction/rules.md`](faction/rules.md), 데이터 단일화 설계는 [`faction/unification.md`](faction/unification.md), 화면 영상화 검토는 [`faction/video-clips.md`](faction/video-clips.md)가 나눠 맡는다. 가상 담화의 통합 설계는 [`discourse/unification.md`](discourse/unification.md)가 쥔다.

「저승 술집(hell-bar)」은 구현 전에 폐기됐고 가상 담화가 역할을 이어받았다. 기획서는 저장소에서 지웠다.

## 인물 그룹

시리즈와 직교하는 인물 명단은 별도 문서와 코드 SSoT가 쥔다.

| 그룹 | 문서 | 코드 SSoT |
|---|---|---|
| 삼국지 | [`three-kingdoms.md`](three-kingdoms.md) | `packages/shared/src/lib/three-kingdoms.ts` |

공통 제작 함정과 재발 방지 기록은 [`gotchas.md`](gotchas.md)에서 찾는다.

## 제작 관리

현행 편집·출간 창구는 [`docs/project/apps/web-bo.md`](../apps/web-bo.md)다. 구 remotion-bo는 web-bo로 이관하고 앱을 폐기했다.

인물·책 카드를 SNS로 내보내는 카드뉴스 구현 현황은 [`card-news.md`](card-news.md)가 쥔다.

## 코드·데이터 진입점

| 대상 | 진입점 |
|---|---|
| Remotion 앱 | `sw/remotion/src/` |
| 제작 스크립트 | `sw/remotion/scripts/` |
| 서재 탐방 데이터 | `sw/remotion/public/episodes/` |
| 책과 사람 데이터 | `sw/remotion/public/book-person/` |
| 세력도감 데이터 | `sw/remotion/public/factions/` |
| 가상 담화 데이터 | `sw/remotion/public/discourses/` |
| 랭킹 데이터 | `sw/remotion/public/rankings/` |
| 제작 백오피스 | `sw/web-bo/` |

에피소드 폴더 배치와 파일 SSoT는 각 시리즈 문서에서 확인한다. 이 허브에는 상태 폴더·파일 목록을 복제하지 않는다.

## 주요 명령

```bash
pnpm dev:remotion
pnpm dev:bo
```

렌더·음성·이미지처럼 시리즈별 인자가 필요한 명령은 해당 시리즈 문서를 따른다.

## 서재 탐방 음성 파이프라인

단계 번호와 실행 계약의 SSoT는 [`book-recommend/voice/voice-timing-pipeline.md`](book-recommend/voice/voice-timing-pipeline.md)다.

```text
1. pronounce
2. tts          사용자 수동·유료
3. transcribe
4. align
5. chunk
```

본문 변경 뒤 발음 규칙을 점검하고, 사용자가 TTS를 실행한 다음 `/voice-sync <에피소드명>`으로 3~5단계를 잇는다. 스킬 실행 규칙은 [`.agents/skills/remo-voice-sync/SKILL.md`](../../../.agents/skills/remo-voice-sync/SKILL.md)가 쥔다.
