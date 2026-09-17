# 작품 소개 공란 보완

사용자 최신 지시: 남은 작품 소개를 계속 채운다. **Devin SWE에 작품·판본·소개 출처 조사를 최대한 맡기고, 번역이 필요하다고 확인된 원문을 Muse로 넘긴다.** 주 에이전트는 배정·충돌 해결·최종 확인에 집중한다. 마지막 요청은 실행 재개가 아니라 이 인수인계 작성이다.

유형별 소개문 출처 채널의 실측 특성·명중률·함정은 [`../project/celeb/celeb-02-06-content-introduction-sources.md`](../project/celeb/celeb-02-06-content-introduction-sources.md)가 SSoT로 쥔다. 이 문서는 끝이 있는 잔량 정리만 다룬다 — 신규 등록으로 계속 생기는 공란의 반복 수집은 지속 과제 [`../continuous/content-introductions.md`](../continuous/content-introductions.md)로 옮겨졌다.

## 현재 도달점 — 2026-09-16

「검증 가능한 번역 전부」와 VIDEO·MUSIC·GAME 잔여 재점검·회수분 반영까지 처리했다. 모든 반영은 백업→SSH SQL→재조회→캐시 갱신 순서로 끝났다.

| 유형 | 누적 반영 | 남은 KO 공란 | 남은 EN 공란 |
|---|---:|---:|---:|
| BOOK | 7,806 | 2,512 | 1,738 |
| VIDEO | 269 | 18 | 14 |
| MUSIC | 801 | 1,043 | 1,042 |
| GAME | 11 | 4 | 4 |

참고: 공란 풀은 유입이 있다 — kakao_book 등록 파이프라인이 9/14~15에 신규 BOOK 527건을 등록해 en 공란이 함께 늘어난다(GB 적용 607건 대비 공란 감소 105). ISBN 대상 목록은 준비 시점 스냅샷이라 신규 등록분은 다음 targets 재생성 때 잡는다.

번역 반영 내역:
- BOOK en→ko 1,074건 번역 반영(`en-ko/en-ko-approved.json`): OL 검증 실본문 340 + 'OPEN' 마커의 현재 본문 조회분 604 + 무출처 형제 본문 132 + 로케일 태그 교정분. en 로케일에 비영어 본문이 저장된 레거시 61건은 실제 원문 언어(`description_source_locale`: es·de·fr·nl·ja·en)를 기록해 반영했다.
- BOOK ko→en 잔여 37건 반영(`ko-en/ko-en-rest-approved.json`): 무출처 ko 본문 21 + muse가 「원문 절단」으로 거부한 17건 중 다음 ISBN 재조회로 완전 본문을 회수한 16. 카카오 본문도 절단된 1건은 보류.
- VIDEO+MUSIC 형제번역 392건 반영(`sibling-media/sibling-muse-draft-plans.json`): MUSIC→en 354, VIDEO→ko 37, VIDEO→en 1. muse가 「원문 모순」으로 거부한 17건은 보류.
- 적용기 재조회의 `sources.description === null` 비교 버그(키 부재=undefined)를 고쳤고, 번역 계약에 `sourceLocale` 선택 필드를 추가했다. 마커 행 CAS는 plan의 source.description을 DB 마커값('OPEN')으로 유지해 통과한다 — 조회 본문은 `sourceText`에만 둔다.

미디어 잔여 재점검(09-15):
- VIDEO TMDB 재조회(`prepare-video-refill.ts`·`check-video-refill.ts`): 잔여 45건 중 개요 존재 39(en)·15(ko)를 확인해 33건 계획, 품질 검사로 한 문장짜리 2건을 걸러 **31건 적용**(`video-provider/refill-plan.json`). 보류는 TMDB 무개요·제목 불일치·movie↔tv 오연결이다.
- `media-introduction-contract.ts` 확장 2건: (1) `external_source` NULL이어도 `tmdb-` 접두어로 출처가 잠기는 레거시 VIDEO 행 허용(IS NOT DISTINCT FROM 비교), (2) 번역의 `sourceUrl` null 허용 — 형제 행이 출처 URL을 기록하지 않은 경우만, `sources.description`을 쓰지 않는다. 테스트 8/8.
- MUSIC 형제번역 잔여: ko만 있는 29건 중 신규 12건을 큐에 추가해 번역, 서지 메모 수준 5건·ko 원문 로케일 실패 1건·ko 행에 영문이 저장된 2건을 제외하고 **4건 적용**(`sibling-media/residual29-plan.json`).
- MUSIC Last.fm·위키백과 패스(`collect-music-wiki.ts`·`retry-music-wiki.ts`·`build-music-wiki-plan.ts`): 잔여 1,284건을 iTunes lookup으로 곡/앨범 구분(곡 972·앨범 224·카탈로그 삭제 88) 후 Last.fm 곡·앨범 위키와 위키백과 ko·en을 아티스트+제목 정체성 검증으로 조회. Last.fm 170·위키 88건 명중 → en provider 242건·ko provider 6건·ko muse 번역 227건 반영(박약 원문·동음이의·검증 실패 24건 보류). Last.fm `wiki.summary`는 문장 중간에 끊기는 티저라 `wiki.content` 전문으로 재수집해 적용분 108건을 교체했다(`fix-music-en-fulltext.ts`). 잔여 ~1,040건은 트랙급 레코드로 세 출처 모두에 소개문이 없는 층이다.
- MUSIC 손상 본문 수리(`repair-music-corrupt.ts`·`clear-music-corrupt.ts`): muse가 「다른 곡 서술」로 거부한 17건의 ko 본문을 정답 위키 문서 발췌로 교체·en 채움 — 정답 문서가 있는 12건 반영(Single Ladies·강남스타일·Freedom·Texas Flood·Paradise·P.Y.T.·A Bar Song·Love Minus Zero·Screaming for Vengeance·I'll Never Love Again·Layla·Wild Is the Wind), 정답 문서가 없는 5건(0%·기억을 걷는 시간·Tin Pan Alley·Ugly·White Braids & Pillow Chair)은 잘못된 ko 본문을 비우고 `introMissing` 표시.
- GAME 잔여 감사·수리(`audit-game-links.ts`·`repair-game-links.ts`): 전체 346행의 IGDB 이름 전수 대조. 오연결 4건을 정상 ID로 재연결하고 ko·en 소개문을 정상 요약으로 교체 — Red Alert→295, MGS→375, AoE2→327, Spore→1876(en 제목도 「Spore Creature Creator」→「Spore」). Assassin's Creed→128·Super Mario Bros.→358은 정상 레코드가 별도 존재해 오연결 행은 **중복 레코드**다 — SMB의 celeb_contents 3건은 정상 행으로 재지정 완료. 두 고아 중복 행(Assassin's Creed·Super Mario Bros.)은 전 FK 참조 0건 확인 후 삭제했다 — 삭제 전 전체 행은 `D:/feelandnote-backups/book-descriptions/game-dedup-*`에 보존. 표기차이 동일작품(Alan Wake II·EarthBound·BG3·Minecraft Java·Neopets Browser)과 무요약 4건(Super Famista·2k Sports·Falcon 3.0·Troy Online)은 보류 유지.
- VIDEO 오연결 수리(`repair-video-links.ts`): movie↔tv 접두어만 틀린 5건(숫자 ID가 이미 정답)을 교정하고 en 개요+ko 번역을 채움 — Beavis and Butt-Head, Drake & Josh, Payitaht: Abdulhamid, Red Dwarf, Resurrection: Ertugrul. 제목 불일치 오탐 3건(미키의 포경선=The Whalers, 시네라마 홀리데이=Cinerama Holiday, 마지막 귀향=Saigo no kikyō)은 동일 작품이라 ko 번역만 채움.

백업은 `D:/feelandnote-backups/book-descriptions/` 아래 날짜별 디렉터리. 이전 반영분(6,825행·5,736행) 기록은 아래를 유지한다.

## Google Books 소개문 수집 경로

사용자가 Google Books 금지를 소개문 수집 한정으로 해제했다(26.09.15, `AGENTS.md` 반영). 단일 키·일일 950회 캡, 키 로테이션 금지. 본문은 실본문으로 저장하고 `sources.description`에 `https://books.google.com/books?id=<volumeId>`를 박는다(마커·런타임 조회 없음).

- 준비: `scripts/contents/prepare-gbooks.ts`(ISBN 경로), `prepare-gbooks-ta.ts`(제목+저자 경로). 결과·캐시·키별 쿼터 상태는 `data/celeb/book-introductions/gbooks/`. 스크립트는 재개 가능 — 같은 명령을 다시 실행하면 된다.
- 키 풀: `gbooks-keypool.ts` — 사용자 승인으로 키 로테이션 사용. 키별 일일 카운터를 상태 파일에 기록하고, 400/키무효는 dead, 403·429는 exhausted로 표시해 다음 키로 넘긴다. 5xx는 재시도.
- 적용: `apply-gbooks.ts --apply [--file <prepared.json>]`. CAS·재조회·캐시 갱신은 기존 계약 그대로.
- 진행(완료): ISBN 경로 1,672건·973건 적용(명중 58%). 제목+저자 경로 3,412건 전량 처리·396건 적용 — GB 채널 누적 1,369건.
- ko 행에 영문 본문만 잡히는 경우는 로케일 검사에서 걸러 보류된다(약 97건) — 필요하면 형제번역 큐로 넘긴다.

## VIDEO 정체성 수리·BOOK 위키·MUSIC 유령 감사 (26.09.16)

- **VIDEO**: 공란 43작품 전수 감사 — 소개문 문제가 아니라 레코드 결함이었다. 정상 레코드와 중복인 고아 13건 삭제(관계 15건 본존 재지정, 백업 `video-dedupe-*`), `external_id` null→정상 TMDB 부착 20건·오연결 해제 1건·오염된 en 제목 복원 3건(백업 `video-relink3-*`). 소개문 39건 적용(TMDB ko 16·en 18·muse 번역 5, 백업 `media-*`). 잔여 ko 10·en 7은 진짜 무개요.
- **BOOK 위키백과**: `collect-book-wiki.ts`로 공란 4,322건 전량 스캔 → 303건 명중 → 269건 적용(ko 79·en 190). 적용 후 표제어 전수 검수에서 저자 인물 문서 6건·영화 문서 1건·술집 문서 1건 오탐을 발견해 백업 `change.before`로 CAS 되돌림. 교훈: 위키는 적용 후 검수가 필수다(저자명 매칭이 인물 전기 문서를 통과시킨다).
- **MUSIC 유령 감사**: iTunes 조회 불가 88건 재조회 — 82건 생존(레이트리밋 가짜 유령)·진짜 삭제 6건 확정. 생존분 재수집으로 provider 26+muse 번역 26=52건 적용, 번역 검증 탈락 18건 보류.
- 정보나루: 인증키 발급·`prepare-naru.ts` 준비 완료, API 활성화 승인 대기(`vitalizationErr`). 승인 시 `apply-gbooks.ts --file prepared-naru.json` 경로로 바로 적용.

기타 잔여:

1. BOOK ko·en 잔여: GB 결과 이후 재집계한다. 기존 보류는 OL 본문 없음(마커 조회 실패 151)·무출처 무근거 URL(57+280)·원문 없음(2)·카카오 절단(1) 등이다.
2. MUSIC ko 1,271·en 1,296: Apple 트랙·국내곡·커버버전 중심으로 Apple·Wikipedia·Last.fm에 확인 가능한 원문이 없는 항목이다(ko·en 위키 표본 조사 명중률 ~0%). ko 본문이 다른 곡을 서술하는 손상 17건은 별도 수리 과제다.
3. VIDEO ko 10·en 7: 정체성 수리로 명작층을 전부 회수했고 남은 것은 진짜 무개요(Rihanna 하프타임·Ciutat morta·Mirroring·Bugs Bunny Show 등). 위키백과 확장은 `media-introduction-contract.ts`의 PROVIDERS 변경이 선행이다.
4. GAME ko 40·en 40: IGDB 무요약 4건 + 신규 등록 유입분. Steam 경로는 39작품 표본 시험에서 명중 1(오탐 의심)로 사실상 무효 확인.
5. MUSIC ko 1,055·en 1,056: Last.fm·위키백과 무원문 트랙급 + 신규 유입. 곡 단위는 소개문이 구조적으로 안 생기는 개념이라 공란이 정상인 층이다. muse 번역 보류 18건·iTunes 삭제 확정 6건은 `music-wiki/held.json`·`ghosts-recheck.json`에 있다.
5. 새 후보가 생기면 동일 계약으로 처리한다 — 검증된 원문만 Muse로 넘기고, 번역은 원문과 독립 대조한 뒤 기존 반영기로 저장한다.

사용자가 허용한 동시 실행은 **Muse free 1개, contributor 3~4개, SWE 2개까지**다. 지난 배치는 Muse contributor 책 2개·음악 1개, SWE 최대 2개로 운영했다. 메모리가 부족하면 SWE 1개로 줄이고 새 실행을 멈췄다. 스킬의 더 큰 기본 동시 수로 올리지 않는다. free는 당시 응답이 없어 contributor를 사용했다. agy는 이번 작업에 승인되지 않았다.

호출은 [Devin SWE 스킬](../../.agents/skills/devin-swe/SKILL.md)의 `devin-call.mjs`, [Muse 스킬](../../.agents/skills/opencode-muse/SKILL.md)의 `muse-call.mjs`를 사용한다. 품질 검수 담당과 실행 담당을 분리하고, 실행 담당이 검수 결과를 받아 DB 반영·재조회·캐시 갱신까지 책임진다. 주 에이전트에 원문 전체를 반복 전달하지 않는다.

**터미널 출력 주의:** 사용자가 겪은 현상은 Windows 터미널의 끝없는 스크롤이다. 프로세스 충돌·메모리 부족으로 확정한 것이 아니다. CLI stdout/stderr는 작업별 파일로 받고 화면에는 묶음 단위 요약만 표시한다. 전체 로그·전체 후보를 반복 출력하거나 `Get-Content -Wait`로 계속 흘리지 않는다. 사용자 서버와 다른 세션 프로세스는 정리 대상이 아니다.

## 실행 코드와 근거

등록·출처 규칙은 [콘텐츠 등록 규격](../project/celeb/celeb-02-02-content-registration.md), 정체성 감사는 [콘텐츠 감사 규격](../project/celeb/celeb-02-04-content-audit.md)을 따른다. 작업 데이터는 [book-introductions](../../data/celeb/book-introductions/)에 있다.

| 대상 | 이어 볼 자료 |
|---|---|
| BOOK 기존 본문 후보·보류 | `muse-translation/review-status.json`, `prepared-45-145.json`, `prepared-145-245.json`, `prepared-245-519.json` |
| BOOK OPEN 1,031건 | `muse-translation/prepared-open-0-1031.json`, `independent-open-review.json`, `independent-open-review-c.json`, `open-apply-events.jsonl` |
| BOOK en OL 마커 | `en-markers/prepared-en.json`, `apply-en-markers.ts` |
| BOOK ko→en 번역 | `ko-en/ko-en-waiting.json`, `ko-en-approved.json`, `ko-en-held.json`, `apply-koen*.log`, `apply-book-introduction-translations-koen.ts` |
| BOOK en→ko 번역 | `en-ko/en-ko-waiting.json`, `en-ko-approved.json`, `en-ko-held.json`, `en-ko-rest-waiting.json`, `prepare-en-ko.ts`, `prepare-rest.ts`, `merge-en-ko-translations.ts` |
| BOOK ko→en 잔여 | `ko-en/ko-en-rest-waiting.json`, `ko-en-rest-approved.json`, `ko-en-rest-recovered.json`, `recover-truncated-ko.ts` |
| VIDEO·MUSIC 형제번역 | `sibling-media/sibling-queue.json`, `sibling-muse-draft-plans.json`, `sibling-holds.json`, `residual29-plan.json`, `prepare-sibling-media.ts` |
| VIDEO TMDB 재조회·수리 | `video-provider/tmdb-refill-plan.json`, `tmdb-refill-holds.json`, `relink-tmdb.json`, `relink-ko.json`, `prepare-video-refill.ts`, `check-video-refill.ts`, `repair-video-links.ts` |
| GAME 감사·수리 | `game-provider/link-audit.json`, `relink-summaries.json`, `relink-ko.json`, `relink-snapshot.json`, `audit-game-links.ts`, `repair-game-links.ts` |
| BOOK Google Books | `gbooks/prepared-gbooks.json`, `gbooks/prepared-gbooks-ta.json`, `prepare-gbooks.ts`, `prepare-gbooks-ta.ts`, `apply-gbooks.ts`, `gbooks-keypool.ts` |
| BOOK 위키백과 | `book-wiki/results.json`, `book-wiki/prepared-book-wiki.json`, `collect-book-wiki.ts` |
| BOOK 정보나루(대기) | `prepare-naru.ts` — 키는 `sw/web/.env`의 `DATA4LIBRARY_API_KEY` |
| MUSIC 위키·유령 감사 | `music-wiki/results.json`, `plan.json`, `plan-ko*.json`, `held.json`, `ghosts-recheck.json`, `muse-draft-plans-held.json`, `collect-music-wiki.ts`, `build-music-wiki-plan.ts`, `music-wiki/muse-run.mjs` |
| MUSIC 잔여·출처 오류 | `music-provider/snapshot.json`, `review-holds.json`, `results/`, `remainder-review-provider.json` |
| VIDEO 잔여 | `video-provider/remaining.json`, `title-review-b.json` |
| GAME 잔여 | `game-provider/game-residual-result.json`, `game-residual-review.json` |
| 국내판 조사·반영 | `swe-repairs/round2/`, 아래 외부 백업 |

공용 실행점은 `sw/web-bo/scripts/contents/`의 `apply-book-introduction-translations.ts`, `apply-media-introductions.ts`이며 `--plan FILE`은 검증, `--apply`가 실제 반영이다. `sw/web-bo`에서 `.env`를 읽고 실행한다. 기존 `collect-{video,game,music}-introductions.ts`와 로컬 Muse 실행 코드를 재사용하되, 완료된 실행의 고정 후보·종료 표시를 지워 그대로 재실행하지 않는다.

**영문 `recover-book-introductions.ts --apply`는 잘못된 KO/EN 작품 연결 때문에 차단돼 있다.** 공란 수를 줄이려고 차단을 해제하지 않는다. 실제 원문·정체성을 검증한 계획을 기존 반영 계약으로 처리한다. OPEN 원문은 `sourceText`에 보존하고 DB source 행의 표시값은 그대로 두어 동시 수정 검사를 유지할 수 있다.

선택 판본 밖으로 소개를 fallback하지 않는다. 번역 배지도 원본 출처를 유지하며 OpenLibrary는 `OL`이다. BOOK 신규 메타는 한국어 카카오·영어 OL 규칙을 유지하고 YES24의 실제 상품 소개를 검증해 사용할 수 있다. `figure_book_contents`가 없는 일반 BOOK에 한국어판을 추가하려고 인물 관계를 만들지 않는다. ISBN 중복·합본·부분권·오디오북 범위가 충돌하면 보류한다.

기존 보류의 실제 오류 예: Doctor Who/Red Dwarf의 다른 영화 ID, Spore 본편과 Creature Creator 혼동, 음악의 곡/앨범/Apple 상품 불일치. Youngblood·MISIA Everything·Between the Bars는 원문 사실 오류로 보류했다. 새 원문을 독립 검증하지 않고 기존 보류를 자동 승인하지 않는다. Wikipedia 429는 `Retry-After`를 지키며 중단했고 마지막 실패 3건만 재확인했다. 요청 오류는 원문 없음이 아니다.

## 로컬 자료 보관

JSON·JSONL은 `.gitignore`로 제외했지만 현 위치에 보존돼 있다. 코드 17개(`.mjs`·`.ts`)는 제외하지 않았다. 다른 PC나 새 체크아웃에는 이 자료가 없을 수 있으므로 아래 백업을 먼저 확인한다. 전체 폴더를 옮기면 상대 import와 고정 경로가 깨진다.

- 원문·DB 변경 전 값·적용 근거: `D:/feelandnote-backups/book-descriptions/`
- 국내판 마지막 조사/반영: `swe-research-20260915/round2/`, `swe-ko-repairs-round2/` — 위 백업 폴더 아래.
- 전체 작업 폴더 백업: `workspace-cleanup-20260915-071400.zip` — 17,731파일, 내부 `SHA256SUMS.json`과 전량 대조 완료.

백업 후 완료 로그 14개와 옛 `raw-/translated-<ordinal>` 63개만 제거했다. OPEN raw·translated·적용 JSONL·검수·보류·캐시는 재개에 쓰이므로 유지했다. DB 반영은 이미 운영에 적용됐으며, 이번 인수인계 요청에는 추가 실행·커밋·배포가 포함되지 않는다.
