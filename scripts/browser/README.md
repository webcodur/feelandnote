# 브라우저 백엔드 Plan A/B

feelandnote의 브라우저 작업은 두 백엔드로 나눈다.

## Plan A — Obscura

공개 웹 페이지의 읽기 전용 조사·스크랩용이다. JS 페이지의 본문·Markdown·링크 추출과 MCP 브라우저 조작에 사용한다.

- Obscura: `C:\Tools\obscura\v0.2.0\obscura.exe`
- CDP: `127.0.0.1:9223`
- 저장소: `%LOCALAPPDATA%\Feelandnote\obscura\public-research`
- loopback·사설망 접근은 래퍼에서 차단한다.
- 서버는 `--host 127.0.0.1`로만 연다.
- 스크랩 전 대상 사이트의 robots.txt와 이용 조건을 확인한다.

```text
pnpm browser:plan-a
pnpm browser:status
pnpm browser:fetch-a https://example.com markdown
```

MCP는 루트의 로컬 `.mcp.json`에 등록되어 있다. AI 클라이언트를 재시작하면 `obscura` 도구가 나타난다.

## Plan B — Chrome + Puppeteer

로그인·결제·보안 SDK·복잡한 iframe·서비스 워커·정밀 화면 검수용이다.

- 기존 Chrome CDP: `127.0.0.1:9222`
- 사람이 로그인한 별도 프로필을 사용한다.
- 쿠팡 파트너스 작업은 기존 `sw/web-bo/scripts/coupang/` 흐름을 계속 사용한다.

```text
pnpm browser:plan-b
```

Plan A가 페이지를 제대로 읽지 못하면 Plan B로 전환한다. 두 백엔드를 동시에 같은 로그인 세션으로 사용하지 않는다.

콘텐츠 메타데이터의 공식 출처인 `packages/content-search` 경로는 이 백엔드 선택과 무관하게 유지한다.

독서 방식 작업의 읽기 전용 진행 화면은 `node scripts/browser/reading-way-progress.mjs`로 연다. [HTML](reading-way-progress.html)은 `http://127.0.0.1:4317`에서 DB 집계·실행 상태·작업 기록과 한국 시간 타임스탬프를 자동 갱신한다.

독서 방식 본문·감상배경의 현행 작성 도구는 [`reading-way-web/`](reading-way-web/)에 있다. 사용자 Chrome의 웹 Gemini(Carbon 높음)로 보내는 발송 JS 생성, 회수 원문 대조, 번역·저장, 책장 보완을 맡는다. 실행 순서와 판단 기준은 [독서 방식 룰북](../../docs/project/celeb/celeb-05-02-reading-way.md) 「단독 실행 도구」가 쥐고, 작업 폴더는 [`paths.mjs`](reading-way-web/paths.mjs)가 정한다.

독서 방식 본문과 책장의 전수 대조 후보는 `node --env-file=sw/web-bo/.env --import tsx scripts/browser/reading-way-shelf-scan.mts <결과.json>`로 뽑는다. 초벌이며 판단 기준은 [독서 방식 룰북](../../docs/project/celeb/celeb-05-02-reading-way.md)이 쥔다.

독서 방식에서 조사한 책의 등록은 `node --import tsx scripts/browser/reading-way-books-apply.mjs --plan <절대경로>`로 먼저 확인하고 `--apply`로 반영한다. 조사·검증과 입력의 책임은 [독서 방식 룰북](../../docs/project/celeb/celeb-05-02-reading-way.md)을 따른다.

책 감상경위의 영문 결손은 `node --import tsx scripts/browser/review-en-chatgpt.mjs`로 조회한다. `--translate --limit 8`은 Aside의 ChatGPT Chat에서 파일로 번역·자체 검수하고 임시 폴더에 회수하며, `--apply`를 함께 주면 원문이 그대로이고 영어가 빈 관계만 갱신·재조회하고 캐시를 갱신한다. 종료 시 첫 항목·가장 긴 항목·마지막 항목을 DB에서 다시 읽어 웹 Chat으로 최종 검수하고 남은 결손 수를 출력한다. 기존 영문은 보존한다. 입력·영문 책임은 [영문 데이터](../../docs/project/celeb/celeb-09-01-i18n.md)를 따른다.

`--concurrency 2`는 독립된 Aside 연결 두 개로 번역한다. 추천평 UUID로 대상을 겹치지 않게 나누며 다운로드와 DB 쓰기는 순서대로 처리한다. 번역문은 번호가 붙은 문단별로 받아 합치므로 원문의 문단 수와 구분선이 유지된다.

같은 브라우저의 다른 작업에서 다운로드가 섞이면 요청 ID를 먼저 대조해 그 파일을 반영·삭제하지 않고 선택한 파일의 회수를 최대 세 번 재시도한다. 개별 배송·형식 실패는 해당 묶음과 재개할 대화 URL을 보류 파일에 남기고 다음 묶음으로 넘어간다. 세 묶음 연속 배송 실패나 사용 한도는 입력을 보존하고 중단한다. `--exclude-celeb-ids uuid,...`로 데이터 검수 중인 인물을 반영 대상에서 제외할 수 있다.

Gemini 웹 번역은 `review-en-gemini.mjs --packet <검수한 입력 JSON> --index <계정 번호> --email <화면에서 확인할 계정>`을 `node --import tsx`로 실행한다. Aside REPL로 로그인된 무료 계정의 웹 입력·전송·응답 회수를 제어하며 번역 API를 호출하지 않는다. 입력은 한 인물씩 나누고 작업자가 출처와 책 연결을 먼저 검증한다. Gemini에는 한국어의 영어 번역만 맡긴다. 기본 실행은 결과를 임시 폴더에 저장하며, `--apply`는 현재 행 전체가 입력 당시와 같은지 검사한 뒤 반영·재조회·캐시 갱신까지 수행한다. 요청 ID·문단·제목 자리표시자가 달라진 응답은 반영하지 않는다. 브라우저 계정 번호는 실행 전에 실제 로그인 목록과 대조한다.

[`review-en-chatgpt-web.mjs`](review-en-chatgpt-web.mjs)는 Aside에서 로그인된 Free 계정의 일반 ChatGPT 웹 입력창을 확인하고 번역문을 회수하는 어댑터다. 작업 창과 계정 신원을 고정하고, 전송 확인·잘린 응답 이어받기·임시 확인 안내 감지를 처리한다. 독립 추천평을 묶을 때는 입력의 `independent_rows: true`를 명시하고, 작품별 `title_translations`로 같은 한국어 제목의 다른 작품을 구분한다. 문단 번호와 요청 ID는 묶음 전체에서 검사하며, 개별 문단의 번역 오류는 해당 추천평만 보류할 수 있다. 실제 반영은 공용 검사기와 현재 행 전체 비교를 거친다.

원문 변경으로 재번역할 때는 `--refresh-since YYYY-MM-DD`로 해당 날짜 이후 생성된 추천평을 지정한다. `--created-before ISO`로 대상 생성 시점의 상한을 고정할 수 있다. 이 경우 기존 영어도 현재 원문과 저장값이 그대로인지 확인한 뒤 교체한다. `--exclude slug`는 별도 검수 중인 인물을, `--exclude-review-ids uuid,...`는 이미 검수·반영한 항목을 제외한다. 웹 Chat이 원문 오류를 명시한 항목은 DB에 쓰지 않고 작업 폴더의 `needs-source-review.json`에 남기며 정상 항목을 계속 처리한다. 로그에 나온 작업 폴더에 `stop.requested`를 만들면 이미 보낸 요청까지만 처리하고 새 요청과 종료 검수 요청을 보내지 않는다.
