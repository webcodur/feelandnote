# AGENTS.md

모든 AI 도구가 먼저 읽는 Feel&Note 저장소의 실행 계약이다. 세부 규격과 진행 현황을 복제하지 않고, 작업에 필요한 문서와 스킬로 연결한다.

## 이 파일의 역할

- 루트에는 거의 모든 작업에 적용되는 규칙과, 라우팅 전에 놓치면 큰 사고가 나는 불변사항만 둔다.
- 특정 앱·데이터·제작 영역의 규칙은 해당 `docs/project/` 문서나 `.agents/skills/`에 둔다.
- 날짜·건수·진행률·Phase·완료 이력·사고 서사는 루트에 적지 않는다.
- 문서 색인·TODO·아카이브 목록을 이 파일에 다시 만들지 않는다. 아래 문서 허브만 가리킨다.
- 물리 줄 수 140줄·UTF-8 크기 12 KiB를 넘기지 않는다. `pnpm check:agents`가 이를 검사한다.

## 프로젝트 개요

Feelandnote는 도서·영상·게임·음악 소비 기록과 인물 기반 큐레이션을 제공한다.

| 앱 | 경로 | 포트 | 책임 |
|---|---|---:|---|
| web | `sw/web` | 3000 | 사용자용 Next.js 웹 |
| web-bo | `sw/web-bo` | 3001 | 관리자·제작 백오피스 |
| remotion | `sw/remotion` | 3002·8001 | 영상 제작 Studio·serve |
| lab | `sw/lab` | 3004 | 2D·3D·게임 실험 |
| audio-bo | `sw/audio-bo` | 3005 | 로컬 음원·받아쓰기·학습·합성 작업실 |
| android | `sw/android` | — | `sw/web`을 감싸는 TWA 셸. Node 워크스페이스가 아니며 Android Studio로 빌드 |

공유 패키지는 `packages/`의 `content-search`, `ai-services`, `influence-constants`, `shared`다.

## 작업·검수·보고

- 명령만 연속으로 나열하지 말고 실행 전 목적, 실행 후 발견 사항과 다음 판단을 짧게 설명한다.
- 긴 작업은 중간 진행 상황을 공유하고, 계획 변경이나 예상 밖의 문제를 즉시 알린다.
- 이미지·코드·문서는 **실행 → 자체 검수 → 작업보고**를 한 덩어리로 완료한다.
- 형식 통과만 보지 말고 개연성·맥락·실사용 가능성을 직접 판단한다. 실패 후보를 성공처럼 보고하지 않는다.
- 완료 보고에는 산출물과 저장 경로, 변경 내용, 검증 결과, 자체 피드백, 현재 사용 가능 여부를 적는다.
- 이미지를 만들면 `C:\project\feelandnote\...`로 시작하는 전체 경로를 반드시 적는다. 여러 장은 파일별 경로를 쓰고, 10장을 넘으면 폴더 경로·파일 수·대표 파일을 적는다.
- 생성 이미지는 사용자가 확인하기 전에 지우지 않는다.

아이디어를 요청받으면 아이디어 자체를 먼저 설명한다. 구현을 요청하지 않았다면 파일 경로·컴포넌트명·코드 구조를 앞세우지 않는다. 기능을 설명할 때도 유저가 무엇을 보고 무엇을 할 수 있는지부터 말한다.

## 주요 명령어

```bash
pnpm dev:web
pnpm dev:bo
pnpm dev:remotion
pnpm dev:lab
pnpm dev:audio-bo

pnpm build:web
pnpm build:bo
pnpm build:audio-bo
pnpm check:agents
```

Remotion의 음성·렌더·R2 명령은 `docs/project/remotion/README.md`가 쥔다. 음성 파이프라인은 `pronounce → tts → transcribe → align → chunk`이며 TTS는 유료 수동 단계다. TTS 뒤에는 `/voice-sync <에피소드명>`으로 3~5단계를 실행한다.

## 기술·환경

- Next.js 16.1, React 19.2, TailwindCSS 4.1, TypeScript 5, Supabase PostgreSQL, pnpm을 사용한다.
- 환경변수와 비밀 파일은 커밋하지 않는다. `.env*`, `.mcp.json`, `**/credentials/`는 로컬에서만 관리한다.
- 새 컴퓨터에서는 비밀 파일을 사람이 직접 옮겨야 하며 빈 서식 파일을 만들지 않는다.
- 키의 용도·배치·발급처·유출 대응은 `docs/project/platform/env-vars.md`만 따른다. 값 자체를 문서에 적지 않는다.

## 전역 불변사항

### UI 상호작용

- 조작 요소의 hover에는 지연 없는 즉각 반응이 최소 하나 있어야 한다. 즉각 축에 `transition`·`delay`를 걸지 않는다.
- 확대·페이드 같은 보조 연출은 다른 엘리먼트에 `transition-transform`처럼 속성을 한정해 적용한다. `transition-all`로 즉각 축을 느리게 만들지 않는다.
- 사이드바·아코디언·모달처럼 공간이 이동·개폐되는 전환은 애니메이션을 사용해도 된다.
- 상세 규칙은 `docs/project/platform/code-rules.md`와 `ui-hover` 스킬을 따른다.

### DB·Remotion 동기화

- 셀럽의 감상배경과 도서 목록은 DB와 Remotion이 일치해야 한다.
- DB에 콘텐츠가 확정되면 `sw/remotion/public/episodes/<셀럽>/books/`에 폴더와 `book.ko.json` 초안을 스캐폴딩한다.
- Remotion 원고의 신규 일화·인용을 DB에 백필할 때는 웹에서 독립적으로 팩트체크한다. 대본이나 3자 큐레이션 해석만으로 DB를 갱신하지 않는다.

### 데이터·외부 서비스

- 실행 규약·허용값·임계값은 코드 상수 하나를 SSoT로 두고 화면·서버 액션·스크립트가 import해 사용한다. 문서는 값을 복제하지 않는다.
- BOOK 신규 메타는 한국어판 카카오, 영문 원서 OpenLibrary만 사용한다. 네이버 책 API와 Google Books를 되살리거나 신규 수집에 사용하지 않는다.
- 셀럽 아바타는 독립된 신원 근거가 있어야 한다. 등록·교체는 `celeb-avatar-register` 스킬과 `docs/project/celeb/celeb-avatar-spec.md`를 따른다.
- 팩션 이미지와 얼굴 REF의 출처·누락 처리·창조 권한은 `faction-image` 스킬이 전부 쥔다. 루트에서 별도 대안을 만들지 않는다.

## 문서·스킬 라우팅

- 전체 문서 지도: `docs/README.md`
- 현역 프로젝트 문서: `docs/project/README.md`
- 게임 문서: `docs/games/README.md`
- 진행 중 작업: `docs/todo/README.md`
- 완료·폐기 이력: `docs/archive/README.md`

작업 전 `docs/README.md`에서 해당 영역만 찾아 읽는다. 모든 문서를 한꺼번에 읽지 않는다. 사용자의 요청과 일치하는 스킬이 있으면 그 `SKILL.md`를 먼저 읽고 스킬이 가리키는 현행 SSoT만 추가로 연다.

글쓰기와 이미지 제작은 각각 `docs/project/production/writing-rules.md`, `docs/project/production/image-generation.md`를 따른다. 앱·서비스·DB·셀럽·영상의 세부 진입점은 `docs/project/README.md`가 쥔다.

## 문서 수명주기

- 현행 규격은 `docs/project/` 또는 `docs/games/`에 둔다.
- 다음 작업이 남은 인수인계와 실행 큐는 `docs/todo/`에 둔다.
- 완료 보고서·회차 스냅샷·폐기 문서는 `docs/archive/`로 옮긴다. 아카이브를 현행 규칙으로 인용하지 않는다.
- DB 반영 전 원고·배치·기계 산출물은 `docs/celeb-data/` 등 해당 데이터 폴더에 둔다.
- 작업이 끝나면 현행 규칙을 담당 SSoT에 흡수하고, TODO에서 제거하고, 필요한 실행 이력만 아카이브한다.
- 문서를 추가·완료·이동·삭제하면 상위 README, 스킬, 코드 주석의 경로를 함께 갱신하고 옛 경로 참조가 0건인지 확인한다.
- 같은 규칙을 여러 README나 `AGENTS.md`에 풀어 쓰지 않는다. 상위 문서는 경로와 책임만 설명한다.
