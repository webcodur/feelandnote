# CLAUDE.md

이 파일은 Claude Code(claude.ai/code)가 이 저장소에서 작업할 때 참고할 가이드입니다.

## 프로젝트 개요

**FeelNNote**는 문화 콘텐츠 경험을 기록하는 서비스로, 독서 진행 관리와 감상 작성에 중점을 둡니다. MVP는 도서에 집중하되, 영화, 공연 등 다른 문화 콘텐츠로 확장 가능한 아키텍처를 갖추고 있습니다.

**핵심 철학**: 완료 강박 없이, 경험의 과정을 정밀하게 추적하고 보존합니다. 50%만 읽은 책도 소중한 경험입니다.

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
- **런타임**: Node.js
- **프레임워크**: Express
- **용도**: 외부 API 프록시 (CORS 우회)

### 외부 API
- 네이버 책 API (주요 도서 검색) - **구현됨**
- 카카오 책 API (보조, 예정)
- TMDB API (영화, 예정)

## 개발 명령어

### 루트 디렉토리에서 (모든 앱 동시 실행)

```bash
# 의존성 설치
npm install

# 모든 개발 서버 시작 (모든 apps/* 앱을 동시에 실행)
npm run dev

# 메인 앱만 시작 (app + app-api)
npm run dev:app

# 백오피스만 시작 (bo + bo-api)
npm run dev:bo

# 모든 앱 빌드
npm run build

# 특정 앱만 빌드
npm run build:app   # app + app-api
npm run build:bo    # bo + bo-api

# 린터 실행
npm run lint
```

### 개별 앱 디렉토리에서 실행

```bash
# 메인 프론트엔드 앱 (apps/app)
cd apps/app
npm run dev          # http://localhost:5173
npm run build
npm run preview

# 백엔드 API 서버 (apps/app-api)
cd apps/app-api
npm run dev          # http://localhost:3001
npm start            # 프로덕션 모드
```

**중요**: 검색 기능이 작동하려면 **app-api 백엔드 서버가 반드시 실행**되어야 합니다.

## 환경 설정

환경 변수는 **두 곳**에 설정해야 합니다:

### 1. 프론트엔드 앱 (`apps/app/.env`)

```bash
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

- Vite에서 환경 변수를 클라이언트에서 접근하려면 `VITE_` 접두사가 필요합니다.
- `.env.example` 파일을 복사하여 `.env` 파일을 생성하세요.

### 2. 백엔드 API 서버 (`apps/app-api/.env`)

```bash
NAVER_CLIENT_ID=your_naver_client_id
NAVER_CLIENT_SECRET=your_naver_client_secret
```

- 네이버 책 API 프록시를 위한 인증 정보입니다.
- 백엔드에서는 `VITE_` 접두사가 **필요 없습니다**.

## 프로젝트 구조

### Monorepo 전체 구조

```
feelnnote/
├── apps/
│   ├── app/              # 메인 프론트엔드 앱
│   ├── app-api/          # 메인 백엔드 API (네이버 프록시)
│   ├── bo/               # 백오피스 프론트엔드
│   ├── bo-api/           # 백오피스 백엔드 API
│   └── docs/             # 문서
├── packages/
│   ├── core/             # 공통 비즈니스 로직
│   ├── api-types/        # API 타입 정의
│   └── config/           # 공유 설정
├── supabase/
│   └── migrations/       # 데이터베이스 마이그레이션
├── package.json          # 루트 워크스페이스 설정
└── turbo.json            # Turborepo 설정
```

### 메인 프론트엔드 앱 구조 (apps/app/src/)

```
apps/app/src/
├── components/
│   ├── layout/           # Header, Sidebar, Layout
│   ├── contents/         # 콘텐츠 검색 및 표시
│   ├── records/          # 기록 관련 컴포넌트
│   └── archive/          # 보관함 관련 컴포넌트
├── pages/                # 라우트 레벨 페이지 컴포넌트
├── lib/
│   ├── supabase.ts       # Supabase 클라이언트
│   └── api/              # 외부 API 통합 (네이버, 카카오 등)
├── hooks/                # 커스텀 React hooks
├── store/                # Zustand 스토어
├── types/                # TypeScript 타입 정의
└── assets/               # 정적 자산
```

### 백엔드 API 서버 구조 (apps/app-api/)

```
apps/app-api/
├── server.js             # Express 서버 (네이버 API 프록시)
├── .env                  # 네이버 API 인증 정보
└── package.json
```

## 아키텍처 패턴

### 콘텐츠 타입 시스템

확장 가능한 다형성(polymorphic) 콘텐츠 시스템:

- `ContentType`: `'BOOK' | 'MOVIE'` (향후 `'PERFORMANCE'` 등으로 확장 가능)
- `Content` interface: 모든 콘텐츠 타입을 위한 통합 구조
- `ContentMetadata`: 타입별 특화 메타데이터 (예: 도서는 `page_count`, 영화는 `runtime`)

새 콘텐츠 타입 추가 시:
1. `apps/app/src/types/content.ts`의 `ContentType` 유니온에 타입 추가
2. `ContentMetadata`에 타입별 필드 확장
3. `apps/app/src/lib/api/`에 API 통합 생성
4. `useContentSearch` 훅에 검색 로직 추가
5. 필요시 `apps/app-api/server.js`에 새로운 API 프록시 엔드포인트 추가

### 진행률 추적 전략

진행률은 타입에 따라 다름:
- **도서**: 페이지 기반 (`142 / 320 쪽`) 또는 퍼센트
- **영화**: 타임스탬프 기반 (예정)
- **공연**: 단일 관람 기록 또는 퍼센트 (예정)

각 UserContent 레코드에 `progress_type`을 저장하여 다양한 추적 방식을 처리합니다.

### 상태 관리

- **Zustand**: 인증, UI 상태를 위한 경량 상태
- **TanStack Query**: 서버 상태, 캐싱, 뮤테이션
  - 모든 Supabase 쿼리에 사용
  - 자동 리페칭 및 캐시 무효화 구현

### API 통합 패턴

**네이버 책 API CORS 문제 해결**:
- **구현 완료**: `apps/app-api/` Express 서버가 프록시 역할을 수행합니다
- 프론트엔드(`apps/app`)는 `http://localhost:3001/api/search/books`로 요청
- 백엔드(`apps/app-api`)가 네이버 API를 호출하고 응답 중계
- 프로덕션: app-api를 배포하여 동일한 방식으로 작동

API 응답 흐름:
1. 프론트엔드 → `apps/app-api` (Express 서버)
2. `apps/app-api` → 네이버 책 API (CORS 우회)
3. 네이버 API → Raw 응답
4. `apps/app/src/lib/api/` → 통합 `Content` 타입으로 변환
5. Supabase에 캐싱 (예정)
6. 클라이언트에 반환

## 데이터베이스 아키텍처 (Supabase)

주요 엔티티 구조 (완전한 스키마는 FeelNNote.md 참조):

- **users**: 사용자 계정
- **contents**: 콘텐츠 메타데이터 (다형성, 사용자 간 공유)
- **user_contents**: 사용자-콘텐츠 관계 (상태: wish/experience)
- **progress_history**: 진행률 히스토리 추적
- **records**: 통합 기록 테이블 (type: review/note/quote)
  - (기존 notes, reviews, quotes 테이블을 통합하거나 뷰로 관리)

콘텐츠 메타데이터는 유연성을 위해 타입별 필드에 JSONB를 사용합니다.

## 기능 구현 가이드

### 사용자 콘텐츠 상태

두 가지 상태 (고정):
- `wish`: 관심 있음 (보관함에 담음)
- `experience`: 경험 중/경험 함 (진행률 0~100%)

'완료' 상태는 별도로 존재하지 않습니다. 100% 진행률이 곧 완료를 의미하지만, 상태값은 여전히 `experience`입니다.
상태 전환은 양방향입니다.

### 기록 (Record) 시스템

모든 기록은 `Record`라는 상위 개념으로 통합됩니다.

- **Review (글)**: 전체적인 감상, 평점 포함 가능
- **Note (메모)**: 특정 구간에 대한 단상
- **Quote (인용)**: 본문 인용

UI에서는 "기록 남기기"로 통합 접근하며, 작성 시 타입을 선택하거나 문맥에 따라 자동 결정됩니다.

### 진행률 기록

항상 저장:
- 이전 값
- 현재 값
- 타임스탬프
- 선택: 세션 정보 (시작/종료 시간, 소요 시간)

UI 패턴: 클릭하여 인라인 편집, blur 시 자동 저장. 저장 버튼 불필요.

## 개발 컨벤션

### 컴포넌트 구성

메인 앱 (`apps/app/src/`) 기준:
- 레이아웃 컴포넌트: `components/layout/`
- 기능별 컴포넌트: `components/[feature]/` (예: `contents/`, `records/`, `archive/`)
- 페이지 컴포넌트: `pages/`
- 공유/재사용 컴포넌트: `components/common/` (필요 시 생성)
- 여러 앱에서 공유되는 컴포넌트: `packages/core/` (필요 시 생성)

### TypeScript

- 객체 형태는 interface 선호
- 유니온 및 원시 타입은 type alias 사용
- API 응답 타입과 도메인 타입을 분리하여 정의
- `types/` 디렉토리에서 타입 export

### 스타일링

- Tailwind 유틸리티 클래스 사용
- 커스텀 CSS는 최소화
- 조건부 클래스는 `clsx` 또는 `tailwind-merge` 사용
- 반응형 디자인: 모바일 우선 접근

### 데이터 페칭

TanStack Query 패턴:
```typescript
const { data, isLoading, error } = useQuery({
  queryKey: ['resource', id],
  queryFn: () => fetchFromSupabase(id),
});
```

Mutations:
```typescript
const mutation = useMutation({
  mutationFn: updateResource,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['resource'] });
  },
});
```

## API 통합 참고사항

### 검색 전략

MVP 기본 흐름:
1. 네이버 책 API 쿼리
2. 통합 `Content` 형식으로 변환
3. 결과 표시

향후 개선 계획:
1. 먼저 로컬 Supabase 캐시 확인
2. 캐시 미스 시, 네이버 → 카카오 쿼리
3. ISBN 기준 중복 제거
4. 결과 캐싱
5. 병합된 결과 반환

### 수동 콘텐츠 등록

외부 API에 없는 도서:
- 사용자 입력: 제목, 저자 (필수), 표지, 출판사, 연도, ISBN, 페이지 수 (선택)
- 표지 없으면 제목 + 저자로 기본 표지 생성
- 저장 전 유사 콘텐츠 검색 (중복 방지)
- 사용자 생성 콘텐츠는 비공개 (다른 사용자 검색 불가)

## 주요 구현 세부사항

### 진행률 타입

```typescript
type ProgressType = 'page' | 'percent' | 'timestamp' | 'episode';
```

콘텐츠 타입에 따라 결정. 도서는 'page', 영화는 'timestamp'가 기본.

### 세션 추적 (선택 기능)

타이머 기반 또는 수동 입력:
- 사용자가 콘텐츠를 경험한 시간 기록
- 소요 시간 추적
- 종료 시 진행 위치 업데이트
- 브라우저 종료에도 유지 (서버에 저장)

파워 유저 기능이며, 핵심 기능은 이것 없이도 작동합니다.

### 데이터 내보내기

여러 형식 지원:
- 개별 감상: Markdown, PDF, PNG (소셜 공유 카드)
- 전체 내보내기: JSON (구조화), CSV (테이블별)

대용량 내보내기는 백그라운드 작업 사용, 이메일 알림 전송.

### 인증 흐름

- 이메일/비밀번호 및 OAuth (카카오, 구글)
- 초기에 이메일 인증 불필요
- 세션 관리: 기본 7일, "로그인 유지" 선택 시 30일
- 다중 기기 로그인 허용

## 번역 및 현지화

현재: 한국어 UI (FeelNNote.md 기반 주요 언어)
향후: 사용자 로케일에 따른 i18n 지원

## 테스트 접근 방식 (구현 시)

- 유틸리티 및 훅의 단위 테스트
- API 변환의 통합 테스트
- 주요 흐름의 E2E 테스트 (서재에 추가, 감상 작성)
- 테스트에서 Supabase 및 외부 API 모킹

## 알려진 제한사항 / TODO

### 구현 완료
- ✅ 네이버 API CORS 문제: Express 백엔드 프록시로 해결 (`apps/app-api`)
- ✅ Monorepo 구조: Turborepo로 앱 및 공유 패키지 관리

### 구현 필요
- ❌ 수동 콘텐츠 등록: 아직 미구현
- ❌ 카카오 책 API 보조: 계획되었으나 미통합
- ❌ 백오피스(bo) 기능: 기본 구조만 생성됨
- ❌ 공유 패키지 활용: `packages/core`, `packages/api-types` 활용도 낮음
- ❌ 프로덕션 배포 설정: app-api 배포 전략 미정

### MVP 범위 외
- 소셜 기능
- 통계 대시보드
- 다중 콘텐츠 타입 UI (도서만 활성화)
- 다국어 지원(i18n)

## 성능 고려사항

- 검색 입력 디바운스 (300ms 권장)
- 콘텐츠 목록 페이지네이션 (기본 20개)
- 이미지 지연 로딩 (특히 도서 표지)
- 외부 API 응답을 Supabase에 캐싱
- 비용이 큰 컴포넌트에 React.memo 사용 (콘텐츠 카드)

## 보안 참고사항

- `.env` 파일 절대 커밋 금지 (`apps/app/.env`, `apps/app-api/.env` 모두)
- Supabase RLS 정책으로 사용자 데이터 격리 강제
- 사용자 입력 무해화 (특히 수동 콘텐츠 등록)
- 사용자 생성 콘텐츠의 HTML 이스케이프 처리 (감상, 메모)
- 쿼터 소진 방지를 위한 외부 API 호출 속도 제한
- app-api의 CORS 설정: 허용된 origin만 접근 가능하도록 관리

## Monorepo 작업 가이드

### 워크스페이스 이해

이 프로젝트는 npm workspaces와 Turborepo를 사용합니다:
- 루트 `package.json`에서 모든 워크스페이스를 관리
- `apps/*`와 `packages/*`는 독립적인 패키지로 동작
- 공유 의존성은 루트에서 호이스팅

### 패키지 간 의존성

앱에서 공유 패키지 사용 예시:
```json
// apps/app/package.json
{
  "dependencies": {
    "@feelnnote/core": "*",
    "@feelnnote/api-types": "*"
  }
}
```

### 새 앱 추가하기

1. `apps/` 디렉토리에 새 앱 폴더 생성
2. `package.json` 생성 (name은 `@feelnnote/앱이름` 권장)
3. 루트 `package.json`의 `workspaces`에 이미 포함되어 있음
4. 필요시 `turbo.json`에 빌드 설정 추가
5. 루트에서 `npm install` 실행

### 새 공유 패키지 추가하기

1. `packages/` 디렉토리에 새 패키지 폴더 생성
2. `package.json` 생성 (name은 `@feelnnote/패키지이름`)
3. `src/index.ts`에 export할 코드 작성
4. 사용하려는 앱의 `package.json`에 의존성 추가
5. 루트에서 `npm install` 실행
