# 작품 소개 공란 보완

사용자 최신 지시: 남은 작품 소개를 계속 채운다. **Devin SWE에 작품·판본·소개 출처 조사를 최대한 맡기고, 번역이 필요하다고 확인된 원문을 Muse로 넘긴다.** 주 에이전트는 배정·충돌 해결·최종 확인에 집중한다. 마지막 요청은 실행 재개가 아니라 이 인수인계 작성이다.

## 현재 도달점 — 2026-09-15 (5차 미디어 재점검까지)

3차는 「검증 가능한 번역 전부」를, 5차는 VIDEO·MUSIC·GAME 잔여의 재점검과 회수분 반영을 처리했다. 모든 반영은 백업→SSH SQL→재조회→캐시 갱신 순서로 끝났다.

| 유형 | 누적 반영(2차+3차+4차) | 남은 KO 공란 | 남은 EN 공란 |
|---|---:|---:|---:|
| BOOK | 7,806 | 2,512 | 1,738 |
| VIDEO | 254 | 27 | 20 |
| MUSIC | 547 | 1,271 | 1,296 |
| GAME | 3 | 4 | 9 |

참고: 공란 풀은 유입이 있다 — kakao_book 등록 파이프라인이 9/14~15에 신규 BOOK 527건을 등록해 en 공란이 함께 늘어난다(GB 적용 607건 대비 공란 감소 105). ISBN 대상 목록은 준비 시점 스냅샷이라 신규 등록분은 다음 회차 targets 재생성 때 잡는다.

3차 내역:
- BOOK en→ko 1,074건 번역 반영(`en-ko/en-ko-approved.json`): OL 검증 실본문 340 + 'OPEN' 마커의 현재 본문 조회분 604 + 무출처 형제 본문 132 + 로케일 태그 교정분. en 로케일에 비영어 본문이 저장된 레거시 61건은 실제 원문 언어(`description_source_locale`: es·de·fr·nl·ja·en)를 기록해 반영했다.
- BOOK ko→en 잔여 37건 반영(`ko-en/ko-en-rest-approved.json`): 무출처 ko 본문 21 + muse가 「원문 절단」으로 거부한 17건 중 다음 ISBN 재조회로 완전 본문을 회수한 16. 카카오 본문도 절단된 1건은 보류.
- VIDEO+MUSIC 형제번역 392건 반영(`sibling-media/sibling-muse-draft-plans.json`): MUSIC→en 354, VIDEO→ko 37, VIDEO→en 1. muse가 「원문 모순」으로 거부한 17건은 보류.
- 적용기 재조회의 `sources.description === null` 비교 버그(키 부재=undefined)를 고쳤고, 번역 계약에 `sourceLocale` 선택 필드를 추가했다. 마커 행 CAS는 plan의 source.description을 DB 마커값('OPEN')으로 유지해 통과한다 — 조회 본문은 `sourceText`에만 둔다.

5차(미디어 잔여 재점검, 09-15):
- VIDEO TMDB 재조회(`prepare-video-refill.ts`·`check-video-refill.ts`): 잔여 45건 중 개요 존재 39(en)·15(ko)를 확인해 33건 계획, 품질 검사로 한 문장짜리 2건을 걸러 **31건 적용**(`video-provider/refill-plan.json`). 보류는 TMDB 무개요·제목 불일치·movie↔tv 오연결이다.
- `media-introduction-contract.ts` 확장 2건: (1) `external_source` NULL이어도 `tmdb-` 접두어로 출처가 잠기는 레거시 VIDEO 행 허용(IS NOT DISTINCT FROM 비교), (2) 번역의 `sourceUrl` null 허용 — 형제 행이 출처 URL을 기록하지 않은 경우만, `sources.description`을 쓰지 않는다. 테스트 8/8.
- MUSIC 형제번역 잔여: ko만 있는 29건 중 이전 큐에 있던 17건은 muse가 재확인한 「원문 곡/앨범 모순」 보류(ko 본문 자체가 다른 곡을 서술). 신규 12건을 큐에 추가해 번역, 서지 메모 수준 5건·ko 원문 로케일 실패 1건·ko 행에 영문이 저장된 2건을 제외하고 **4건 적용**(`sibling-media/residual29-plan.json`).
- GAME 잔여 13건 감사: IGDB 원시 조회로 확인 결과 전부 오연결 또는 무요약이다. ko만 있는 5건의 ko 본문은 잘못 연결된 IGDB 요약의 번역물이라(igdb-80=The Witcher가 Assassin's Creed로 저장 등) 번역하지 않는다 — 오류를 복제하게 된다. 재연결 후보는 확인됨: AoE2→igdb-327, Red Alert→igdb-295, Spore→igdb-1876 (요약 존재). external_id 재연결과 ko 본문 교체가 필요한 별도 수리 과제다.

백업은 `D:/feelandnote-backups/book-descriptions/` 아래 회차별 디렉터리. 이전 회차(1차 6,825행·2차 5,736행) 기록은 아래를 유지한다.

## 이어 할 일 — Google Books 소개문 수집 (4차, 진행 중)

사용자가 Google Books 금지를 소개문 수집 한정으로 해제했다(26.09.15, `AGENTS.md` 반영). 단일 키·일일 950회 캡, 키 로테이션 금지. 본문은 실본문으로 저장하고 `sources.description`에 `https://books.google.com/books?id=<volumeId>`를 박는다(마커·런타임 조회 없음).

- 준비: `scripts/contents/prepare-gbooks.ts`(ISBN 경로), `prepare-gbooks-ta.ts`(제목+저자 경로). 결과·캐시·키별 쿼터 상태는 `data/celeb/book-introductions/gbooks/`. 스크립트는 재개 가능 — 같은 명령을 다시 실행하면 된다.
- 키 풀: `gbooks-keypool.ts` — 사용자 승인으로 키 로테이션 사용. 키별 일일 카운터를 상태 파일에 기록하고, 400/키무효는 dead, 403·429는 exhausted로 표시해 다음 키로 넘긴다. 5xx는 재시도.
- 적용: `apply-gbooks.ts --apply [--file <prepared.json>]`. CAS·재조회·캐시 갱신은 기존 계약 그대로.
- 진행(1일차): ISBN 경로 1,672건 전량 처리·973건 적용(명중 58%). 제목+저자 경로 3,412건 중 2,747건 처리·363건 적용 — 풀 소진으로 잔여 654건은 다음 날 재개.
- ko 행에 영문 본문만 잡히는 경우는 로케일 검사에서 걸러 보류된다(약 97건) — 필요하면 형제번역 큐로 넘긴다.

기타 잔여:

1. BOOK ko·en 잔여: GB 2차 결과 이후 재집계한다. 기존 보류는 OL 본문 없음(마커 조회 실패 151)·무출처 무근거 URL(57+280)·원문 없음(2)·카카오 절단(1) 등이다.
2. MUSIC ko 1,271·en 1,296: Apple 트랙·국내곡·커버버전 중심으로 Apple·Wikipedia·Last.fm에 확인 가능한 원문이 없는 항목이다(ko·en 위키 표본 조사 명중률 ~0%). ko 본문이 다른 곡을 서술하는 손상 17건은 별도 수리 과제다.
3. VIDEO ko 27·en 20: TMDB 무개요 22·제목 불일치 9(일부는 ko 번역 제목의 오탐)·조회 실패 1 보류. movie↔tv 오연결 4건은 external_id 수리가 선행돼야 한다.
4. GAME en 9·ko 4: 전부 IGDB 오연결(정상 후보: AoE2→327, Red Alert→295, Spore→1876) 또는 무요약. ko 본문도 오연결 요약의 번역물이라 ko·en 모두 원문 재수집이 필요하다.
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
| BOOK en OL 마커(2차) | `en-markers/prepared-en.json`, `apply-en-markers.ts` |
| BOOK ko→en 번역(2차) | `ko-en/ko-en-waiting.json`, `ko-en-approved.json`, `ko-en-held.json`, `apply-koen*.log`, `apply-book-introduction-translations-koen.ts` |
| BOOK en→ko 번역(3차) | `en-ko/en-ko-waiting.json`, `en-ko-approved.json`, `en-ko-held.json`, `en-ko-rest-waiting.json`, `prepare-en-ko.ts`, `prepare-rest.ts`, `merge-en-ko-translations.ts` |
| BOOK ko→en 잔여(3차) | `ko-en/ko-en-rest-waiting.json`, `ko-en-rest-approved.json`, `ko-en-rest-recovered.json`, `recover-truncated-ko.ts` |
| VIDEO·MUSIC 형제번역(3차·5차) | `sibling-media/sibling-queue.json`, `sibling-muse-draft-plans.json`, `sibling-holds.json`, `residual29-plan.json`, `prepare-sibling-media.ts` |
| VIDEO TMDB 재조회(5차) | `video-provider/refill-plan.json`, `video-provider/refill-holds.json`, `prepare-video-refill.ts`, `check-video-refill.ts` |
| BOOK Google Books(4차) | `gbooks/prepared-gbooks.json`, `gbooks/prepared-gbooks-ta.json`, `gbooks/cache*/`, `prepare-gbooks.ts`, `prepare-gbooks-ta.ts`, `apply-gbooks.ts` |
| MUSIC 잔여·출처 오류 | `music-provider/snapshot.json`, `review-holds.json`, `results/`, `remainder-review-provider.json` |
| VIDEO 잔여 | `video-provider/remaining.json`, `title-review-b.json` |
| GAME 잔여 | `game-provider/game-residual-result.json`, `game-residual-review.json` |
| 국내판 조사·반영 | `swe-repairs/round2/`, 아래 외부 백업 |

공용 실행점은 `sw/web-bo/scripts/contents/`의 `apply-book-introduction-translations.ts`, `apply-media-introductions.ts`이며 `--plan FILE`은 검증, `--apply`가 실제 반영이다. `sw/web-bo`에서 `.env`를 읽고 실행한다. 기존 `collect-{video,game,music}-introductions.ts`와 로컬 Muse 실행 코드를 재사용하되, 완료 회차의 고정 후보·종료 표시를 지워 그대로 재실행하지 않는다.

**영문 `recover-book-introductions.ts --apply`는 잘못된 KO/EN 작품 연결 때문에 차단돼 있다.** 공란 수를 줄이려고 차단을 해제하지 않는다. 실제 원문·정체성을 검증한 계획을 기존 반영 계약으로 처리한다. OPEN 원문은 `sourceText`에 보존하고 DB source 행의 표시값은 그대로 두어 동시 수정 검사를 유지할 수 있다.

선택 판본 밖으로 소개를 fallback하지 않는다. 번역 배지도 원본 출처를 유지하며 OpenLibrary는 `OL`이다. BOOK 신규 메타는 한국어 카카오·영어 OL 규칙을 유지하고 YES24의 실제 상품 소개를 검증해 사용할 수 있다. `figure_book_contents`가 없는 일반 BOOK에 한국어판을 추가하려고 인물 관계를 만들지 않는다. ISBN 중복·합본·부분권·오디오북 범위가 충돌하면 보류한다.

기존 보류의 실제 오류 예: Doctor Who/Red Dwarf의 다른 영화 ID, Spore 본편과 Creature Creator 혼동, 음악의 곡/앨범/Apple 상품 불일치. Youngblood·MISIA Everything·Between the Bars는 원문 사실 오류로 보류했다. 새 원문을 독립 검증하지 않고 기존 보류를 자동 승인하지 않는다. Wikipedia 429는 `Retry-After`를 지키며 중단했고 마지막 실패 3건만 재확인했다. 요청 오류는 원문 없음이 아니다.

## 로컬 자료 보관

JSON·JSONL은 `.gitignore`로 제외했지만 현 위치에 보존돼 있다. 코드 17개(`.mjs`·`.ts`)는 제외하지 않았다. 다른 PC나 새 체크아웃에는 이 자료가 없을 수 있으므로 아래 백업을 먼저 확인한다. 전체 폴더를 옮기면 상대 import와 고정 경로가 깨진다.

- 원문·DB 변경 전 값·적용 근거: `D:/feelandnote-backups/book-descriptions/`
- 국내판 마지막 조사/반영: `swe-research-20260915/round2/`, `swe-ko-repairs-round2/` — 위 백업 폴더 아래.
- 전체 작업 폴더 백업: `workspace-cleanup-20260915-071400.zip` — 17,731파일, 내부 `SHA256SUMS.json`과 전량 대조 완료.

백업 후 완료 로그 14개와 옛 `raw-/translated-<ordinal>` 63개만 제거했다. OPEN raw·translated·적용 JSONL·검수·보류·캐시는 재개에 쓰이므로 유지했다. DB 반영은 이미 운영에 적용됐으며, 이번 인수인계 요청에는 추가 실행·커밋·배포가 포함되지 않는다.
