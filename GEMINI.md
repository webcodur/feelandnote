# GEMINI.md

This file provides context and guidance for Gemini Code Assist when working with the **Feelnnote** project.

## 1. 프로젝트 개요 (Project Overview)
**Feelnnote**는 콘텐츠(도서, 영상, 게임, 음악, 자격증) 소비 기록 및 관리 서비스입니다.
사용자는 자신의 문화 생활을 기록하고, 타인(친구, 셀럽)의 기록을 탐색하며 영감을 얻을 수 있습니다.

### 모노레포 구조
- `sw/web`: 사용자용 웹 애플리케이션 (Next.js 16, Port 3000)
- `sw/web-bo`: 관리자 백오피스 (Next.js, Port 3001)
- `packages/api-clients`: 공유 API 클라이언트

## 2. 기술 스택 (Tech Stack)
- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript 5
- **Styling**: TailwindCSS 4
- **Database / Auth**: Supabase (PostgreSQL)
- **State Management**: React Context, Server Actions
- **Package Manager**: pnpm

## 3. 데이터베이스 스키마 (Database Schema)
Supabase (PostgreSQL)을 사용합니다. 주요 테이블 구조는 다음과 같습니다.

### `profiles` (사용자/셀럽 프로필)
- `id`: UUID (PK)
- `email`, `nickname`, `avatar_url`: 기본 정보
- `profile_type`: 'USER' | 'CELEB'
- `role`: 'user' | 'admin' | 'super_admin'
- `bio`, `profession`: 프로필 상세
- `claimed_by`: 셀럽 계정을 관리하는 실제 유저 ID (있는 경우)

### `contents` (콘텐츠 메타데이터)
- `id`: UUID (PK)
- `title`, `description`, `thumbnail_url`: 콘텐츠 정보
- `type`: 'BOOK' | 'VIDEO' | 'GAME' | 'MUSIC' | 'CERTIFICATE'
- `external_id`: 외부 API(ISBN 등) 식별자

### `user_contents` (사용자 기록)
- `id`: UUID (PK)
- `user_id`: UUID (FK -> profiles.id)
- `content_id`: UUID (FK -> contents.id)
- `status`: 'completed' | 'watching' | 'paused' | 'wish'
- `rating`: 평점
- `review`: 리뷰 텍스트

### `follows` (팔로우 관계)
- `follower_id`: UUID (FK -> profiles.id)
- `following_id`: UUID (FK -> profiles.id)

### `celeb_influence` (셀럽 영향력 지표)
- `celeb_id`: UUID (FK -> profiles.id)
- `tech`, `art`, `social` 등 각 분야별 영향력 수치 및 설명

## 4. 아키텍처 및 라우팅 (Routing Architecture)
### 현재 (As-Is)
- `(main)/archive/user/[userId]`: 타인 프로필
- `(main)/archive`: 내 기록관 (리다이렉트)
- `(main)/page.tsx`: 홈 (피드/추천)

### 개편 예정 (To-Be: GitHub Style)
- **Dashboard (`/`)**: 통합 피드 + 추천 사이드바
- **Profile (`/[userId]`)**: 통합 프로필 (내꺼/남꺼 구분 없음)
  - Layout: `Header(Global)` -> `Context Header(User)` -> `Sidebar + Main Content`
- **Explore (`/explore`)**: 통합 탐색 페이지

## 5. 코딩 규칙 (Coding Rules)
- **언어**: 한국어 (주석, 커밋 메시지, 문서 등)
- **스타일링**: TailwindCSS 사용 (커스텀 CSS 지양)
- **컴포넌트**: `src/components/features` (도메인별), `src/components/ui` (공용)
- **데이터 페칭**: Server Actions 우선 사용 (`src/actions/*`)
- **아이콘**: `lucide-react` 사용

## 6. 현재 작업 상태 (Current Status)
- **진행 중**: GitHub 스타일 구조 개편 (Phase 1: Planning & Mockup)
- **완료**: HTML 목업 생성 (`mockup_dashboard_v2.html`, `mockup_profile.html`, `mockup_explore.html`)
- **다음 단계**: Next.js 라우팅 폴더 구조 리팩토링 및 레이아웃 컴포넌트 구현
