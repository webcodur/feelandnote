# Bill Gates — Gates Notes 감상 콘텐츠 조사

조사일: 2026-09-10 (KST)  
인물: `bill-gates`  
인물 ID: `1ab7e089-040f-4aa1-b0a1-81dc1dd510d7`  
주요 원출처: [Gates Notes](https://www.gatesnotes.com)

정밀 원자료는 [Gates Notes 조사 스냅샷](../../../../data/celeb/viewing-research/2026-09-10-bill-gates-gatesnotes.json)에 있다. 이 문서는 그 자료에서 사이트 구성, DB 반영 결과, 남은 판단 항목만 추려 적은 현재 정리본이다.

## 현재 DB 반영

이번에 새로 연결한 Bill Gates 관계는 112개다. 작품 전역 행은 기존 행 13개를 재사용하고 새 행 99개를 만들었다. 기존 전역 작품과 locale은 덮어쓰지 않았다.

| 작품 유형 | 이번 연결 | 현재 Bill Gates 전체 |
|---|---:|---:|
| BOOK | 21 | 177 |
| VIDEO | 13 | 13 |
| GAME | 5 | 5 |
| MUSIC | 73 | 73 |
| 합계 | 112 | 268 |

이번 연결분의 `review_en`과 Gates Notes `source_url`은 112개 모두 들어갔다. English locale은 이번에 새로 만든 작품 99개에 넣었고, 기존 작품 13개의 English locale은 보존했다. 기존 작품 중 12개의 Korean locale도 보존했으며, `Not the End of the World`는 기존 content에 Korean locale이 없어 이번에 추가했다.

이번에 추가한 Korean locale은 100개이고 기존 Korean locale 12개는 건드리지 않았다. 새 locale에는 agy가 만든 제목·저자만 넣고, 확인하지 않은 한국어판 ISBN·출판사·소개문·표지는 복사하지 않았으며 `verified=false`, `source_locale=en`으로 표시했다. 신규 관계 112개의 Korean `review`도 반영했다.

이 방식은 등록 규칙([`celeb-02-02-content-registration.md`](../celeb-02-02-content-registration.md) 「한국어판 확인」: 한국어판을 확인하지 못했으면 한국어 locale을 꾸며 만들지 않는다)과 어긋났다. 2026-09-11에 BOOK 21개의 Korean locale을 정리했다. 카카오에서 한국어판이 확인된 4권(「아우슈비츠의 무용수」·「나는 이 빌어먹을 지구를 살려보기로 했다」·「우리가 했던 최선의 선택」·「지미 카터」〈A Full Life〉)은 그 판본으로 교체했고, 나머지 17권은 Korean locale을 지웠다(원행은 `data/celeb/figure-books/locale-gates21-deleted-ko-backup.jsonl`). MUSIC 67·VIDEO 8·GAME 4의 Korean locale 79개는 같은 날 대조했다. VIDEO 8개는 TMDB `ko-KR` 제목과, MUSIC 63개는 iTunes 한국 스토어 표기와 글자 그대로 일치한다. 값은 맞으므로 `sources.primary`를 `tmdb`·`itunes`·`igdb`로 바로잡고 `verified=true`로 올리는 일만 남았고, `sw/web-bo/scripts/figure-books/locale-gates-nonbook-verify.mjs --apply`가 그것을 한다(기록은 `data/celeb/figure-books/locale-gates-nonbook-verify-log.jsonl`). 한국 스토어에 없는 MUSIC 4곡은 그대로 `verified=false`다.

도서 리뷰의 대상은 기존 156권과 신규 21권을 합친 **177권 전부**다. `review_en`에는 Gates Notes 공식 API의 `body_content`에서 HTML을 제거하고 문단을 유지한 본문을 저장한다. 3인칭 요약으로 바꾸지 않는다. `review`는 그 본문의 AGY 한국어 번역이며, 원문의 화자와 의미를 유지한다. [177권 공식 원문](../../../../data/celeb/viewing-research/2026-09-11-bill-gates-all-book-reviews.json)에 원본 HTML·추출 본문·출처·관계 ID를 함께 보존했다. 번역은 10건씩, 각 리뷰마다 새 AGY 호출로 처리한다. 이 도서 본문 복구는 영상·음악·게임 리뷰나 작품 locale 메타를 변경하지 않는다.

현재 Bill Gates의 268개 관계에는 English locale 268개와 Korean locale 240개가 있다. 이번 범위 밖의 기존 관계 28개는 Korean locale이 아직 없으며, 기존 데이터를 임의로 바꾸지 않았다.

DB의 관계 상태는 현재 스키마가 `WANT`와 `FINISHED`만 허용하므로 이번 연결분은 `FINISHED`로 기록했다. 영상의 시청 시점·시즌 범위와 음악의 playlist 수록 근거는 관계의 English 문장과 원자료에 남겨 두었으며, 음악 playlist 수록만으로 각 곡을 끝까지 들었다고 단정하지 않는다.

기존 전역 작품인 `Not the End of the World`는 현재 `kakao_book` 식별을 유지한 채 Bill Gates 관계만 추가했다. 새로 확인한 OpenLibrary 판본으로 기존 전역 메타를 교체하지 않았다.

## Gates Notes 구조

- 공식 sitemap에는 루트를 포함해 217개 URL, 루트를 제외해 216개 URL이 있었다.
- 주요 허브는 [Books](https://www.gatesnotes.com/books), [Meet Bill](https://www.gatesnotes.com/meet-bill), [Work](https://www.gatesnotes.com/work), [Heroes](https://www.gatesnotes.com/heroes)다.
- 일반적인 경로는 `/books/<category>`, `/books/<category>/reader`, `/books/<category>/reader/<slug>`, `/meet-bill/<topic>`, `/meet-bill/<topic>/reader/<slug>`, `/work/<topic>`, `/work/<topic>/reader/<slug>` 형태다.
- 게임은 [Games I love](https://www.gatesnotes.com/meet-bill/games-i-love)의 lightbox와 reader가 분리되어 있다.
- [All book reviews](https://www.gatesnotes.com/books/all-book-reviews)의 화면 counter `235 Articles`와 조사한 Books timeline 177개는 같은 수가 아니다. timeline에는 직접 hydrated된 행 14개와 placeholder 행 163개가 있었다.
- [Movies and TV](https://www.gatesnotes.com/books/movies-and-tv/reader)와 [Reading lists](https://www.gatesnotes.com/books/reading-lists/reader)는 sitemap URL만으로 작품 목록이 완전히 드러나지 않아 aggregate reader와 본문을 함께 확인했다.

## BOOK — 새로 연결한 21권

ISBN은 OpenLibrary에서 확인한 English 판본이며, 각 항목의 제목 링크는 해당 Gates Notes 근거 페이지다.

| 작품 | 저자 | ISBN-13 | OpenLibrary 판본 |
|---|---|---|---|
| [Chasing Hope](https://www.gatesnotes.com/books/all-book-reviews/reader/chasing-hope) | Nicholas D. Kristof | `9780593536568` | [OL51678412M](https://openlibrary.org/books/OL51678412M) |
| [Not the End of the World](https://www.gatesnotes.com/books/science/reader/not_the_end_of_the_world) | Hannah Ritchie | `9781529931242` | [OL59878250M](https://openlibrary.org/books/OL59878250M) |
| [Breath from Salt](https://www.gatesnotes.com/books/science/reader/breath_from_salt) | Bijal P. Trivedi | `9781948836371` | [OL29808929M](https://openlibrary.org/books/OL29808929M) |
| [The Choice](https://www.gatesnotes.com/the-choice) | Edith Eva Eger | `9781501130816` | [OL29743861M](https://openlibrary.org/books/OL29743861M) |
| [Origin Story: A Big History of Everything](https://www.gatesnotes.com/books/history/reader/origin_story) | David Christian | `9780316392006` | [OL26456535M](https://openlibrary.org/books/OL26456535M) |
| [The Best We Could Do](https://www.gatesnotes.com/The-Best-We-Could-Do) | Thi Bui | `9781419718779` | [OL26886785M](https://openlibrary.org/books/OL26886785M) |
| [Believe Me](https://www.gatesnotes.com/believe-me) | Eddie Izzard | `9781101924945` | [OL26926267M](https://openlibrary.org/books/OL26926267M) |
| [A Full Life](https://www.gatesnotes.com/A-Full-Life) | Jimmy Carter | `9781501115653` | [OL33534528M](https://openlibrary.org/books/OL33534528M) |
| [xkcd](https://www.gatesnotes.com/xkcd) | Randall Munroe | `9780615314464` | [OL25958867M](https://openlibrary.org/books/OL25958867M) |
| [The Fever](https://www.gatesnotes.com/books/science/reader/the_fever) | Sonia Shah | `9780374230012` | [OL24029460M](https://openlibrary.org/books/OL24029460M) |
| [The Bully Pulpit](https://www.gatesnotes.com/The-Bully-Pulpit) | Doris Kearns Goodwin | `9781476757674` | [OL52966732M](https://openlibrary.org/books/OL52966732M) |
| [Reinventing American Health Care](https://www.gatesnotes.com/reinventing-american-health-care) | Ezekiel J. Emanuel | `9781610393461` | [OL34853496M](https://openlibrary.org/books/OL34853496M) |
| [Making the Modern World](https://www.gatesnotes.com/making-the-modern-world) | Vaclav Smil | `9781118697979` | [OL29190420M](https://openlibrary.org/books/OL29190420M) |
| [The Idealist](https://www.gatesnotes.com/the-idealist-a-cautionary-tale-from-africa) | Nina Munk | `9780385525817` | [OL26886993M](https://openlibrary.org/books/OL26886993M) |
| [A World-Class Education](https://www.gatesnotes.com/A-World-Class-Education) | Vivien Stewart | `9781416613763` | [OL37395865M](https://openlibrary.org/books/OL37395865M) |
| [The Cost of Hope: A Memoir](https://www.gatesnotes.com/The-Cost-of-Hope) | Amanda Bennett | `9781400069842` | [OL25094278M](https://openlibrary.org/books/OL25094278M) |
| [Prime Movers of Globalization](https://www.gatesnotes.com/Prime-Movers-of-Globalization) | Vaclav Smil | `9780262014434` | [OL23980628M](https://openlibrary.org/books/OL23980628M) |
| [Polio: An American Story](https://www.gatesnotes.com/polio-an-american-story) | David M. Oshinsky | `9780195152944` | [OL7390117M](https://openlibrary.org/books/OL7390117M) |
| [Stretching the School Dollar](https://www.gatesnotes.com/books/education/reader/stretching-the-school-dollar-book-review) | Frederick M. Hess & Eric Osberg | `9781934742655` | [OL36778851M](https://openlibrary.org/books/OL36778851M) |
| [Jim Grant—UNICEF Visionary](https://www.gatesnotes.com/Jim-Grants-Child-Survival-Revolution) | Peter Adamson & Richard Jolly | `9789280637236` | [OL3702589M](https://openlibrary.org/books/OL3702589M) |
| [Why America Is Not a New Rome](https://www.gatesnotes.com/Comparing-America-and-Ancient-Rome) | Vaclav Smil | `9780262283885` | [OL29585080M](https://openlibrary.org/books/OL29585080M) |

## VIDEO

TMDB에서 19개 후보를 확인했고, 직접 시청·시청 중·장기 시청 근거가 있는 13개만 연결했다. `Time`은 [Gates Notes의 다큐멘터리 글](https://www.gatesnotes.com/time-is-a-powerful-documentary)에 나온 2020년 다큐멘터리다. `time.com`이나 Time magazine 자료가 아니다.

| 작품 | provider ID | Gates Notes 근거 |
|---|---|---|
| Time | `tmdb-movie-653729` | [source](https://www.gatesnotes.com/time-is-a-powerful-documentary) |
| Borgen | `tmdb-tv-42445` | [source](https://www.gatesnotes.com/borgen) |
| Silicon Valley | `tmdb-tv-60573` | [source](https://www.gatesnotes.com/silicon-valley) |
| Slow Horses | `tmdb-tv-95480` | [source](https://www.gatesnotes.com/books/movies-and-tv/reader/slow-horses) |
| Spy Game | `tmdb-movie-1535` | [source](https://www.gatesnotes.com/summer-books-2020) |
| The End of the Tour | `tmdb-movie-249688` | [source](https://www.gatesnotes.com/the-inner-game-of-tennis) |
| Salinger | `tmdb-movie-180314` | [source](https://www.gatesnotes.com/holiday-books-2013) |
| The Pitt | `tmdb-tv-250307` | [source](https://www.gatesnotes.com/books/books-home-topic/reader/summer-best-2026) |
| All the Light We Cannot See | `tmdb-tv-155421` | [source](https://www.gatesnotes.com/holiday-list-2023) |
| A Million Little Things | `tmdb-tv-81499` | [source](https://www.gatesnotes.com/summer-books-2020) |
| This Is Us | `tmdb-tv-67136` | [source](https://www.gatesnotes.com/summer-books-2020) |
| Ozark | `tmdb-tv-69740` | [source](https://www.gatesnotes.com/summer-books-2020) |
| The Daily Show | `tmdb-tv-2224` | [source](https://www.gatesnotes.com/summer-books-2017) |

표준 provider로 특정하지 못한 `Unexpected Economics`, `America and the New Global Economy`, `Economics, 3rd Edition`, 제목이 없는 TED sports performance talk, `Awakening Joy` lecture series는 연결하지 않았다.

## GAME

[Games I love](https://www.gatesnotes.com/meet-bill/games-i-love)의 직접 근거와 IGDB 식별이 맞은 다섯 종만 연결했다.

| 작품 | provider ID |
|---|---|
| Wordle | `igdb-186090` |
| Quordle | `igdb-194523` |
| Octordle | `igdb-194880` |
| Nerdle | `igdb-289136` |
| Spelling Bee | `igdb-206122` |

`Settlers of Catan`은 Gates Notes의 물리 보드게임 근거와 IGDB의 DOS adaptation/fangame 식별이 일치하지 않아 보류했다. `Heads Up`, Bridge, Bridge Base와 운동·포커·축구 언급도 같은 이유로 연결하지 않았다.

## MUSIC

Gates Notes의 두 Spotify playlist를 기준으로 Spotify track 88개를 확인하고 iTunes Search API를 88개 모두 조회했다.

| Gates Notes playlist | Spotify playlist ID | track 수 |
|---|---|---:|
| [My summer Spotify playlist](https://www.gatesnotes.com/spotify-playlist-summer-2023) | `3cf9Ki5CZQHklLkgN4HO8t` | 34 |
| [My holiday Spotify playlist](https://www.gatesnotes.com/spotify-holiday-playlist-2023) | `0q4sHygifkcNinCUwBYiDa` | 54 |

제목·아티스트가 일치하고 `previewUrl`이 있는 73곡을 Apple Music/iTunes 작품으로 연결했다. 각 MUSIC `contents.metadata`에는 `previewUrl`이 있고, locale sources에는 iTunes URL과 원 Spotify track URL·Gates Notes playlist URL을 남겼다. 나머지 15곡은 title variant 5, artist/title 확인 미완료 5, 추가 검토 2, playable result 없음 3으로 원자료에 남아 있다.

## 보류한 항목

자동 등록하지 않은 항목은 불확실한 provider identity나 근거 수준을 임의로 확정하지 않기 위해 남겨 둔 것이다. 전체 목록과 각 후보의 quote·note·provider 응답은 [조사 스냅샷](../../../../data/celeb/viewing-research/2026-09-10-bill-gates-gatesnotes.json)에서 확인한다.
