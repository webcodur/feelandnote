# 서재 탐방 1차 통합 — 콘텐츠 ID와 표지 SSoT

> 상태: **구현 완료, 운영 데이터 정비 진행 중** (2026-07-29)
>
> 이 문서는 전체 이관의 선행 단계인 콘텐츠 식별자·표지 단일원천화 규격이다.
> 같은 날 제작 작업대 전체도 web-bo로 이관되어 remotion-bo는 폐기됐다. 전체 이력은
> [`remotion-bo-plan.md`](../../remotion-bo-plan.md) 「북리커맨드 최종 이관」을 본다.

## 이번 단계의 결정

### 포함

- `celeb_contents → contents → content_locales`를 콘텐츠 관계·판본·외부 표지 URL의 단일원천으로 삼는다.
- 각 `book.ko.json`·`book.en.json`에 안정 ID인 `contentId`, `userContentId`를 기록한다.
- 렌더용 표지는 DB URL에서 만든 로컬 WebP 캐시로 통일한다.
- web-bo `/book-recommend`에서 연결 무결성, DB 표지 변경, 구경로, 외부 URL, 파일 누락을 한 번에 진단·동기화한다.
- web-bo `/contents/[id]`에서 KO·EN 표지 URL과 `sources.thumbnail`을 수정한다.
- 신규 에피소드 스캐폴딩은 현재 DB 스키마를 읽고 처음부터 안정 ID와 표지 원본 스냅샷을 기록한다.

### 이번 단계에서 하지 않는 것

- 감상배경을 본 서비스의 `Deep 감상배경`으로 노출하는 제품 기획
- 롱폼·SOLO·쇼츠·카드 산출물 전체를 본 서비스 화면에 싣는 방법
- 원고·음성·타이밍·렌더·유튜브 작업대를 web-bo로 이관
- 영상용 제목·저자 표기를 DB 판본명으로 강제 덮어쓰기
- 롱폼 폐지와 SOLO–쇼츠 체제의 최종 스키마 확정

위 항목은 형식과 노출 맥락을 먼저 정해야 한다. 특히 `Deep 감상배경`은 같은 감상배경의
확장판일 수 있지만, 영상 대본 전체를 그대로 본 서비스 본문으로 취급한다는 뜻은 아니다.
페이지 위치, 진입 조건, 분량, 근거 표기, 스포일러, KO·EN 운영 규칙을 별도 제품 기획으로
정한 뒤 2차 통합에서 다룬다.

## 단일원천과 산출물

```text
Supabase
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

Google Books는 기존 DB에 남은 레거시 URL만 읽을 수 있다. 신규 표지·메타 수집원으로
되살리지 않으며, 신규 BOOK 메타는 네이버·OpenLibrary만 사용한다.

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

## 2026-07-29 이관 실적

활성 에피소드 폴더 30편, 콘텐츠 188건을 전수 점검했다.

| 항목 | 결과 |
|---|---:|
| 안정 ID 연결 완료 | 177건 |
| DB 표지와 일치하는 locale 참조 | 282건 |
| 중복 콘텐츠가 공유하는 실제 WebP 캐시 파일 | 248개, 12.35MiB |
| 렌더 JSON에 남은 외부 표지 URL | 0개 |
| DB 표지 원본이 있는 참조의 구경로 | 0건 |
| DB 관계 검토가 더 필요한 항목 | 11건 |
| DB locale 표지 URL이 없어 기존 로컬 표지를 보존한 판본 | 7건 |

이관 중 젠슨 황–포지셔닝 KO의 기존 네이버 표지가 404인 것을 실제 다운로드에서 발견했다.
현재 네이버 BOOK 검색 결과의 같은 ISBN 표지로 `content_locales.thumbnail_url`을 교정하고
`sources.thumbnail = 'naver_book'`을 기록한 뒤 캐시를 다시 만들었다.

잘못 연결될 뻔한 사례도 차단했다.

- `반지의 제왕`을 저자가 같다는 이유로 `호빗`에 연결하지 않았다.
- `낭만적 거짓과 소설적 진실`을 르네 지라르의 다른 책에 연결하지 않았다.
- `논어`를 사서 전체 해설서에 연결하지 않았다.
- 영화 `네트워크`는 BOOK 제한 때문에 누락되던 스캐너를 고쳐 VIDEO 관계와 포스터로 연결했다.

### 남은 DB 관계 11건

| 상태 | 항목 |
|---|---|
| 전역 콘텐츠는 있으나 해당 인물 관계가 없음 | 일론 머스크–반지의 제왕, 이사도라 덩컨–종의 기원·플루타르코스 영웅전, 짐 캐리–프린세스 브라이드 제작기(`As You Wish`), 마리 퀴리–파우스트·과학과 가설, 세종–논어, 제갈량–관자 |
| 전역 콘텐츠부터 없음 | 마리 퀴리–판 타데우시·쿠오바디스, 피터 틸–낭만적 거짓과 소설적 진실 |

이 11건은 표지 문제가 아니라 **감상 관계의 출처 검증·등록 문제**다. Remotion 원고를
근거 없이 DB로 백필하지 않는다. 웹 팩트체크 후 `celeb_contents.source_url`, KO·EN
감상배경까지 등록한 다음 같은 작업대로 연결한다.

### DB 표지 URL이 비어 있는 7개 판본

- 제프리 힌턴–The Organization of Behavior KO
- 젠슨 황–포지셔닝 EN
- 피터 틸–주권적 개인·거대한 환상·데카당스 사회 KO
- 샘 올트먼 2편–딜러스 오브 라이트닝 KO
- 이순신–전등신화 EN

7개 중 3개는 현재 렌더에 쓰던 구로컬 표지를 보존했고, 4개는 원래도 빈 경로다. 따라서
기존에 보이던 표지를 동기화가 지워서 새로 깨뜨린 경우는 없다. 다음 표지 정비 때
`content_locales.thumbnail_url`을 먼저 보충해야 모두 완전한 재생성 상태가 된다.

## 후속 이관 결과

2026-07-29에 scenario, voice, timing, render, YouTube, Cards 작업대와 제작 API를
web-bo로 이관하고 remotion-bo 앱을 폐기했다. 이 문서의 ID·표지 운영 규격은 그대로
유효하다. SOLO–쇼츠 모델과 본 서비스 노출 형식은 제작 도구 이관과 분리된 후속 제품
기획으로 남는다.
