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
| 셀럽 창작 서가 | — | **완료** | 실시간 Wikidata SPARQL 조회 방식. celeb_works 테이블 DROP 완료 |

* 마지막 작업 시각: 26.03.11

## Wikidata QID 관리 프로세스

셀럽의 창작 서가는 `profiles.wikidata_qid`를 기반으로 실시간 Wikidata SPARQL 조회한다.

### QID 배정 규칙

1. **자동 배정 스크립트**: `sw/web/scripts/bulk-qid.mjs` — `wbsearchentities` API로 영문명 매칭
2. **1차 검증 (필수)**: `sw/web/scripts/verify-qid.mjs` — P31=Q5(인간) 확인. 분화구, 소행성, 건물 등 동명 항목 걸러냄
3. **2차 검증 (필수)**: `sw/web/scripts/verify-qid-birth.mjs` — DB birth_date와 Wikidata P569 생년 대조 (±3년 허용). 동명이인 감지
4. **수동 확인**: 2차 검증 미해결 건은 수동 QID 조회 후 배정. 특히 아래 유형 주의:
   - **BC 인물**: Wikidata 연도 절삭(-384 → -38)으로 거짓 양성 다수. QID 자체는 정상
   - **듀오/그룹**: Coen Brothers, Daft Punk 등 P31≠Q5. 검색 결과 description 확인 필요
   - **동명이인**: Francis Bacon(철학자 vs 화가), Homer(시인 vs 화가) 등. 생년 대조 필수
   - **Wikidata 미등재**: 법정 스님 등 일부 인물은 Wikidata 항목 자체가 없음

### 신규 셀럽 등록 시 QID 배정 절차

`celeb-creation-rulebook` 또는 `celeb-basic-profile` 에이전트에서 셀럽 등록 후:
1. 영문명으로 Wikidata 검색 (`wbsearchentities`)
2. 후보 중 description에 인물 설명이 있는 항목 선택 (crater, asteroid 등 제외)
3. 생년 대조 확인 (DB birth_date vs Wikidata P569)
4. `profiles.wikidata_qid`에 저장

### 실시간 조회 아키텍처

- API: `/api/celeb-works?qid=Qxxx` — 2단계 SPARQL (목록→상세)
- 캐시: 24시간 인메모리 캐시
- UI: `CreativeLibrary.tsx` — 클라이언트 필터링/페이징
- 이미지 커버리지: 미술 85%, 클래식 24%, 영화 13%, 대중음악 4%
