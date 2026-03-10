# AGENTS.md

프로젝트 가이드 단일원천. 모든 AI 도구(Claude, Codex 등)는 이 파일을 참조한다.

## 프로젝트 개요

Feelandnote는 콘텐츠(도서, 영상, 게임, 음악, 자격증) 소비 기록 및 관리 서비스다. Neo-Pantheon(고전 신전) 테마의 다크 UI. 모노레포 구조:
- `sw/web` - 사용자용 웹 (포트 3000)
- `sw/web-bo` - 관리자 백오피스 (포트 3001)
- `packages/content-search` - 외부 콘텐츠 검색 API (Naver, TMDB, IGDB, Spotify, Google Books, Q-Net)
- `packages/ai-services` - AI 서비스 (셀럽 프로필 타입, 영향력 분석)
- `packages/influence-constants` - 영향력 평가 상수
- `packages/shared` - 공유 상수, 타입, 훅

## 주요 명령어

```bash
pnpm dev:web    # 사용자 웹 (포트 3000)
pnpm dev:bo     # 관리자 백오피스 (포트 3001)
pnpm build:web
pnpm build:bo
```

## 기술 스택

- Next.js 16.1 (App Router, Server Components)
- React 19.2
- TailwindCSS 4.1 (@theme CSS Variables)
- Supabase (PostgreSQL, 인증, SSR)
- TypeScript 5, pnpm

## content_locales 테이블

콘텐츠의 로케일별 데이터를 저장한다. PK: `(content_id, locale)`. `contents` 테이블에는 언어 무관 필드만 남고, 언어별 필드(title, creator, thumbnail_url, description, isbn, publisher 등)는 전부 이 테이블에 있다. `sources` JSONB로 필드별 데이터 출처를 추적한다.

상세 구조, sources 스키마, 썸네일 수집 규칙, 헬퍼 함수 등은 `docs/project/content-locales-design.md` 참조.

## Google Analytics

- GA4 Measurement ID: `G-LMVY8KTJ7T` (layout.tsx에 설정)
- GA4 Property ID: `526353156`
- Service Account: `claude-analytics@feelandnote.iam.gserviceaccount.com`
- 크리덴셜 파일: `sw/web/credentials/ga-service-account.json` (.gitignore 등록)
- env: `sw/web/.env` → `GA_PROPERTY_ID`, `GA_CREDENTIALS_PATH`
- 활성화된 API: Google Analytics Data API. Admin API는 미활성화.

## 상세 레퍼런스

작업에 해당하는 문서만 참조한다.

| 문서 | 내용 | 참조 시점 |
|------|------|----------|
| `docs/project/db-core.md` | DB 스키마 — 사용자, 콘텐츠, 커뮤니티 | 일반 DB 작업, 쿼리 작성 |
| `docs/project/db-celeb.md` | DB 스키마 — 셀럽 전용 테이블, 룰북 안내 | 셀럽 관련 작업 |
| `docs/project/content-locales-design.md` | content_locales 마이그레이션 설계 | 로케일 데이터 구조 변경 |
| `docs/project/architecture.md` | 디렉토리 구조, 네비게이션, 라우팅 | 파일 위치 파악, 라우트 작업 |
| `docs/project/code-rules.md` | 코드 규칙, 디자인 시스템 | UI 개발, 코드 작성 |
| `docs/project/external-services.md` | Supabase, R2, 크론잡 | 외부 서비스 연동 |
| `docs/project/i18n.md` | 다국어화 계획, 진행 현황, 기술 참조 | i18n 작업 |
| `docs/project/monetization.md` | 수익화 방안 탐색 (AdSense 등) | 수익화 전략 수립 |
| `docs/en-book-data-quality.md` | BOOK en 데이터 진단·수정 프로세스·API 사양·이력 | en 데이터 재검증 작업 |
| `docs/suikoden-sim/` | 천도 게임 기획서 (10개 문서) | 게임 개발 |

## TODO

미완료 작업 목록. 각 항목의 상세 계획은 `docs/todo/` 디렉토리 참조.
TODO 작업자는 작업 후 이 파일을 업데이트 하여 아래 QUEUE를 제거하고 추후의 개발자에게 정보를 공유할 필요성이 있는 경우 상단의 "상세 레퍼런스" 에서 참조할 수 있는 문서를 따로 작성함으로서 마무리를 해줘야 한다.

| 작업 | 계획서 | 상태 | 비고 |
|------|--------|------|------|
| BOOK en 데이터 전량 재검증 | `docs/en-book-data-quality.md` | **완료** | naver_book 2,364건 전량 verified. 한글/CJK 잔존 0건 |
| VIDEO 영문 썸네일 수집 (1,340건) | `docs/todo/video-en-thumbnails.md` | **완료** | 1,326건 수집, 14건 unavailable |
| Supabase 타입 재생성 | — | 대기 | content_locales 포함, 현재 `as any` 캐스팅 |
| 셀럽 창작 서가 데이터 수집 | `docs/todo/celeb-works.md` | 대기 | BOOK en 재검증 완료. 착수 가능 |

* 마지막 작업 시각: 26.03.10
