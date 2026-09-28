# 콘텐츠 소개문 수집 채널

`contents` BOOK·VIDEO·GAME·MUSIC의 `content_locales.description`을 외부 출처에서 채울 때의 채널 연구 결과를 모은다. 등록 메타 채널은 [`celeb-02-02-content-registration.md`](celeb-02-02-content-registration.md)가 쥐고, 이 문서는 소개문(description) 원문의 출처별 실측 특성만 다룬다.

공통 계약: 소개문은 실제 작품을 서술한 산문이어야 한다. 목차·저자 소개·물리 사양·독자 리뷰·`N곡 수록 스튜디오 앨범` 류의 서지 메모는 소개문이 아니다. 쓰기 절차(CAS·백업·재조회·캐시 갱신)는 `sw/web-bo/scripts/contents/`의 적용기(`apply-media-introductions.ts`·`apply-gbooks.ts`·`apply-book-introduction-translations*.ts`)와 `media-introduction-contract.ts`가 쥔다. 신규 등록으로 계속 생기는 공란의 반복 수집 순서와 도달점은 지속 과제 [`../../continuous/content-introductions.md`](../../continuous/content-introductions.md)가 쥔다.

공통 보류 규칙: 선택된 판본·작품 밖으로 소개를 fallback하지 않는다. ISBN 중복·합본·부분권·오디오북 등 범위가 충돌하면 보류한다. 기존 보류분은 새 원문을 독립 검증하지 않고 자동 승인하지 않는다. 출처 요청 오류(타임아웃·429·5xx)는 「원문 없음」이 아니다 — 재시도 대상이다.

## BOOK

| 채널 | 언어 | 실측 특성 |
|---|---|---|
| 카카오 책 | ko | 등록 시 1차. 책 페이지는 있어도 소개 란이 비어 있는 경우가 많다(구간·절판·소규모 출판사) |
| YES24 상품 페이지 | ko | `recover-book-introductions.ts` 경로. ISBN·제목·저자 대조 후 `#infoset_introduce` 추출. 영문 `--apply`는 KO/EN 작품 오연결로 차단돼 있다 — ko만 쓴다 |
| OpenLibrary | en | 등록 시 1차. description은 자원봉사자 수기 필드라 절반 이상이 비어 있다. 실측 공란의 ~66%가 「레코드는 있으나 description 없음」 |
| Google Books | ko·en | 소개문 수집 한정 해제(26.09.15). 출판사 제공 description이 OL 공란 도서에도 실재한다 — ISBN 조회 명중 ~58%, 제목+저자 조회 ~13%. 일일 무료 한도 1,000회/키. 키 로테이션은 `gbooks-keypool.ts`(키별 카운터·죽은 키 표시·403/429 순환) |
| 위키백과(ko·en) | ko·en | 책 문서가 있는 유명작에 유효 — 표본 명중률 ko ~12%·en ~28%. 저자명이 발췌 앞부분에 함께 등장할 때만 채택. 수집기는 `collect-book-wiki.ts` |
| 알라딘 TTB | ko | **사용 불가** — 알라딘 계정 로그인이 안 돼 TTB 키 발급이 불가하다(26.09.16 확인). `external_source` 허용값 `aladin`은 남겨둔다 |
| 정보나루(data4library) | ko | 국립중앙도서관 API. `srchDtlList?isbn13=`로 책 소개(description) 조회 — 도서관코드 불필요. 인증키 발급 후 마이페이지 승인이 있어야 활성화된다. 일 500건, 서버 IP(오라클) 등록 시 일 30,000건. 수집기는 `prepare-naru.ts`, 적용은 `apply-gbooks.ts --file` 재사용 |

ko 행에 영문 본문만 잡히는 경우는 ko 로케일 검사가 걸러내므로 번역 큐로 보낸다.

## VIDEO

- 허용 출처: `www.themoviedb.org`, `en.wikipedia.org`, `ko.wikipedia.org`, `www.ted.com`. ko 개요가 드물어 en 개요를 받아 번역 큐에 두는 경로가 주력이며, en→ko 큐 실행은 아래 「번역 백엔드」의 상시 승인 경로(agm→agy)를 쓴다.
- 위키백과 수집기는 `collect-video-wiki.ts`다. 제목 정규화 일치 + 리드의 매체어(영화·드라마·film·series) + 연도 구분자 검증을 통과한 문서만 채택한다. 검색으로 못 찾는 유명작은 스크립트 내 `OVERRIDE`(content_id|로케일 → 문서명)에 수동 매핑하고, 오매칭 확정 행은 `DROP`으로 제외한다.
- 강연·토크류는 TMDB에 개요가 없어도 ted.com 공식 페이지에 소개문이 있다 — external_id 없는 행도 TED 출처+정체 근거로 통과한다.
- 실측 결함 유형: `tmdb-movie-N`↔`tmdb-tv-N` 접두어 반전(숫자는 정답), 한국어 개봉명과 원제 불일치(동일 작품, 제목만 다름), TMDB에서 삭제된 ID(404 → 후보 재식별 필요).
- 명작인데 소개문이 비어 있으면 링크 문제를 먼저 의심한다. 실측으로 `external_id`가 null인 레코드와, 잘못 붙은 movie-ID가 en 제목을 다른 작품으로 오염시킨 레코드, 정상 레코드와 별개로 생긴 중복 레코드가 발견됐다 — 소개문 수집 전에 TMDB 검색+리뷰 문맥으로 정체를 확정하고 재연결·중복 병합(GAME의 중복 삭제 절차와 동일: 전 FK 조회 → 관계 재지정 → 고아 삭제)한다.
- 잔여 무개요층은 다큐·구작 중심의 진짜 무원문이다.

## GAME

- 허용 출처: `www.igdb.com`, `store.steampowered.com`(`?l=koreana|english` 쿼리만 허용), `en.wikipedia.org`, `ko.wikipedia.org`, `www.mmorpg.com`.
- 위키백과 수집기는 `collect-game-wiki.ts`다. VIDEO와 같은 정체성 규칙 + 리드에 게임 매체어 요구. 연도 구분자는 출시연도와 ±1 이내만 채택한다(리마스터·동명작 차단).
- `www.mmorpg.com`은 인터뷰·기사가 실재하는 게임의 조사 작성 근거로만 쓴다 — 자동 수집 대상이 아니다.
- IGDB는 같은 이름의 포트·리마스터·번들·확장팩·에디터가 별도 ID를 가져 오연결이 잦다. 이름 부분문자열 비교는 `Spore`↔`Spore Creature Creator`처럼 오탐한다 — 연도·개발사·요약 내용으로 확인한다.
- 동일 작품의 중복 contents 행이 실재했다 — 삭제 전 전 FK 참조(celeb_contents·figure_book_contents·curated_list_items·flow_nodes·member_contents·notes·records)를 조회하고 관계를 정상 행으로 재지정한다.
- Steam 상품 설명은 IGDB 무요약 잔여의 대체 출처 후보였으나, 39작품 표본 시험에서 명중 1건(오탐 의심)으로 사실상 무효가 확인됐다.

## MUSIC

- 등록 출처는 iTunes이나 iTunes API에는 소개문 필드가 없다. 소개문은 별도 채널에서 가져온다.
- 허용 출처: `en.wikipedia.org`·`ko.wikipedia.org`·`www.last.fm`.
- 정체성 검증은 iTunes lookup의 `wrapperType`(track/collection)·`artistName`·`trackName|collectionName`이 기준이다. 저장 제목보다 iTunes 메타를 신뢰한다.

### Last.fm

- `track.getInfo`·`album.getInfo`에 `autocorrect=0` 필수. 유명 동명곡으로 보정되어 다른 아티스트 곡으로 이동하는 사고가 있다(커버곡 함정).
- **`wiki.summary`는 문장 중간에 끊기는 티저다. 전문은 `wiki.content`에 있다** — `Read more on Last.fm` 링크와 CC 라이선스 꼬리를 제거해 쓴다. 티저로 적용했다가 전문으로 교체한 전례가 있다.
- 반환된 `artist.name`·`name`이 요청과 정규화 일치해야 채택한다(Last.fm이 조용히 다른 곡을 줄 수 있다).

### 위키백과

- 곡 문서는 명곡에만 있고, 앨범 문서는 커버리지가 훨씬 넓다. `opensearch`로 `제목 아티스트` 검색 후 문서명 후보(`제목 (아티스트 song)`·`제목 (song)` 등)를 시도하고, 발췌 첫 500자에 제목+아티스트가 함께 등장할 때만 채택한다.
- 동음이의 문서(제목 `(동음이의)`, 본문 `다음과 같은 뜻이 있다`·`may refer to`)를 배제한다.
- 짧은 간격의 대량 호출은 429를 낸다 — 직렬+재시도로 돌고, 실패분을 재스캔하는 구조면 중간 저장이 재개점이 된다.
- 트랙급 레코드(곡 단위)에는 소개문이 구조적으로 존재하지 않는다 — 공란이 정상 종착지인 층이다.

## 번역 백엔드

- ko→en 번역은 본 에이전트가 직접 한다(26.09.27 사용자 지시 — 외부 모델 호출 없이 직접 번역). en→ko 번역은 **agy 또는 ChatGPT만** 쓴다 — 당분간은 `agm` 계정 풀을 통한 agy 하나로 고정한다(`agy-accounts`·`agy-antigravity` 스킬). 이 agm→agy 경로는 이 작업에 한해 상시 승인돼 회차별 지시가 필요 없다(26.09.27 사용자 지시). 그 외 도구·용도는 `../../agent-rules.md`의 규칙대로 지시가 있을 때만 쓴다.
- 번역은 검증된 원문에만 쓴다. 독립 조사·작성을 시키지 않는다.
- 허용 출처 어디에도 원문이 없는 공란은 **본 에이전트가 직접 조사해 작성한다**(26.09.27 사용자 지시). 조사는 웹 검색으로 작품 정체를 확인하고, 근거로 삼은 URL을 `sources.description`에 기록하며 `description_method`는 `research`로 둔다. 사실 확인이 안 되는 작품은 여전히 공란이 정답이다.
- 원문이 다른 작품을 서술하거나 자기모순이면 `issue`로 거부하게 설계한다 — 이 거부가 손상 본문 검출기로 작동한 전례가 있다.
- 운영 함정(muse 기준 사례): UUID 끝자리를 잘라 반환(접두 일치로 복원), 대용량 프롬프트의 `ENAMETOOLONG`(원문을 문장 경계 ~2,000자로 절단), 박약 원문의 박약 번역(20자 미만은 보류).
- ko 번역문은 한글 15자 이상·한글 비율 25% 이상·한국어 종결로 끝나야 계약을 통과한다 — 영문 작품명으로 끝나는 번역은 걸러진다.

## 짧은 소개 판정과 교체

- 길이 자체는 기준이 아니다. 한 문장이라도 작품을 서술한 산문이면 유효하다(TMDB 개요류).
- **비소개 판정**(아래 중 하나면 소개문이 아니며 공란과 같이 취급한다): 태그라인·마케팅 문구("Forget Life, Play SNOOD!"), 발매·이식 사실만 있는 문장("A Japanese film released in 1945.", "Amiga로 이식한 X입니다"), 물리 사양·수록 정보, 저자·제작자 소개만 있는 문장, 제목만 되놓는 문장.
- 비소개 판정 행은 재수집 큐에 올린다. 검증된 대체 원문이 있으면 교체하고, 없으면 비운다 — 성의 없는 문장을 자리 채우기로 두지 않는다.
- **교체(overwrite) 경로**는 빈 행 적용과 분리된 별도 절차다: 기존 본문의 비소개 판정 근거를 플랜에 남기고, 대체 원문은 신규 적용과 동일한 정체성 검증을 전부 통과해야 하며, 백업·CAS는 덮어쓰는 행의 기존 값 기준으로 잡는다. 실측 80자 미만 행은 VIDEO 447·GAME 84·MUSIC 145건(전체의 ~5%)이며 그중 비소개는 일부다 — 전수 교체가 아니라 선별 교체다.

## 출처 표기(화면 provenance)

- 쓰기 계약이 `sources.description`에 출처 URL을 강제하므로 소급 표기가 가능하다(실측: VIDEO 91%·GAME 89%·MUSIC 99%가 URL 보유).
- URL 없는 레거시 행도 `sources.primary`·`contents.external_source`로 제공자를 복원한다: tmdb→`themoviedb.org/movie|tv/<external_id>`(접두어로 구분), igdb→`igdb.com/games/<external_id>`, itunes→`sources.url`의 애플 뮤직 주소를 그대로 쓴다.
- 번역 행(`description_method: 'translation'`)은 원문 출처 URL을 보존하므로 「Wikipedia — 번역」처럼 원천+번역 표기가 된다.
- 화면 표기 구현: `mediaIntroductionAttribution()`(sw/web/src/lib/utils/book-description.ts)이 BOOK 외 유형의 행에서도 attribution을 만들고, `getContentBrief`가 책 외 행에도 `introductionAttribution`을 실어 준다. 펼침 카드는 저장 소개 아래에 제공자명 링크를 두고 모달 `원문` 링크도 같은 URL을 쓴다.

## 데이터 보존 필드

- `sources.description`: 소개문 출처 URL. `sources.description_method`: `provider|translation|research`. `sources.description_source_locale`: 원문 언어(`research`는 작성 언어). `sources.introMissing`: 조회했으나 원문 없음 표식(적용 시 제거된다).
- 형제 로케일 원문이 출처 미기록인 레거시 행의 번역은 `sourceUrl=null`을 허용한다 — 그 외에는 허용 도메인의 https URL만 통과한다.
- 작업 산출물은 `data/celeb/book-introductions/` 아래 유형별 폴더(`gbooks`·`video-provider`·`game-provider`·`music-wiki`·`sibling-media` 등)에 둔다.
