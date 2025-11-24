# FeelNNote

문화 콘텐츠 경험을 기록하는 서비스

## 프로젝트 구조

이 프로젝트는 **Turborepo 기반 Monorepo**로 구성되어 있습니다:

### Apps
- **app**: 메인 프론트엔드 (사용자용)
- **app-api**: 메인 백엔드 API (네이버 API 프록시)
- **bo**: 백오피스 프론트엔드 (관리자용)
- **bo-api**: 백오피스 백엔드 API
- **docs**: 문서

### Packages
- **core**: 공통 비즈니스 로직
- **api-types**: API 타입 정의
- **config**: 공유 설정

## 빠른 시작

### 1. 의존성 설치

```bash
npm install
```

### 2. 환경 변수 설정

각 앱의 `.env.example` 파일을 복사하여 `.env` 파일을 생성하세요:

```bash
# 메인 프론트엔드
cp apps/app/.env.example apps/app/.env

# 메인 백엔드 API
cp apps/app-api/.env.example apps/app-api/.env

# 백오피스 프론트엔드
cp apps/bo/.env.example apps/bo/.env

# 백오피스 백엔드 API
cp apps/bo-api/.env.example apps/bo-api/.env
```

각 `.env` 파일에 실제 값을 입력하세요.

### 3. 개발 서버 실행

#### 메인 앱만 실행 (사용자용)

```bash
npm run dev:app
```

- 프론트엔드: http://localhost:3000
- 백엔드 API: http://localhost:3001

#### 백오피스만 실행 (관리자용)

```bash
npm run dev:bo
```

- 프론트엔드: http://localhost:4000
- 백엔드 API: http://localhost:3002

#### 모든 앱 동시 실행

```bash
npm run dev
```

## 주요 기능

### 메인 앱 (app)
- 도서 검색 (네이버 API)
- 보관함 관리 (위시리스트, 경험 중)
- 진행률 추적
- 기록 작성 (리뷰, 메모, 인용)

### 백오피스 (bo)
- **대시보드**: 전체 통계 및 최근 활동
- **콘텐츠 관리**: 도서/영화 메타데이터 관리
- **사용자 관리**: 사용자 조회, 정지/해제, 삭제
- **기록 관리**: 리뷰/메모/인용 조회 및 삭제

## 기술 스택

### 프론트엔드
- React 19 + TypeScript
- Vite
- TanStack Query (서버 상태)
- Zustand (클라이언트 상태)
- React Router v7
- Tailwind CSS v4
- Lucide React (아이콘)

### 백엔드
- Node.js + Express
- TypeScript
- Supabase (데이터베이스)
- Axios (HTTP 클라이언트)

### 개발 도구
- Turborepo (monorepo 관리)
- npm workspaces
- ESLint
- Prettier

## 빌드

```bash
# 모든 앱 빌드
npm run build

# 특정 앱만 빌드
npm run build:app   # app + app-api
npm run build:bo    # bo + bo-api
```

## 추가 정보

자세한 개발 가이드는 [CLAUDE.md](./CLAUDE.md)를 참고하세요.

## 라이선스

Private
