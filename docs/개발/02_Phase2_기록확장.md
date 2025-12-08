# Phase 2: 기록 확장

## 목표

**영화/드라마 카테고리 추가, 진행률 관리 기능 강화.**

---

## 기능 범위

| 기능 | 우선순위 | 설명 |
|------|----------|------|
| 영화 검색 | P0 | TMDB API 연동 |
| 드라마 검색 | P0 | TMDB API 연동 |
| 진행률 관리 | P0 | 퍼센트/페이지 관리 |
| 콘텐츠 상세 페이지 | P1 | 탭 구조 (정보/기록) |

> 현재 구현: records 테이블의 type 필드로 REVIEW, NOTE, QUOTE 통합 관리

---

## 데이터베이스

Phase 2에서 추가되는 테이블 없음.
기존 테이블 활용:
- `contents` - type 컬럼으로 BOOK, MOVIE, DRAMA 구분
- `user_contents` - progress 컬럼으로 진행률 관리
- `records` - type 컬럼으로 REVIEW, NOTE, QUOTE 구분

> 상세 스키마는 `01_데이터베이스_스키마.md` 참조

---

## API 구현

### 디렉토리 구조

```
src/actions/
├── contents/
│   ├── searchBooks.ts       -- 기존
│   ├── searchMovies.ts      -- 추가
│   └── searchDramas.ts      -- 추가
└── records/
    ├── createRecord.ts      -- 기존 (type으로 구분)
    ├── updateRecord.ts
    ├── deleteRecord.ts
    └── getRecords.ts
```

### 핵심 API

#### searchMovies

```typescript
'use server'

export async function searchMovies({ query, page = 1 }) {
  const data = await searchTMDB(query, 'movie', page)

  return {
    items: data.results.map(item => ({
      externalId: String(item.id),
      externalSource: 'tmdb',
      type: 'MOVIE',
      title: item.title,
      creator: '',
      thumbnailUrl: item.poster_path
        ? `https://image.tmdb.org/t/p/w500${item.poster_path}`
        : null,
      metadata: {
        releaseDate: item.release_date,
        overview: item.overview
      }
    })),
    total: data.total_results,
    hasMore: page < data.total_pages
  }
}
```

#### updateProgress

```typescript
'use server'

export async function updateProgress(userContentId: string, progress: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  await supabase
    .from('user_contents')
    .update({ progress, updated_at: new Date().toISOString() })
    .eq('id', userContentId)
    .eq('user_id', user?.id)
}
```

---

## TMDB API 연동

### 설정

```typescript
// src/lib/api/tmdb.ts

const TMDB_API_KEY = process.env.TMDB_API_KEY!
const TMDB_BASE_URL = 'https://api.themoviedb.org/3'

export async function searchTMDB(
  query: string,
  type: 'movie' | 'tv',
  page: number = 1
) {
  const response = await fetch(
    `${TMDB_BASE_URL}/search/${type}?` +
    `query=${encodeURIComponent(query)}&page=${page}&language=ko-KR`,
    {
      headers: {
        Authorization: `Bearer ${TMDB_API_KEY}`
      }
    }
  )

  return response.json()
}
```

### searchDramas

```typescript
'use server'

export async function searchDramas({ query, page = 1 }) {
  const data = await searchTMDB(query, 'tv', page)

  return {
    items: data.results.map(item => ({
      externalId: String(item.id),
      externalSource: 'tmdb',
      type: 'DRAMA',
      title: item.name,
      creator: '',
      thumbnailUrl: item.poster_path
        ? `https://image.tmdb.org/t/p/w500${item.poster_path}`
        : null,
      metadata: {
        releaseDate: item.first_air_date,
        overview: item.overview
      }
    })),
    total: data.total_results,
    hasMore: page < data.total_pages
  }
}
```

---

## 체크리스트

### 외부 API
- [ ] TMDB API 키 발급
- [ ] TMDB 래퍼 구현
- [ ] searchMovies 구현
- [ ] searchDramas 구현

### 진행률 API
- [ ] updateProgress 구현
- [ ] 진행률 표시 UI

### UI
- [ ] 콘텐츠 상세 페이지 탭 구조
- [ ] 콘텐츠 추가 모달에 영화/드라마 탭
- [ ] 진행률 슬라이더/입력

---

## 완료 기준

1. 영화/드라마를 검색하고 추가할 수 있다
2. 콘텐츠 상세에서 정보/기록 탭 전환이 된다
3. 진행률을 직접 설정할 수 있다

---

*02_Phase2_기록확장.md - 최종 수정: 2025-12-07*
