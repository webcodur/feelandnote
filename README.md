# FeelNNote

문화 콘텐츠 경험을 기록하는 서비스입니다. 독서 진행 관리와 감상 작성에 중점을 두며, 향후 영화, 공연 등으로 확장 가능한 아키텍처를 갖추고 있습니다.

**핵심 철학**: 완료 강박 없이, 경험의 과정을 정밀하게 추적하고 보존합니다.

## 프로젝트 구성

이 프로젝트는 **Turborepo 기반 Monorepo** 구조로 되어 있습니다:

### Apps (애플리케이션)
- **app**: 메인 프론트엔드 앱 (사용자용)
- **app-api**: 백엔드 API 서버 (네이버 API 프록시)
- **bo**: 백오피스 프론트엔드 앱 (관리자용)
- **bo-api**: 백오피스 API 서버
- **docs**: 문서

### Packages (공유 라이브러리)
- **core**: 공통 비즈니스 로직
- **api-types**: API 타입 정의
- **config**: 공유 설정

## 기술 스택

### 프론트엔드 (apps/app, apps/bo)
- **프레임워크**: React 19 + TypeScript + Vite
- **상태 관리**:
  - Zustand (인증 상태)
  - TanStack Query (서버 상태)
- **데이터베이스**: Supabase
- **스타일링**: Tailwind CSS v4
- **라우팅**: React Router v7
- **아이콘**: Lucide React

### 백엔드 (apps/app-api, apps/bo-api)
- **런타임**: Node.js + Express
- **용도**: 외부 API 프록시 (CORS 우회) 및 관리자 API

### 외부 API
- 네이버 책 API (주요 도서 검색)
- 카카오 책 API (보조, 예정)
- TMDB API (영화, 예정)

## 시작하기 (Getting Started)

### 1. 의존성 설치

```bash
npm install
```

### 2. 환경 변수 설정

각 앱의 `.env.example` 파일을 복사하여 `.env` 파일을 생성하고 값을 설정하세요.

#### 메인 프론트엔드 (`apps/app/.env`)
```bash
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

#### 메인 백엔드 API (`apps/app-api/.env`)
```bash
NAVER_CLIENT_ID=your_naver_client_id
NAVER_CLIENT_SECRET=your_naver_client_secret
```

#### 백오피스 프론트엔드 (`apps/bo/.env`)
```bash
VITE_BO_API_URL=http://localhost:3002
```

#### 백오피스 API (`apps/bo-api/.env`)
```bash
PORT=3002
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key # 절대 클라이언트 노출 금지
```

### 3. 개발 서버 실행

#### 루트에서 실행 (추천)

```bash
# 모든 앱 동시 실행
npm run dev

# 메인 앱만 실행 (app + app-api)
npm run dev:app

# 백오피스만 실행 (bo + bo-api)
npm run dev:bo
```

- 메인 프론트엔드: http://localhost:3000
- 메인 백엔드: http://localhost:3001
- 백오피스 프론트엔드: http://localhost:4000
- 백오피스 백엔드: http://localhost:3002

## 주요 기능

### 메인 앱 (app)
- **도서 검색**: 네이버 API 연동
- **보관함 관리**: 위시리스트, 경험 중 상태 관리
- **진행률 추적**: 페이지/퍼센트 단위 기록
- **기록 작성**: 리뷰(글), 메모(단상), 인용(발췌)
- **프로필 관리**: 이미지 업로드 및 수정
- **로그인**: 아이디 저장, 자동 로그인 지원

### 백오피스 (bo)
- **대시보드**: 전체 통계, 최근 활동, 인기 콘텐츠
- **콘텐츠 관리**: 메타데이터 수정, 삭제, 통계 확인
- **사용자 관리**: 목록 조회, 상세 정보, 정지/해제, 삭제
- **기록 관리**: 전체 기록 조회 및 삭제

## 아키텍처 및 구현 가이드

### 콘텐츠 타입 시스템
확장 가능한 다형성(polymorphic) 구조를 사용합니다.
- `ContentType`: `'BOOK' | 'MOVIE'`
- `Content`: 통합 인터페이스
- `ContentMetadata`: 타입별 특화 데이터 (JSONB 저장)

### 상태 관리 전략
- **Zustand**: 인증, UI 상태 등 클라이언트 전용 상태
- **TanStack Query**: 서버 데이터 캐싱, 뮤테이션, 무효화

### API 통합 패턴
**네이버 책 API CORS 해결**:
1. 프론트엔드(`app`) → `app-api` (Express) 요청
2. `app-api` → 네이버 API 요청 (Server-to-Server)
3. 응답을 프론트엔드로 중계

### 데이터베이스 (Supabase)
- **users**: 사용자 계정
- **contents**: 콘텐츠 메타데이터 (공유됨)
- **user_contents**: 사용자별 상태 (wish/experience)
- **records**: 통합 기록 (review/note/quote)
- **storage**: `avatars` 버킷 (프로필 이미지)

## 개발 컨벤션

### 컴포넌트 구조
- `components/layout/`: 레이아웃
- `components/[feature]/`: 기능별 컴포넌트 (contents, records 등)
- `pages/`: 라우트 페이지
- `types/`: TypeScript 타입 정의

### 데이터 페칭 (TanStack Query)
```typescript
const { data } = useQuery({ queryKey: ['key'], queryFn: fetcher });
const mutation = useMutation({ mutationFn: updater, onSuccess: invalidate });
```

## 보안 가이드

- **Supabase Keys**:
  - `ANON_KEY`: 클라이언트 사용 가능 (RLS 적용됨)
  - `SERVICE_ROLE_KEY`: **서버 전용** (RLS 우회). 절대 노출 금지.
- **RLS 정책**: 모든 테이블에 Row Level Security 적용 필수.
- **Storage 정책**:
  - `avatars` 버킷: 공개 읽기, 인증된 사용자만 업로드/수정.

## Monorepo 작업

- **새 앱 추가**: `apps/`에 생성 후 `npm install`
- **새 패키지 추가**: `packages/`에 생성 후 `npm install`
- **의존성 관리**: 루트 `package.json`에서 워크스페이스 관리

## 최근 업데이트 (2025.11.25)

### 콘텐츠 카드 및 상세 모달 개선
- **콘텐츠 카드 디자인 개편**:
  - "Clean Cover" 스타일 적용: 버튼을 호버 오버레이로 이동하여 시각적 복잡도 감소.
  - 호버 반응 속도 개선 (즉시 반응) 및 커서 포인터 적용.
- **콘텐츠 상세 모달 개선**:
  - 사용자 진행률/상태 표시 제거 (순수 콘텐츠 정보에 집중).
  - 책 소개(Description), 출판사, 출간일 등 메타데이터 표시 강화.
  - 네이버 책 바로가기 링크 추가.

---
Private Repository
