# 작품 소개 지속 수집

인물과 콘텐츠가 등록될 때마다 `content_locales.description` 공란이 새로 생기는 지속 과제의 도달점이다. 등록 시점 조회로 못 받은 소개를 주기적으로 외부 출처에서 재수집·번역·반영한다.

유형별 출처 채널의 실측 특성·허용 도메인·함정·공통 보류 규칙은 [`../project/celeb/celeb-02-06-content-introduction-sources.md`](../project/celeb/celeb-02-06-content-introduction-sources.md)가 SSoT로 쥔다. 이 문서는 그것을 복제하지 않고 반복 실행 순서와 현재 도달점만 둔다.

## 반복 실행 순서

신규 등록이 쌓이면 아래를 유형별로 다시 돌린다. 모든 스크립트는 기본이 dry-run/수집이며 반영은 `--apply`다. 반영 전후 절차(백업 → CAS → 재조회 → `contents:__all__` 캐시 갱신)는 어느 실행이든 동일하다.

1. **대상 재생성** — `content_locales.description`이 빈 행을 유형별로 새로 뽑는다. 과거 스냅샷을 재사용하지 않는다(신규 등록분이 매번 유입된다).
2. **출처 조회** — 유형별 실행점:
   - BOOK: `scripts/contents/prepare-gbooks.ts`(ISBN) → `prepare-gbooks-ta.ts`(제목+저자) → `collect-book-wiki.ts`(위키백과 ko·en). Google Books 키 풀은 `gbooks-keypool.ts`가 일일 한도를 관리한다. 알라딘 TTB는 로그인 불가로 폐기 — ko 잔량의 다음 후보는 정보나루 API(`prepare-naru.ts`, 키는 `.env`의 `DATA4LIBRARY_API_KEY`). 정보나루는 IP 미등록 상태에서 일 500건 호출 제한이 있어 한 번에 몰지 않는다. 위키백과는 저자 인물 문서·영화 문서·지명·개념 문서 오탐이 섞이므로 적용 후 표제어 전수 검수가 필요하며, 오매칭은 `revert-wiki-mismatch.ts`로 되돌린다.
   - VIDEO: TMDB 재조회(`prepare-video-refill.ts` 계열). 접두어 반전·삭제 ID는 소개가 아니라 external_id 수리 문제다.
   - GAME: IGDB 재조회. 오연결(포트·리마스터·번들)은 external_id 수리가 선행이다.
   - MUSIC: `collect-music-wiki.ts`(Last.fm 곡·앨범 위키 + 위키백과 ko·en). iTunes lookup으로 곡/앨범을 먼저 가른다.
3. **번역** — 한쪽 언어에만 원문이 있으면 형제 로케일을 번역으로 채운다. 백엔드 규칙은 SSoT의 「번역 백엔드」절이 쥔다 — ko→en 자유, en→ko는 상시 승인된 `agm→agy` 경로. 승인 밖 도구는 `agent-rules.md` 30번대로 회차별 지시가 필요하다.
4. **반영** — `apply-media-introductions.ts --plan FILE --apply`(VIDEO·GAME·MUSIC) 또는 도서 전용 적용기. 계약이 정체성·출처 도메인·로케일을 검증한다.
5. **보류 확정** — 허용 출처 전부에 원문이 없으면 공란 유지가 정답이다. 억지로 채우지 않는다.

## 현재 도달점 — 2026-09-27

| 유형 | 남은 KO 공란 | 남은 EN 공란 | 잔여 성격 |
|---|---:|---:|---|
| BOOK | 4,120 | 2,086 | 대부분 무원문층 + 신규 유입. 정보나루는 이 PC IP 등록으로 일 30,000건 한도가 됐고 잔여 수집을 완료했다 |
| VIDEO | 23 | 16 | TMDB 무개요. 위키 OVERRIDE 직접 지정으로 유명작 12건 회수. 잔여는 ko/en 위키에 문서 자체가 없는 무원문층 |
| GAME | 1 | 1 | 「The 2K Sports Collection」만 잔류 — 소개 원문이 어디에도 없는 번들 상품 |
| MUSIC | 1,603 | 1,583 | iTunes 삭제 항목·트랙급 무원문이 대부분. 보류 138건은 출처 부재로 확정 보류 |

- 이번 회차 반영: MUSIC 제공자 506 + agy 번역 396, BOOK GB 368 + 위키 200(224 적용 후 오매칭 24 되돌림) + 정보나루 536(256+280) + ko→en 298(agy 53 + 직접 번역 216 + kakao 리스캔 후속 직역 29) + en→ko 25(VIDEO 위키·agy 13 + 직역 4 + 게임·TED 등), 무지시 muse분 415건 폐기·agy 재생성(404 교체 + 11 비움).
- BOOK ko 리스캔: `book-description-sources.ts --apply --locale ko`가 ISBN 보유 공란 행에 카카오 contents + 다음 모바일 상세를 재조회해 413건 반영(상당수는 런타임 패치 마커). 중간에 Oracle SSH 일시 타임아웃으로 프로세스가 죽으면 `--after <마지막 content_id>`로 재개한다.
- VIDEO 직접 조사: `collect-video-wiki.ts`의 `OVERRIDE`(content_id|로케일 → 문서명)에 수동 매핑을 넣고 재실행하면 명명 규칙 어긋난 유명작을 회수한다. 강연류는 계약에 `www.ted.com`을 VIDEO 제공자로 추가해 ted.com 공식 소개를 썼다(션다 라임스 TED 토크).
- GAME 「트로이 온라인」: 허용 도메인 전부 무원문이라 `www.mmorpg.com`을 GAME 제공자로 추가하고 개발자 인터뷰(MMORPG.com)+엔가젯 종료 기사 근거로 소개를 작성해 반영했다.
- VIDEO en 원문 오매칭(형제번역 불가, en 행 자체가 타작품 서술): 「칼리차란」「안나말라이」「라피토」「표범」「스웨덴식 사랑 이야기」—en description 정정이 필요한 별개 결함이다.
- BOOK ko↔en 오매칭 2건: `cab080e5`(Monsoon — en은 캐플런 저서인데 ko는 이소연 희곡)와 `3d159707`(Peacemaker — en은 우 탄트 전기인데 ko는 임동원 회고록). 한 쌍이 같은 content_id에 다른 책이 섞인 상태로 형제번역 대상에서 제외했다.
- 정보나루 일 한도 해소: 마이페이지 인증키의 「서버 IP」에 로컬 공인 IP를 세미콜론으로 추가하면 된다(최대 3건, 기존 등록 IP는 지우지 않는다). 등록 즉시 효력이 난다.
- ko→en 직접 번역분 216건: ko 원문 큐 220건 중 출처 URL 기록 38건·레거시 무기록 182건. 계약은 `sourceUrl: null`을 양쪽 모두 무기록일 때 허용해 전량 번역 가능했다. 4건은 적용 시점에 타 채널 선점·원문 drift로 계약 탈락.
- ko→en 번역 계약은 en 본문의 비라틴 문자(漢字·키릴·아랍 등 원어 병기)를 거절한다 — 위키발 원문 재번역 시 원어 표기는 로마자만 쓰게 지시해야 통과한다.
- 작업 산출물은 `data/celeb/book-introductions/`의 유형별 폴더에 둔다. 백업은 `D:/feelandnote-backups/book-descriptions/`에 날짜별로 쌓고 지우지 않는다.
- 「ko 행에 영문 본문만」 보류분은 형제번역 큐로 전환할 수 있다.
- 짧은 소개 교체 패스(26.09.27): 80자 미만 행 680건을 휴리스틱 선별 → 실제 비소개(태그라인·발매사실·마케팅) 12쌍을 위키 원문으로 교체 반영(VIDEO Black en/ko·Bigg Boss en/ko, GAME Prince of Persia en/ko·Snood·시저3·KoF XV·애니팡 en/ko·Don Bradman en/ko, MUSIC Skinny Love en/ko·Blue Bash ko — 총 16행). 규칙은 SSoT 「짧은 소개 판정과 교체」절. `replacesReason` 필드로 채워진 행 덮어쓰기가 열렸다.
- 발견된 별개 결함: 「블랙」(2005 인도 영화, 감독 산제이 릴라 반살리)의 `external_id`가 `tmdb-tv-12598`(블랙 라군 애니메이션)로 오연결 — external_id 수리 대상이다.
- 「Saigo no kikyō」(1945 일본 영화)는 위키·대체 원문이 없어 최소 사실문("A Japanese film released in 1945.")로 유지.
