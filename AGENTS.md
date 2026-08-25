# AGENTS.md

모든 AI 도구가 먼저 읽는 Feel&Note 저장소의 실행 계약이다. 세부 규격과 진행 현황을 복제하지 않고, 작업에 필요한 문서와 스킬로 연결한다.

## 이 파일의 역할

- 루트에는 거의 모든 작업에 적용되는 규칙과, 라우팅 전에 놓치면 큰 사고가 나는 불변사항만 둔다.
- 특정 영역의 규칙은 `docs/project/` 문서나 `.agents/skills/`에 둔다.
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

- **모든 일과 문서 처리란 작업해서 없애는 것이다. 그 외의 모든 작업은 디지털 쓰레기다.**
- 명령만 연속으로 나열하지 말고 실행 전 목적, 실행 후 발견 사항과 다음 판단을 짧게 설명한다.
- 긴 작업은 중간 진행 상황을 공유하고, 계획 변경이나 예상 밖의 문제를 즉시 알린다.
- 이미지·코드·문서는 **실행 → 자체 검수 → 작업보고**를 한 덩어리로 완료한다.
- 형식 통과만 보지 말고 개연성·맥락·실사용 가능성을 직접 판단한다. 실패 후보를 성공처럼 보고하지 않는다.
- 완료 보고에는 산출물과 저장 경로, 변경 내용, 검증 결과, 자체 피드백, 현재 사용 가능 여부를 적는다.
- 이미지를 만들면 바로 열어볼 수 있게 `[파일명](file:///C:/project/feelandnote/...)` 링크로 적는다. 여러 장은 파일별 링크를 쓰고, 10장을 넘으면 폴더 링크·파일 수·대표 파일을 적는다. 교체·재작업이면 비교용 원본 링크도 함께 건다.
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
Oracle 사용자 웹 운영 배포는 `pnpm deploy:web:oracle`, 그 출력이 남긴 앞단 캐시 비우기는 `pnpm purge:web:cloudflare`가 실행점이다. 퍼지까지 끝나야 배포가 끝난다. 절차는 `oracle-web-deploy` 스킬과 `docs/project/platform/external-services.md`의 「Oracle 사용자 웹 운영」을 따른다.

## 기술·환경

- Next.js 16.1, React 19.2, TailwindCSS 4.1, TypeScript 5, Supabase PostgreSQL, pnpm을 사용한다.
- 환경변수와 비밀 파일은 커밋하지 않는다. `.env*`, `.mcp.json`, `**/credentials/`는 로컬에서만 관리한다.
- 새 컴퓨터에서는 비밀 파일을 사람이 직접 옮겨야 하며 빈 서식 파일을 만들지 않는다.
- 키의 용도·배치·발급처·유출 대응은 `docs/project/platform/env-vars.md`만 따른다. 값 자체를 문서에 적지 않는다.

## 전역 불변사항

### DB 스키마 추가 금지

- **AI가 혼자 “새로 필요하다”고 생각한 테이블과 컬럼은 99% 쓰레기다. 만들지 마라.**
- 새 테이블·컬럼은 사용자가 명시적으로 만들라고 지시한 경우에만 만든다. 큐·진행률·작업 상태·후보·원장·인계는 오케스트레이터가 맡는다.

### UI 상호작용

- 조작 요소의 hover에는 지연 없는 즉각 반응이 최소 하나 있어야 한다. 즉각 축에 `transition`·`delay`를 걸지 않는다.
- 확대·페이드 같은 보조 연출은 다른 엘리먼트에 `transition-transform`처럼 속성을 한정해 적용한다. `transition-all`로 즉각 축을 느리게 만들지 않는다.
- 사이드바·아코디언·모달처럼 공간이 이동·개폐되는 전환은 애니메이션을 사용해도 된다.
- 상세 규칙은 `docs/project/platform/code-rules.md`와 `ui-hover` 스킬을 따른다.

### DB·Remotion 동기화

- 독립 대상을 반복 조사하는 릴레이 작업은 `RESEARCH_RELAY_ALGORITHM.md`를 따른다. 그록으로 인물 연표를 채울 때는 `docs/project/celeb/celeb-timeline-grok-relay.md`다.
- 셀럽의 감상배경과 도서 목록은 DB와 Remotion이 일치해야 한다.
- DB에 콘텐츠가 확정되면 `sw/remotion/public/episodes/<셀럽>/books/`에 폴더와 `book.ko.json` 초안을 스캐폴딩한다.
- Remotion 원고의 신규 일화·인용을 DB에 백필할 때는 웹에서 독립적으로 팩트체크한다. 대본이나 3자 큐레이션 해석만으로 DB를 갱신하지 않는다.

### 파일·git 안전

- `git stash`를 쓰지 않는다. 미커밋 변경이 수백 파일 쌓여 있어 pop 한 번 실패하면 작업물이 사라진다. 비교는 `git diff`·`git show HEAD:<파일>`로 한다.
- 커밋은 항상 `git commit -m "..." -- <경로>`로 범위를 지정한다. 커밋과 push는 사용자가 지시할 때만 실행한다.
- 이미지·음성 등 추적 밖 자산은 삭제·덮어쓰기 전에 `git ls-tree HEAD -- <경로>`로 추적 여부를 확인하고 원본을 `_backup`에 복사한다.
- 한글이 든 JSON은 Edit 도구로 고치지 않는다. Node·Python으로 읽기→파싱→쓰기 경로를 쓴다.
- 사용자가 쓴 원고와 편집 중인 파일은 위임받지 않는 한 고치지 않는다. 제안은 텍스트로 먼저 보여준다.
- 유료 API를 쓰는 이미지·음성 생성, 서비스 노출·업로드·발행은 사용자의 명시적 지시 뒤에만 실행한다.

### 개발 서버는 사용자 것이다

사용자는 각 앱의 개발 서버를 직접 띄워 두고 하루 종일 쓴다. 끄면 그 환경이 사라진다. **서버가 필요하면 먼저 `curl -s -o /dev/null -w "%{http_code}" localhost:<포트>`로 확인하고, 떠 있으면 그대로 쓴다.** 코드 변경은 HMR로 반영되므로 재시작할 이유가 없다. 확인 없이 `pnpm dev:*`부터 치면 두 번째 인스턴스가 떠 같은 `.next`를 두고 충돌하고, 그걸 수습하려다 사용자 서버까지 죽인다 — 이 순서를 거꾸로 밟아 실제로 사고가 났다.

`Stop-Process`·`taskkill`로 `next dev`를 명령줄 패턴으로 싹 쓸지 않는다(누가 띄웠는지 구분하지 못한다). 자기가 띄운 것만 자기가 받은 PID로 끈다. 포트는 「프로젝트 개요」 표를 따른다. `pnpm build:*`는 `.next`를 개발 서버와 함께 써 충돌하므로 먼저 알리고 동의를 받는다. 캐시는 재시작이 아니라 `/api/revalidate`로 푼다.

### 데이터·외부 서비스

- 실행 규약·허용값·임계값은 코드 상수 하나를 SSoT로 두고 화면·서버 액션·스크립트가 import해 사용한다. 문서는 값을 복제하지 않는다.
- BOOK 신규 메타는 한국어판 카카오, 영문 원서 OpenLibrary만 사용한다. 네이버 책 API와 Google Books를 되살리거나 신규 수집에 사용하지 않는다.
- 셀럽 아바타는 독립된 신원 근거가 있어야 한다. 등록·교체는 `celeb-avatar-register` 스킬과 `docs/project/celeb/celeb-avatar-spec.md`를 따른다.
- 팩션 이미지와 얼굴 REF의 출처·누락 처리·창조 권한은 `faction-image` 스킬이 전부 쥔다. 루트에서 별도 대안을 만들지 않는다.

## 문서·스킬 라우팅

- 에이전트 운용 원칙: `docs/project/agent-rules.md` (착수 전 조사, 위임, 사실성, 지시 해석, 보고 방식, 도구)
- 전체 문서 지도: `docs/README.md`
- 현역 프로젝트 문서: `docs/project/README.md`
- 게임 문서: `docs/games/README.md`
- 진행 중 작업: `docs/todo/README.md`
- DB 반영 전 인물 원고·기계 산출물: `data/celeb/README.md`

작업 전 `docs/README.md`에서 해당 영역만 찾아 읽는다. 모든 문서를 한꺼번에 읽지 않는다. 사용자의 요청과 일치하는 스킬이 있으면 그 `SKILL.md`를 먼저 읽고 스킬이 가리키는 현행 SSoT만 추가로 연다.

전문 도메인 작업은 별도 에이전트 정의 없이 서브에이전트에 아래 룰북을 물려 발주한다. 발주 프롬프트에 룰북 경로를 명시하지 않으면 지침 없이 도는 서브에이전트가 나온다.

| 작업 | 물릴 룰북 |
|------|-----------|
| 셀럽 파이프라인 전 단계 | `docs/project/celeb/celeb-pipeline.md` (단계별 룰북 표를 그 안에서 쥔다) |
| 셀럽 콘텐츠 감사 | `docs/project/celeb/celeb-content-audit.md` |
| 영상 원고 0~7단계 | `docs/project/remotion/book-recommend/rules.md` + `writer/<단계>.md` |
| 천도 게임 개발 | `docs/games/suikoden/dev-guide.md` |

글쓰기와 이미지 제작은 각각 `docs/project/production/writing-rules.md`, `docs/project/production/image-generation.md`를 따른다. 앱·서비스·DB·셀럽·영상의 세부 진입점은 `docs/project/README.md`가 쥔다.

## 문서 수명주기

- 현행 규격은 `docs/project/` 또는 `docs/games/`에 둔다.
- 다음 작업이 남은 인수인계와 실행 큐는 `docs/todo/`에 둔다.
- 완료 보고서·회차 스냅샷·폐기 문서는 남기지 않는다. 규칙을 담당 SSoT로 옮긴 뒤 문서를 지운다. 경위가 필요하면 커밋 이력에서 꺼낸다.
- DB 반영 전 원고·배치·기계 산출물은 `data/celeb/` 등 데이터 폴더에 둔다. 문서 폴더에 데이터를 쌓지 않는다.
- 작업이 끝나면 현행 규칙을 담당 SSoT에 흡수하고, TODO에서 제거하고, 남은 문서를 지운다.
- 문서를 추가·완료·이동·삭제하면 상위 README, 스킬, 코드 주석의 경로를 함께 갱신하고 옛 경로 참조가 0건인지 확인한다.
- 같은 규칙을 여러 README나 `AGENTS.md`에 풀어 쓰지 않는다. 상위 문서는 경로와 책임만 설명한다.
