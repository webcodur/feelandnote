# 외부 API 이탈 대응 — 남은 일 (2026-08-01)

하루 사이에 외부 API 두 개가 동시에 막혔다. 그 대응으로 벌인 작업의 **미결 항목**만 모았다.
사실·규격은 각 SSoT에 있고 이 문서는 "무엇이 안 끝났는가"만 다룬다.

| 사건 | SSoT |
|------|------|
| 네이버 도서 검색 종료(26.07.31) → 카카오 전환 | `docs/project/platform/external-services.md` 「외부 콘텐츠 검색 API」 |
| Spotify 개발자 모드 차단(26.08.01) → 아이튠즈 전환 | 같은 문서 |
| 콘텐츠 수집 절차 갱신 | `docs/project/celeb/celeb-2-content-collector.md` |

---

## 1. 음악 데이터 이전

- **26.08.13 1차 전수 순회 완료 시점: Spotify 487곡 / iTunes 1,938곡.** 시작한 Spotify 1,322곡 중 835곡을 넓게 이전했고 487곡을 보류했다. 빈 cursor를 반복하던 연속 실행 버그는 `first_pass_complete`로 끝나도록 교정했다. 이 1차 스크립트는 다시 돌리지 않는다.
- **정밀 패스 실행 중.** 백업에서 복원한 원본 1,513건과 백업에 없는 현행 Spotify 2건까지 1,515건을 대상으로 잡았다. 원본은 트랙 917건·앨범 565건·Spotify에서 유형을 더 이상 확인할 수 없는 31건이다.
- 정밀 패스는 잔여 487건뿐 아니라 이미 iTunes로 바뀐 원본도 Apple ID로 재조회한다. 원래 Spotify 제목·아티스트와 대조하고, 앨범은 수록곡 순서·길이 지문까지 비교한다. 같은 제목의 다른 아티스트와 트랙으로 잘못 저장된 앨범을 자동 확정하지 않는다.
- 복잡한 검증 표본인 베토벤 교향곡 9번은 잘못 붙어 있던 모음집 단일 트랙을 기각하고, 4개 악장의 순서·길이가 99.45% 일치한 iTunes 앨범으로 교정했다. KO/EN locale·표지·인물 연결을 재조회해 보존을 확인했다.
- 자동 실행: `pnpm --filter @feelandnote/web-bo music:itunes-precision:auto`. 스캔을 끝까지 재개한 뒤 `matched`만 반영하며, 429에서는 상태를 보존하고 냉각 후 이어 간다. 병렬 작업자를 붙이지 않는다.
- 상태는 `.codex/runtime/itunes-music-precision-state.json`이 쥔다. 진행률은 `items` 수 / 1,515, `summary`, `requestCount`, `cacheHitCount`, `cooldownCount`, `remainingUnscanned`으로 확인한다. 공개 Apple 응답은 `.codex/runtime/itunes-music-api-cache.jsonl`에 캐시하며, 프로세스가 끊기면 같은 자동 실행 명령으로 재개한다.
- Apple 공식 제한은 약 분당 20회다. 제한을 넘기는 병렬 호출 대신 기존 iTunes ID와 반영 후보 ID를 다중 lookup으로 묶고, 앨범 수록곡도 예상 반환량 단위로 묶는다. 26.08.13 새 10건 실측은 최적화 전 22호출·76.7초에서 13호출·44.5초로 줄었고 429는 0회였다. 전체 예상시간은 고정 시간표가 아니라 상태 파일의 실호출 수와 남은 미스캔 수로 다시 산정한다. 구체 간격·묶음 크기·냉각·재시도 값은 실행 코드만 SSoT로 둔다.
- 미리듣기 음원이 없는 곡은 옮기지 않는다. 옮기면 재생이 끊긴다(80곡을 그렇게 죽였다가 되돌렸다).
- 이전이 끝나기 전까지 Spotify 곡과 아이튠즈 곡이 섞여 있는 게 정상이다. 재생기가 둘 다 처리한다.

## 2. Spotify 안내 문구 정리 (이전 완료 후)

`sw/web/messages/{ko,en}/content.json`에 아직 남아 있다.
- `contentDetail.spotify.*` — "PC에서 Spotify 로그인하면 전곡 감상" 안내
- `musicPlayer.noticeSpotify` / `noticeSpotifyLogin` / `noticeAgeAction`

**지금 지우면 안 된다.** 아직 Spotify 잔존곡이 재생되고 그 사용자에게는 유효한 안내다.
이전이 끝나 Spotify 곡이 0이 되면 문구와 `SpotifyEmbed` 컴포넌트를 함께 걷는다.

차단된 Spotify API 래퍼·패키지 export·신규 검색/단건 조회·검색 화면 출처 표기는 26.08.12에
iTunes로 전환했다. 남아 있는 코드는 Spotify 잔존곡을 위한 재생·상세 호환 분기뿐이다.

## 6. 신규 인물 콘텐츠 조사 (최근 음악인 완료 · 별도 코호트 대기)

**26.08.01 저녁, 배우·감독 잔여분을 배치로 완료했다.** DB 실측(07-31 KST 등록 코호트 320명 기준):

- 배우·감독 95명 전원 처리 끝. 파일럿 37명 + 이번 배치 58명(작업조 8개, batch_key `2026-08-01-actor-director`).
- 이번 배치 등록 163건(책·영상·게임 — 게임 재검색 후속분 포함), full 승격 36명, 네 유형 조사 후 콘텐츠 0건 확정(`confirmed_empty`) 22명.

**2026-08-12 현재 최근 음악인 코호트 조사는 끝났다.** 2026-08-07~09 KST 생성 음악인
222명은 콘텐츠 보유 154명, 0건 조사 확정 68명, 조사 미확정 0명이다. 완료 보고에서 빠졌던
지인 1명은 게임 2건을 등록해 보정했다.

다음 콘텐츠 조사 대상은 음악인 코호트가 아니라 2026-08-03 KST에 연속 생성된 `light`
224명이다. 전원 `suspended`이고 실제 콘텐츠 0건·조사 미확정 상태다. 대상 재조회 조건과
완료 판정은 [`celeb-content-research-backlog.md`](celeb/celeb-content-research-backlog.md)가 쥔다.

**26.08.10 후속 실측·교정:** 임시로 모였던 음악 311건을 전량 재검수해 iTunes
최종 등록 255건·기각 56건으로 마감했다. 실제 등록된 255건은 정식 콘텐츠 테이블에 남고,
임시 보관 테이블과 기각 기록은 26.08.11 폐기했다.

같은 실측에서 새 `celeb_contents` 255행의 `review_en`이 비어 있음을 확인했다.
26.08.10 세 구간으로 나눠 기존 `review` 범위 안에서
255/255를 영문화했고, live 전수 재조회에서 공백·원문 복사·한글 잔존·대체문자·첫 문장 인물명
누락이 모두 0임을 확인했다.

후보 범위 밖까지 `celeb_contents`를 전수 조회해 추가 결손 127건(BOOK 58·VIDEO 65·MUSIC 4)도
같은 회차에 영문화했다. 최종 live 값은 감상문 12,915/12,915 영문 보유다. 추가 MUSIC 4건은
Spotify ID를 남겨 둔 채 번역만 하지 않고 iTunes 원곡·미리듣기·KO/EN locale까지 전환했다.

**별도 메타 locale 실측(26.08.10):** 인물과 연결된 콘텐츠 가운데 EN `content_locales`가 없던
레거시 작품은 172개(BOOK 137·VIDEO 34·MUSIC 1)였다. VIDEO 34·MUSIC 1을 보강한 뒤 13:04 KST
전역 재조회에서는 EN 결손 137개가 모두 BOOK으로 남았다. 실제 영문판이 확인되는 작품만
OpenLibrary 판본으로 등록한다. 영문판이 없으면 제목을 임의 번역하거나 음차 locale을 만들지
않는다. 이는 위 12,915건의 감상문 `review_en` 완료와 다른 축이다.

이제 신규 MUSIC은 찾은 인물 작업에서 바로 iTunes 트랙·`previewUrl`을 확인하고
`contents`·KO/EN locale·`celeb_contents`까지 등록한다. 별도 후보 저장소에 넣고
다음 회차로 넘기지 않는다. 현재 절차는
`docs/project/celeb/celeb-2-content-collector.md`의 「MUSIC - 아이튠즈」 절이 쥔다.

웹 검색 한도(`CLAUDE_CODE_MAX_WEB_SEARCHES_PER_SESSION`)는 200 → 100000으로 올려 뒀다.
그 전에는 세션당 10명 남짓이 한계였고 작업자 8명이 전원 우회 검색으로 돌았다.

## 되돌리기용 백업 (보존)

| 테이블 | 내용 |
|--------|------|
| `meta_reharvest_backup_20260801` | 음악 3,029행만 남겼다. 아이튠즈 이전 중 사고가 나면 여기서 되돌린다 |

책 관련 백업(고아 155권·네이버 잔재·링크)은 네이버를 다시 쓸 일이 없어 **전부 삭제했다.**
음악 백업은 이전이 끝날 때까지 남긴다 — 실제로 80곡 복구에 썼다.
