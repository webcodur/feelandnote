# Copilot / AI 에이전트 지침 (간략)

이 파일은 이 리포지토리에서 AI 코딩 에이전트(Copilot, Claude, Cursor 등)가 바로 생산적으로 작업할 수 있도록 핵심 정보만 요약합니다.

요점(한눈에)
- 모노레포: `sw/web` (사용자 웹, 포트 3000), `sw/web-bo` (백오피스, 포트 3001), `packages/*` (공유 로직/AI/검색)
- 프레임워크: Next.js 16 (App Router, Server Components), TypeScript, pnpm, Supabase
- 주요 명령: `pnpm dev:web`, `pnpm dev:bo`, `pnpm build:web`, `pnpm build:bo`

아키텍처와 데이터 흐름(핵심)
- 프론트엔드 앱: `sw/web/src/app` — 라우트는 App Router 구조, Server Actions는 `sw/web/src/actions/*`에 모여 있음.
- 백오피스: `sw/web-bo/src/app` 및 `sw/web-bo/src/actions/admin/*`.
- 검색/AI 서비스: `packages/content-search/src/*` (tmdb, spotify, naver-*, google-books 등), `packages/ai-services/src/*` (Gemini 연동, title-translator 등).
- DB/콘텐츠 ID: 웹(사용자-facing)은 접두사 포함 외부 ID를 `contents.id`로 사용 (VIDEO: `tmdb-movie-{id}`/`tmdb-tv-{id}`, MUSIC: `spotify-{id}`, GAME: `igdb-{id}`, BOOK: ISBN). 백오피스는 `contents.id`로 UUID를 쓰고 외부 ID는 `external_id`에 보관 — ID 타입 차이에 유의.
- 핵심 호출 예: 콘텐츠 상세는 `/content/[contentId]` → `getContentDetail(contentId, category)` 호출 경로를 추적하세요.

프로젝트 규약(에이전트가 지켜야 할 구체적 규칙)
- 파일 길이: 파일당 200줄 이하 유지.
- 타입: `any` 및 `Record<string, unknown>` 사용 금지.
- ENUM 네이밍: `ENUM_` 접두사 + 언더바 표기.
- 컴포넌트: 조건부 렌더링은 `&&` 사용(삼항 연산 금지), `left/right` 대신 `start/end` 사용.
- 코드 스타일: early return 권장, 삼항식·객체 맵핑 권장, switch보다 객체 매핑 선호.
- 아이콘: `lucide-react`(범용) + 프로젝트 테마 아이콘(`neo-pantheon`) 사용.
- 경로: 대규모 외부 모듈은 절대 경로(`@/...`), 소규모 내부는 상대경로(`./`) 사용.

탐색해야 할 파일/디렉터리(우선 순위)
- 앱 라우트/액션: `sw/web/src/app/`, `sw/web/src/actions/` — Server Actions 패턴 이해 필수.
- 백오피스 액션: `sw/web-bo/src/actions/admin/`.
- 검색 제공자 샘플: `packages/content-search/src/spotify.ts`, `tmdb.ts`, `naver-books.ts`.
- AI 서비스: `packages/ai-services/src/` (예: `gemini.ts`, `title-translator.ts`).
- 공유 타입/상수: `packages/shared/src/`, `packages/influence-constants/src/`.
- 네비게이션 SSoT: `sw/web/src/constants/navigation.tsx`.
- 디자인·상수: `sw/web/src/constants/zIndex.ts`, `constants/image.ts`, `constants/influence.ts`.

빌드·개발 워크플로우(실용 예시)
- 개발 서버: `pnpm dev:web` (사용자 웹), `pnpm dev:bo` (백오피스).
- 빌드: `pnpm build:web`, `pnpm build:bo`.
- Git Subtree 동기화(문서용): `docs/rules/FE/README.md`의 `git subtree pull/push` 명령 참고.

통합 포인트와 외부 의존성
- Supabase: 인증/DB/서버 사이드 렌더링 관련 코드가 많음 — `sw/web/src/lib/supabase`와 `sw/web-bo/src/lib/supabase` 확인.
- 외부 API: Spotify, TMDB, Naver 등 — `packages/content-search`에 provider별 파일이 존재.
- AI: `packages/ai-services`가 AI 관련 로직과 프롬프트(예: `prompts/`)를 보관.

주의사항(에이전트별 권장 행동)
- 변경 전: 관련 `constants`/`types` 먼저 찾기 (예: `packages/shared/src/types`).
- DB 관련 변경은 `contents.id` 규칙(웹 vs 백오피스)을 깨지 않도록 주의.
- UI 변경 시 `components/features/*` 패턴을 따라 컴포넌트 분리 및 상수 배열 + `map` 렌더링 스타일 유지.
- 문서/동기화: 프론트엔드 공통 문서는 `docs/_fe/`(Git Subtree)에서 관리됩니다.

더 읽어볼 파일
- 리포지토리 루트: `CLAUDE.md` (프로젝트 개요, 명령어 요약)
- `docs/rules/FE/README.md` (subtree 및 프론트엔드 문서화 워크플로우)
- `sw/web/README.md`, `sw/web-bo/README.md`

질문 또는 불명확한 부분이 있으면 알려주세요 — 원하는 세부 항목(테스트, 린트, 배포 파이프라인 등)을 추가로 정리해 드리겠습니다.
