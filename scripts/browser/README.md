# 브라우저 백엔드 Plan A/B

Feelandnote의 브라우저 작업은 두 백엔드로 나눈다.

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
