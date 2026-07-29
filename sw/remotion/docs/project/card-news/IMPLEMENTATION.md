# 카드뉴스 구현 현황

> 북리커맨드(서재 탐방) 인물–책 카드를 SNS(인스타·쓰레드·X 등)에 출고하기 위한 카드 생성기.
> 시안: `card-news-spec.html`(카드 12종 디자인) · `card-news-09-test.html`(팩션 실데이터 캐러셀). 이 문서는 실제 코드 구현의 SSoT.
> 마지막 갱신: 2026-06-30

## 1. 구현 위치 (어디서 무엇을)

| 영역 | 위치 | 역할 |
|------|------|------|
| 카드 렌더러 | `sw/remotion/src/compositions/BookCard/BookCard.tsx` | 카드 7종을 그리는 Remotion 정지 컴포넌트. 자매: `FactionCard/`(팩션) |
| 미리보기·편성 | `sw/web-bo` Cards 탭 (`/book-recommend/<인물>/cards`) | @remotion/player 로 카드를 띄우고 편성·선별·비율을 조정 |
| 편성 저장 | `public/episodes/<인물>/faction-cards.json` | 선별 권 등 편성 설정(영상 데이터와 분리) |
| 출고 | `sw/remotion/scripts/render/render-cards.ts` (`pnpm render:cards`) | 저장된 편성대로 PNG 일괄 양산 → `out/cards/<인물>/<비율>/` |

**핵심 결정**: 카드 재료(인물명·책 표지·감상경위·인용)와 정지 이미지 출력이 모두 remotion에 있으므로 remotion에서 만든다. 본 서비스 BO(Supabase) 아님.

## 2. 카드 7종 (BookCardSpec)

| type | 카드 | 데이터 |
|------|------|--------|
| `intro` | 인물 소개 (얼굴+이름+직함+대표 명언) | host.avatar_url·nickname·title·featuredQuote |
| `shelf` | 책장 그리드 (목차) | books[].title·thumbnail_url |
| `cover` | 책별 — 표지 + "왜 읽었나" 첫 문단 | book.thumbnail_url·contextMain 첫 문단 |
| `context` | 감상경위 한 문단 (분할형 B) | book.contextMain 문단별 |
| `quote` | 인용 미니멀 (밝은 종이톤) | book.quotePairs[].quote |
| `number` | 숫자 훅 | books.length 등 |
| `cta` | 마무리 (유튜브 안내) | — |

- 이미지: `safeImg` 대신 자체 `resolveSrc(src, assetBase)`. remotion 렌더는 staticFile 기준, 외부 앱(web-bo) 미리보기는 `assetBase='/api/rm-asset'` 로 remotion public 을 서빙받는다.
- 한글 조사 `josa(word,'이','가')` export.
- 폐기: 도서관 대출카드(librarycard) — 지면 낭비로 제거.

## 3. 편성 두 유형 (A·B)

인스타·쓰레드 캐러셀(옆으로 넘기는 게시물) 단위.

- **A 「○○가 읽은 책 N권」** (여러 책 얕게): 후크(number) → 인물소개(intro) → 대표 5권(cover) → 마무리(cta). 약 8장.
- **B 「○○의 한 권, △△△」** (한 책 깊게): 책 소개(cover) → 감상경위 문단별(context) → 마무리(cta).
- 어느 책이 A/B로 가는가: 감상경위 분량으로 가름(짧으면 A 한 장, 길고 깊으면 B 단독). 데이터에 분량이 있어 자동 판단 가능.

## 4. 미리보기 (web-bo Cards 탭)

- `@remotion/player` 로 BookCard 를 띄운다(web-bo에서 동일 엔진 사용).
- 표지 등 로컬 자산은 `/api/rm-asset/[...path]` 통로로 remotion public 을 서빙(한글 폴더 디코딩 포함).
- 기능: A/B 토글, 책 선별(칩), 비율 토글(4:5·1:1·9:16), 편성 저장(faction-cards.json).
- remotion 워크스페이스 소스를 직접 import: `@feelandnote/remotion/src/compositions/BookCard`. next.config `transpilePackages: ['@feelandnote/remotion']`.

## 5. 남은 작업 (TODO)

- [ ] 비율별 레이아웃 대응 — 1:1·9:16 에서 shelf 많은 책·긴 context 넘침 점검
- [ ] PNG 출고 배치(`render:cards`) — 진행 중
- [ ] 카드 텍스트 미세편집 — 자동 발췌(후크·계기)가 어색할 때 BO에서 faction-cards.json overrides 로 보정
- [ ] X용 단독 카드 — 캐러셀 아닌 단독 1장(인용 등)
- [ ] 전 인물 일괄 출고 + 실 배포(채널 업로드)

## 6. 데이터 흐름

```
public/episodes/<인물>/  (meta.ko.json·ko.json·books/) ──┐
                                                          ├─► BookRecommendScript (script.ts 머지)
public/episodes/<인물>/faction-cards.json (편성: 선별 권) ────────┘            │
                                                                      ▼
                                          BookCard (카드 7종) ──► 미리보기(BO) / PNG 출고(render:cards)
```
