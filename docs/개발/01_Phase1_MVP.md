# Phase 1: MVP

## 목표

**사용자가 도서를 검색하고, 기록관에 추가하고, 기록(리뷰/노트/인용구)을 작성할 수 있다.**

---

## 기능 범위

| 기능 | 우선순위 | 설명 |
|------|----------|------|
| 소셜 로그인 | P0 | Google, Kakao OAuth |
| 도서 검색 | P0 | 알라딘 API 연동 |
| 콘텐츠 추가 | P0 | 기록관에 도서 추가 |
| 상태 관리 | P0 | WISH / EXPERIENCE |
| 기록 작성 | P0 | REVIEW(별점) / NOTE / QUOTE |
| 기록관 조회 | P0 | 내 콘텐츠 목록, 필터, 정렬 |
| 프로필 | P1 | 기본 프로필 조회/수정 |

---

## 데이터베이스 스키마

### profiles

```sql
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  nickname TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL
);

-- RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public profiles are viewable by everyone." ON profiles
FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile." ON profiles
FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile." ON profiles
FOR UPDATE USING (auth.uid() = id);
```

### contents

```sql
CREATE TABLE public.contents (
  id TEXT PRIMARY KEY,                -- 외부 API ID (ISBN 등)
  type TEXT NOT NULL CHECK (type IN ('BOOK', 'MOVIE')),
  title TEXT NOT NULL,
  creator TEXT,
  thumbnail_url TEXT,
  description TEXT,
  publisher TEXT,
  release_date TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL
);

-- RLS
ALTER TABLE contents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Contents are viewable by everyone." ON contents
FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert contents." ON contents
FOR INSERT WITH CHECK (auth.role() = 'authenticated');
```

### user_contents

```sql
CREATE TABLE public.user_contents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content_id TEXT NOT NULL REFERENCES contents(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('WISH', 'EXPERIENCE')),
  progress INTEGER DEFAULT 0,
  progress_type TEXT DEFAULT 'PERCENT' CHECK (progress_type IN ('PERCENT', 'PAGE', 'TIME')),
  created_at TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL,

  UNIQUE(user_id, content_id)
);

-- RLS
ALTER TABLE user_contents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own archive." ON user_contents
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert into own archive." ON user_contents
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own archive." ON user_contents
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete from own archive." ON user_contents
FOR DELETE USING (auth.uid() = user_id);
```

### records

```sql
CREATE TABLE public.records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content_id TEXT NOT NULL REFERENCES contents(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('REVIEW', 'NOTE', 'QUOTE')),
  content TEXT NOT NULL,
  rating NUMERIC,                     -- REVIEW 타입에서만 사용
  location TEXT,                      -- 페이지, 챕터 등
  created_at TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL
);

-- RLS
ALTER TABLE records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own records." ON records
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own records." ON records
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own records." ON records
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own records." ON records
FOR DELETE USING (auth.uid() = user_id);
```

---

## API 구현

### 디렉토리 구조

```
src/
├── actions/
│   ├── auth/
│   │   ├── login.ts
│   │   ├── logout.ts
│   │   └── index.ts
│   ├── contents/
│   │   ├── searchBooks.ts
│   │   ├── addContent.ts
│   │   ├── getMyContents.ts
│   │   ├── getContent.ts
│   │   ├── updateStatus.ts
│   │   ├── removeContent.ts
│   │   └── index.ts
│   └── records/
│       ├── createRecord.ts
│       ├── getRecords.ts
│       ├── updateRecord.ts
│       ├── deleteRecord.ts
│       └── index.ts
├── lib/
│   ├── supabase/
│   │   ├── client.ts
│   │   ├── server.ts
│   │   └── middleware.ts
│   └── api/
│       └── aladin.ts
└── app/
    └── auth/
        └── callback/
            └── route.ts
```

### 핵심 API

#### searchBooks

```typescript
'use server'

interface SearchBooksParams {
  query: string
  page?: number
}

interface BookSearchResult {
  id: string              // ISBN
  title: string
  creator: string
  thumbnail_url: string
  publisher: string
  release_date: string
  description: string
}

export async function searchBooks({ query, page = 1 }: SearchBooksParams): Promise<{
  items: BookSearchResult[]
  total: number
}> {
  // 알라딘 API 호출
}
```

#### addContent

```typescript
'use server'

interface AddContentParams {
  id: string                    // 외부 API ID
  type: 'BOOK' | 'MOVIE'
  title: string
  creator?: string
  thumbnail_url?: string
  description?: string
  publisher?: string
  release_date?: string
  metadata?: Record<string, unknown>
  status: 'WISH' | 'EXPERIENCE'
}

export async function addContent(params: AddContentParams): Promise<{
  success: boolean
}> {
  // 1. contents upsert
  // 2. user_contents insert
}
```

#### createRecord

```typescript
'use server'

interface CreateRecordParams {
  contentId: string
  type: 'REVIEW' | 'NOTE' | 'QUOTE'
  content: string
  rating?: number              // REVIEW 타입에서만 사용
  location?: string            // 페이지, 챕터 등
}

export async function createRecord(params: CreateRecordParams): Promise<{
  id: string
}> {
  // 1. user_contents 존재 확인
  // 2. records insert
}
```

---

## 페이지 구조

```
app/
├── (auth)/
│   ├── login/
│   │   └── page.tsx
│   └── layout.tsx
├── (main)/
│   ├── dashboard/
│   │   └── page.tsx
│   ├── archive/
│   │   ├── page.tsx           -- 기록관 목록
│   │   └── [id]/
│   │       └── page.tsx       -- 콘텐츠 상세
│   ├── settings/
│   │   └── page.tsx
│   └── layout.tsx
└── auth/
    └── callback/
        └── route.ts
```

---

## 체크리스트

### 환경 설정
- [x] Supabase 프로젝트 생성
- [x] 환경 변수 설정 (.env.local)
- [x] Google OAuth 설정
- [x] Kakao OAuth 설정
- [x] 알라딘 API 키 발급

### 데이터베이스
- [x] profiles 테이블 생성 + RLS
- [x] contents 테이블 생성 + RLS
- [x] user_contents 테이블 생성 + RLS
- [x] records 테이블 생성 + RLS

### 인증
- [x] Supabase 클라이언트 설정 (client, server)
- [x] Middleware 구현
- [x] Auth Callback 구현
- [x] 로그인 페이지 구현
- [x] 로그아웃 구현

### 콘텐츠
- [x] 알라딘 API 래퍼 구현
- [x] searchBooks 구현
- [x] addContent 구현
- [x] getMyContents 구현
- [x] getContent 구현
- [x] updateStatus 구현
- [x] removeContent 구현

### 기록
- [x] createRecord 구현
- [x] getRecords 구현
- [x] updateRecord 구현
- [x] deleteRecord 구현

### UI 연결
- [x] 기록관 페이지 → getMyContents
- [x] 콘텐츠 추가 모달 → searchBooks, addContent
- [x] 콘텐츠 상세 → getContent, getRecords
- [x] 기록 작성 폼 → createRecord

### 테스트
- [x] 로그인 → 기록관 접근
- [x] 도서 검색 → 추가 → 목록 표시
- [x] 상태 변경 → 필터 동작
- [x] 기록 작성 → 조회 → 수정 → 삭제

---

## 완료 기준

1. ✅ 신규 사용자가 Google/Kakao로 로그인할 수 있다
2. ✅ 도서를 검색하고 기록관에 추가할 수 있다
3. ✅ 추가한 도서의 상태를 변경할 수 있다
4. ✅ 도서에 리뷰/노트/인용구를 작성할 수 있다
5. ✅ 기록관에서 내 콘텐츠 목록을 볼 수 있다

---

*01_Phase1_MVP.md - 최종 수정: 2025-12-07 - Phase 1 완료*
