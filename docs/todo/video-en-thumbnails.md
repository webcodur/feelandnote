# VIDEO 영문 썸네일 수집

## 현황

| 항목 | 값 |
|------|-----|
| 대상 | `contents.type = 'VIDEO'`, `content_locales` en 행 thumbnail_url IS NULL |
| 건수 | 1,340건 (en 행 전부 존재, 썸네일만 NULL) |
| subtype | movie 1,339건, tv 1건 |
| external_id 형식 | `tmdb-movie-{id}`, `tmdb-tv-{id}` |

## 수집 방법

TMDB `/images` API로 영문 포스터 수집.

```
GET /movie/{id}/images?api_key={key}&include_image_languages=en,null
GET /tv/{id}/images?api_key={key}&include_image_languages=en,null
```

- `posters[]`에서 `iso_639_1 = "en"` 항목 → `vote_average` 최고값 선택
- en 포스터 없으면 `iso_639_1 = null` (텍스트 없는 포스터) fallback
- 둘 다 없으면 NULL 유지 (ko 포스터가 fallback으로 표시됨)
- URL 형식: `https://image.tmdb.org/t/p/w500{file_path}`

## Rate Limit

- TMDB v3: 초당 ~40건 허용
- 1,340건 → 딜레이 50ms/건 = 약 70초 소요

## 스크립트

`scripts/video-en-thumb.mjs`

## sources 업데이트

```jsonc
// 기존 sources에 thumbnail 키만 추가 (primary는 유지)
{ "primary": "tmdb", "thumbnail": "tmdb_en" }
```

en 포스터 없는 경우:
```jsonc
{ "primary": "tmdb", "thumbnail": "confirmed_unavailable" }
```
