# Feel&Note API 설계

## 개요

Next.js Server Actions 기반 API. REST 대신 함수 호출 형태로 타입 안전성 확보.

---

## Server Actions 구조

```
src/actions/
├── auth/
│   ├── login.ts
│   ├── logout.ts
│   └── index.ts
├── contents/
│   ├── addContent.ts
│   ├── getContent.ts
│   ├── getMyContents.ts
│   ├── updateStatus.ts
│   ├── removeContent.ts
│   ├── searchBooks.ts
│   └── index.ts
└── records/
    ├── createRecord.ts
    ├── getRecord.ts
    ├── updateRecord.ts
    ├── deleteRecord.ts
    └── index.ts
```

---

## API 상세

### 인증 (auth)

#### login

```typescript
'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function loginWithGoogle() {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`
    }
  })

  if (error) throw error
  redirect(data.url)
}

export async function loginWithKakao() {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'kakao',
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`
    }
  })

  if (error) throw error
  redirect(data.url)
}
```

#### logout

```typescript
'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
```

---

### 콘텐츠 (contents)

#### searchBooks

외부 API에서 도서 검색.

```typescript
'use server'

interface SearchBooksParams {
  query: string
  page?: number
}

interface BookSearchResult {
  id: string
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
  const params = new URLSearchParams({
    ttbkey: process.env.ALADIN_API_KEY!,
    Query: query,
    QueryType: 'Keyword',
    MaxResults: '20',
    start: String((page - 1) * 20 + 1),
    SearchTarget: 'Book',
    output: 'js',
    Version: '20131101'
  })

  const response = await fetch(
    `http://www.aladin.co.kr/ttb/api/ItemSearch.aspx?${params}`
  )
  const data = await response.json()

  return {
    items: data.item.map((item: AladinItem) => ({
      id: item.isbn13 || item.isbn,
      title: item.title,
      creator: item.author,
      thumbnail_url: item.cover,
      publisher: item.publisher,
      release_date: item.pubDate,
      description: item.description
    })),
    total: data.totalResults
  }
}
```

#### addContent

```typescript
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

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

export async function addContent(params: AddContentParams) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  // 1. 콘텐츠 upsert (이미 존재하면 무시)
  const { error: contentError } = await supabase
    .from('contents')
    .upsert({
      id: params.id,
      type: params.type,
      title: params.title,
      creator: params.creator,
      thumbnail_url: params.thumbnail_url,
      description: params.description,
      publisher: params.publisher,
      release_date: params.release_date,
      metadata: params.metadata || {}
    }, {
      onConflict: 'id',
      ignoreDuplicates: true
    })

  if (contentError) throw contentError

  // 2. user_contents 생성
  const { error: userContentError } = await supabase
    .from('user_contents')
    .insert({
      user_id: user.id,
      content_id: params.id,
      status: params.status
    })

  if (userContentError) {
    if (userContentError.code === '23505') {
      throw new Error('이미 추가된 콘텐츠입니다')
    }
    throw userContentError
  }

  revalidatePath('/archive')
  return { success: true }
}
```

#### getMyContents

```typescript
'use server'

import { createClient } from '@/lib/supabase/server'

interface GetMyContentsParams {
  status?: 'WISH' | 'EXPERIENCE'
  type?: 'BOOK' | 'MOVIE'
}

export async function getMyContents(params: GetMyContentsParams = {}) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  let query = supabase
    .from('user_contents')
    .select(`
      *,
      content:contents(*)
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (params.status) {
    query = query.eq('status', params.status)
  }

  if (params.type) {
    query = query.eq('content.type', params.type)
  }

  const { data, error } = await query

  if (error) throw error
  return data
}
```

#### updateStatus

```typescript
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

interface UpdateStatusParams {
  userContentId: string
  status: 'WISH' | 'EXPERIENCE'
  progress?: number
  progressType?: 'PERCENT' | 'PAGE' | 'TIME'
}

export async function updateStatus(params: UpdateStatusParams) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { error } = await supabase
    .from('user_contents')
    .update({
      status: params.status,
      progress: params.progress,
      progress_type: params.progressType,
      updated_at: new Date().toISOString()
    })
    .eq('id', params.userContentId)
    .eq('user_id', user.id)

  if (error) throw error

  revalidatePath('/archive')
  return { success: true }
}
```

#### removeContent

```typescript
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function removeContent(userContentId: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { error } = await supabase
    .from('user_contents')
    .delete()
    .eq('id', userContentId)
    .eq('user_id', user.id)

  if (error) throw error

  revalidatePath('/archive')
  return { success: true }
}
```

---

### 기록 (records)

#### createRecord

```typescript
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

interface CreateRecordParams {
  contentId: string
  type: 'REVIEW' | 'NOTE' | 'QUOTE'
  content: string
  rating?: number              // REVIEW 타입에서만 사용
  location?: string            // 페이지, 챕터 등
}

export async function createRecord(params: CreateRecordParams) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  // 콘텐츠가 기록관에 있는지 확인
  const { data: userContent } = await supabase
    .from('user_contents')
    .select('id')
    .eq('user_id', user.id)
    .eq('content_id', params.contentId)
    .single()

  if (!userContent) {
    throw new Error('기록관에 추가된 콘텐츠만 기록할 수 있습니다')
  }

  const { data, error } = await supabase
    .from('records')
    .insert({
      user_id: user.id,
      content_id: params.contentId,
      type: params.type,
      content: params.content,
      rating: params.rating,
      location: params.location
    })
    .select()
    .single()

  if (error) throw error

  revalidatePath(`/archive/${params.contentId}`)
  return data
}
```

#### getRecords

```typescript
'use server'

import { createClient } from '@/lib/supabase/server'

interface GetRecordsParams {
  contentId?: string
  type?: 'REVIEW' | 'NOTE' | 'QUOTE'
}

export async function getRecords(params: GetRecordsParams = {}) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  let query = supabase
    .from('records')
    .select(`
      *,
      content:contents(id, title, type, thumbnail_url)
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (params.contentId) {
    query = query.eq('content_id', params.contentId)
  }

  if (params.type) {
    query = query.eq('type', params.type)
  }

  const { data, error } = await query

  if (error) throw error
  return data
}
```

#### updateRecord

```typescript
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

interface UpdateRecordParams {
  recordId: string
  content?: string
  rating?: number
  location?: string
}

export async function updateRecord(params: UpdateRecordParams) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString()
  }

  if (params.content !== undefined) updateData.content = params.content
  if (params.rating !== undefined) updateData.rating = params.rating
  if (params.location !== undefined) updateData.location = params.location

  const { data, error } = await supabase
    .from('records')
    .update(updateData)
    .eq('id', params.recordId)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) throw error

  revalidatePath(`/archive/${data.content_id}`)
  return data
}
```

#### deleteRecord

```typescript
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function deleteRecord(recordId: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  // 먼저 content_id 조회 (revalidate용)
  const { data: record } = await supabase
    .from('records')
    .select('content_id')
    .eq('id', recordId)
    .eq('user_id', user.id)
    .single()

  if (!record) throw new Error('Record not found')

  const { error } = await supabase
    .from('records')
    .delete()
    .eq('id', recordId)
    .eq('user_id', user.id)

  if (error) throw error

  revalidatePath(`/archive/${record.content_id}`)
  return { success: true }
}
```

---

## 외부 API 연동

### 알라딘 API (도서)

```typescript
// src/lib/api/aladin.ts

const ALADIN_API_KEY = process.env.ALADIN_API_KEY!
const ALADIN_BASE_URL = 'http://www.aladin.co.kr/ttb/api'

interface AladinItem {
  itemId: number
  title: string
  author: string
  publisher: string
  pubDate: string
  cover: string
  isbn: string
  isbn13: string
  description: string
  categoryName: string
}

export async function searchAladin(query: string, page: number = 1) {
  const params = new URLSearchParams({
    ttbkey: ALADIN_API_KEY,
    Query: query,
    QueryType: 'Keyword',
    MaxResults: '20',
    start: String((page - 1) * 20 + 1),
    SearchTarget: 'Book',
    output: 'js',
    Version: '20131101'
  })

  const response = await fetch(`${ALADIN_BASE_URL}/ItemSearch.aspx?${params}`)
  return response.json()
}
```

### TMDB API (영화) - 향후 확장

```typescript
// src/lib/api/tmdb.ts

const TMDB_API_KEY = process.env.TMDB_API_KEY!
const TMDB_BASE_URL = 'https://api.themoviedb.org/3'

export async function searchTMDB(query: string, page: number = 1) {
  const response = await fetch(
    `${TMDB_BASE_URL}/search/movie?query=${encodeURIComponent(query)}&page=${page}&language=ko-KR`,
    {
      headers: {
        Authorization: `Bearer ${TMDB_API_KEY}`
      }
    }
  )
  return response.json()
}
```

---

## 에러 처리

### 공통 에러 타입

```typescript
// src/types/api.ts

export class ApiError extends Error {
  constructor(
    message: string,
    public code: string,
    public status: number = 400
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export const ErrorCodes = {
  UNAUTHORIZED: 'UNAUTHORIZED',
  NOT_FOUND: 'NOT_FOUND',
  DUPLICATE: 'DUPLICATE',
  VALIDATION: 'VALIDATION'
} as const
```

---

## 향후 확장

### Phase 2: 소셜 기능
- `getPublicRecords`: 공개 기록 조회
- `follow` / `unfollow`: 팔로우 관리
- `getFeed`: 피드 조회

### Phase 3: 게이미피케이션
- `getUserStats`: 통계 조회
- `getTitles`: 칭호 조회
- `checkTitleUnlock`: 칭호 해금 체크

---

*02_API_설계.md*
