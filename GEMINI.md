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

## 4. 아키텍처 및 라우팅 (Routing Architecture) - 2026.01 개편 완료
GitHub 스타일의 3단 구조 (대시보드 / 탐색 / 컨텍스트 기반 프로필)를 따릅니다.

### 주요 라우트 (Key Routes)
- **Dashboard (`/`)**: 
    - 개인화된 피드 (친구/팔로잉 활동) + 추천 콘텐츠(셀럽/트렌드)
    - 상단: `CelebCarousel` (Visual Hook)
    - 좌측: `DashboardFeed` (Main Content)
    - 우측: `TrendingSidebar` (Meta Info)
    
- **Profile (`/[userId]`)**: 통합 프로필 페이지
    - **Header**: Global Header -> Context Header (2단 구조)
    - **Tabs**:
        - `/`: **개요(Overview)** - 프로필 정보, 활동 히스토리(`ActivityTimeline`), 핀 고정 콘텐츠
        - `/records`: **기록(Records)** - 콘텐츠 라이브러리(기존 Archive), 필터링/검색 지원
        - `/collections`: **컬렉션** - 플레이리스트/북마크 (구현 예정)
        - `/guestbook`: 방명록
        - `/settings`: 설정 (본인인 경우에만 노출)

- **Explore (`/explore`)**: 통합 탐색 페이지
    - 인기 셀럽, 추천 키워드, 카테고리별 탐색

- **Lounge (`/play`)**: (구 Lounge) 커뮤니티/플레이그라운드 성격의 공간

## 5. 코딩 규칙 (Coding Rules)
- **언어**: 한국어 (주석, 커밋 메시지, 문서 등)
- **스타일링**: TailwindCSS 사용 (커스텀 CSS 지양)
- **컴포넌트**: `src/components/features` (도메인별), `src/components/ui` (공용)
- **데이터 페칭**: Server Actions 우선 사용 (`src/actions/*`)
- **아이콘**: `lucide-react` 사용

## 6. 현재 작업 상태 (Current Status)
- **완료**: GitHub 스타일 구조 개편 (Phase 1 ~ Phase 4 완료)
    - 라우팅 구조 변경 (`/archive` 제거 -> `/[userId]` 통합)
    - 대시보드 UI 구현 (`DashboardFeed`, `CelebCarousel`)
    - 프로필 페이지 분리 (`Overview`, `Records`) 및 2단 헤더 적용
    - `ActivityTimeline` 연동
- **다음 단계**: 
    - `Overview` 탭의 핀 고정(Pin) 기능 구현
    - `Collections` 탭 구현
    - `Guestbook` 탭 리팩토링
    - `Guestbook` 탭 리팩토링

## 7. 디자인 시스템 (Classical Design System - Neo-Pantheon)
**컨셉**: Neo-Pantheon (웅장함, 권위, 선명한 고전미)
고대 로마 신전의 권위와 현대적인 선명함을 결합한 디자인을 지향합니다.

### 7.1 타이포그래피 및 시인성 원칙 (Typography & Visibility)
- **핵심 타이틀 (한글)**: `Noto Serif KR` (`font-serif`) - `font-black`(900)을 사용하여 석판에 새긴 듯한 권위를 부여합니다. 
- **장식용/서브 레이블 (영문)**: `Cinzel` (`font-cinzel`) - 주로 대문자로 사용하며, 배경 장식이나 보조 안내에 활용합니다.
- **가독성 최우선**: 
    - 최소 폰트 크기는 `text-xs`(12px) 이상을 유지하며, 본문은 `text-sm`(14px) ~ `text-base`(16px)를 권장합니다.
    - 흐릿한 텍스트(`opacity-60` 이하)를 지양하고, 배경과의 명확한 대비를 위해 고정된 금색 또는 대리석색을 사용합니다.
- **국문 로컬라이징**: 영문 레이블(Overview, Archive 등)보다 컨셉에 어우러지는 풍격 있는 국문 표현(계보, 기록 전당 등)을 우선 사용합니다.

### 7.2 컬러 및 대비 (Color & Contrast)
- **주 액센트 - 황색 골드 (#d4af37)**: 메인 액센트로, `shadow-glow`(금빛 광택)와 결합하여 에너지를 표현합니다. `accent` 변수로 사용.
- **보조 액센트 - 주황색 골드 (amber-500, #f59e0b)**: 보조 강조 색상으로, 덜 강한 강조가 필요한 곳에 사용합니다.
- **Marble White (#e0e0e0)**: 텍스트 기본색으로, `font-bold`와 함께 사용하여 가독성을 극대화합니다.
- **Shadow & Depth**: `shadow-2xl` 및 `shadow-inner`를 사용하여 요소가 떠 있거나 파여 있는 듯한 공간감을 줍니다.

### 7.3 컴포넌트 구조 및 레이아웃 (Layout & Components)
- **2단 그리드 구조**: 고정된 사이드바(260px~280px)와 유연한 메인 컨텐츠 영역으로 구성합니다.
- **Pillar (기둥)**: `PillarDivider` 또는 섹션 헤더의 수직 바를 통해 화면에 기둥이 서 있는 듯한 구조적 안정감을 구현합니다.
- **Tabulated Content (석판)**: 주요 컨텐츠는 `card-classical`을 사용하여 독립된 석판 형태로 배치하며, 섹션 간 간격(`space-y-12`)을 넉넉히 두어 웅장함을 유지합니다.
- **Micro-interactions**: 호버 시 보더 광택 효과, 아이콘 회전, 카드 스케일 업 등을 통해 살아있는 인터페이스를 제공합니다.

### 7.4 명칭 명명 규칙 (Thematic Naming)
서비스의 '신전' 컨셉을 유지하기 위해 다음과 같은 테마의 명칭을 사용합니다.
- **개요** → 계보 (Genealogy)
- **컬렉션** → 유산 (Legacy)
- **방명록** → 방명석 (Inscribed Stone)
- **팔로우** → 지혜의 결속 (Bond of Wisdom)
- **추가/수정** → 신성한 추가 / 새겨진 감상
