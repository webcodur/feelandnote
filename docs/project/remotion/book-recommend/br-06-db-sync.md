# 서재 탐방 — 콘텐츠 ID·표지 동기화

에피소드 원고의 책을 본서비스 DB의 콘텐츠·감상 관계와 잇고, 렌더용 표지를 DB 표지 URL에서 만든 로컬 캐시로 통일하는 규격이다. 영상용 제목·저자 표기는 DB 판본명으로 강제 덮어쓰지 않는다. 남은 관계·표지 정비는 [`docs/todo/remotion.md`](../../../todo/remotion.md)가 쥔다.

## 단일원천과 산출물

```text
DB
  celebs
    └─ celeb_contents.id
         └─ contents.id
              └─ content_locales.thumbnail_url   ← 외부 표지 원본
                         │
                         ▼
book.<locale>.json
  contentId
  userContentId
  thumbnailSourceUrl       ← 변경 감지용 스냅샷
  thumbnailSourceLocale
  thumbnail_url            ← 렌더용 로컬 경로
                         │
                         ▼
public/covers/content/<contentId>/<locale>.webp  ← 재생성 가능한 로컬 캐시
```

역할은 다음처럼 나눈다.

| 데이터 | 쓰기 원천 | Remotion의 역할 |
|---|---|---|
| 인물과 콘텐츠의 관계 | `celeb_contents` | `userContentId` 참조. JSON 필드명은 호환을 위해 유지 |
| 콘텐츠 식별 | `contents` | `contentId` 참조 |
| KO·EN 판본 표지 URL | `content_locales.thumbnail_url` | 원본 URL 스냅샷 보관 |
| 렌더용 표지 파일 | 위 URL에서 생성 | 로컬 캐시 사용 |
| 영상 원고·음성·타이밍·연출 이미지 | 에피소드 폴더 | 계속 원본 |
| 영상에서 쓰는 축약 제목·저자 표기 | `book.<locale>.json` | 형식별 표현으로 유지 |

`contentId`와 `userContentId`를 둘 다 두는 이유는 “이 콘텐츠가 무엇인가”와 “이 인물이
이 콘텐츠를 감상했다는 관계”를 따로 검증하기 위해서다. 제목 문자열만으로는 번역명,
합본·세트·권차, 동명 작품을 안전하게 구별할 수 없다.

## 연결 규칙

1. 이미 저장된 두 ID가 실제 DB 관계와 일치하면 그대로 사용한다.
2. 해당 인물의 콘텐츠 중 정규화한 제목이 하나만 정확히 일치하면 자동 연결한다.
3. 완전 일치가 아니어도 제목 포함 + 저자 완전 일치가 강하고 차점과 충분히 벌어지면
   `1`, `세트`, `Paperback` 같은 판본 수식 차이로 보고 안전 연결한다.
4. 나머지는 사람이 고른 `celeb_contents.id`만 받는다. 서버가 다시 해당 인물의 관계인지
   검증한 뒤 저장한다.
5. 저자만 같은 책, 다른 권차, 원작과 각색물은 자동 연결하지 않는다.
6. DB에 콘텐츠만 있고 해당 인물의 `celeb_contents`가 없으면 먼저 출처와 감상배경을
   검증해 관계를 등록한다. Remotion ID만 우회해서 붙이지 않는다.

## 표지 규칙

- 렌더 JSON에 외부 URL을 직접 남기지 않는다.
- 캐시 경로는 `covers/content/<contentId>/<locale>.webp`로 결정적이어야 한다.
- 다운로드는 허용된 외부 이미지 호스트와 안전한 리다이렉트만 통과시킨다.
- 응답이 이미지인지, 20MB 이하인지 확인하고 최대 1600×2400 WebP로 변환한다.
- `thumbnailSourceUrl`이 DB URL과 다르면 캐시를 다시 만든다.
- DB 판본에 표지가 없으면 기존 로컬 표지를 지우지 않는다. 화면에서 `DB 표지 없음`으로
  남겨 원천 데이터를 먼저 고치게 한다.
- DB 표지 편집은 콘텐츠 상세에서 하고, 렌더 캐시는 `/book-recommend`에서 재생성한다.

신규 BOOK 메타·표지의 수집원은 [외부 콘텐츠 검색 API](../../platform/platform-05-external-services.md#외부-콘텐츠-검색-api)가 쥔다(한국어판 카카오, 영문 원서 OpenLibrary).

## 운영 화면과 명령

### web-bo

- `/book-recommend`: 전체 에피소드 연결·표지 무결성 작업대
- `/contents/[id]`: BOOK KO·EN 표지 URL과 출처 편집
- `/celebs/[slug]/contents`: 인물과 콘텐츠 관계·감상배경 정비

`/book-recommend`는 로컬 Remotion 파일을 직접 읽고 쓰므로
`sw/web-bo/.env`에 `REMOTION_LOCAL=1`이 있는 로컬 관리자 환경에서만 동작한다.
관리자 권한은 화면 레이아웃과 서버 액션에서 각각 확인한다.

### CLI

```bash
# 읽기 전용 전수 감사
pnpm --dir sw/web-bo book-recommend:resources

# 이미 연결됐거나 안전하게 판정된 항목의 ID·표지 캐시 반영
pnpm --dir sw/web-bo book-recommend:resources -- --apply-safe

# 사람이 검토한 관계 한 건을 명시 연결
pnpm --dir sw/web-bo book-recommend:resources -- \
  --book "episode/books/book-folder" \
  --user-content "<celeb_contents.id>"
```
