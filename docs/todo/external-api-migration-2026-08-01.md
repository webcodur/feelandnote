# 외부 API 이탈 대응 — 남은 일 (2026-08-01)

하루 사이에 외부 API 두 개가 동시에 막혔다. 그 대응으로 벌인 작업의 **미결 항목**만 모았다.
사실·규격은 각 SSoT에 있고 이 문서는 "무엇이 안 끝났는가"만 다룬다.

| 사건 | SSoT |
|------|------|
| 네이버 도서 검색 종료(26.07.31) → 카카오 전환 | `docs/project/external-services.md` 「외부 콘텐츠 검색 API」 |
| Spotify 개발자 모드 차단(26.08.01) → 아이튠즈 전환 | 같은 문서 |
| 콘텐츠 수집 절차 갱신 | `docs/project/celeb/celeb-2-content-collector.md` |

---

## 1. 음악 데이터 이전 (하루 한 번, 일주일가량)

- 26.08.01 저녁 기준 **189곡 이전 / 1,328곡 남음.**
- 도구: `cd sw/web-bo && node scripts/itunes-music-migrate.mjs` — 상한 200곡, 차단 감지 시 즉시 정지.
- **하루 한 번 돌린다.** 아이튠즈는 232곡에서 차단됐고(26.08.01 실측) 해제까지 3시간 걸렸다.
  욕심내서 이어 돌리면 그날치가 통째로 실패한다.
- 미리듣기 음원이 없는 곡은 옮기지 않는다. 옮기면 재생이 끊긴다(80곡을 그렇게 죽였다가 되돌렸다).
- 이전이 끝나기 전까지 Spotify 곡과 아이튠즈 곡이 섞여 있는 게 정상이다. 재생기가 둘 다 처리한다.

## 2. Spotify 안내 문구 정리 (이전 완료 후)

`sw/web/messages/{ko,en}/content.json`에 아직 남아 있다.
- `contentDetail.spotify.*` — "PC에서 Spotify 로그인하면 전곡 감상" 안내
- `musicPlayer.noticeSpotify` / `noticeSpotifyLogin` / `noticeAgeAction`

**지금 지우면 안 된다.** 아직 1,400여 곡이 Spotify로 재생되고 그 사용자에게는 유효한 안내다.
이전이 끝나 Spotify 곡이 0이 되면 문구와 `SpotifyEmbed` 컴포넌트를 함께 걷는다.

## 6. 신규 인물 콘텐츠 조사 (배우·감독 완료 — 음악인만 남음)

**26.08.01 저녁, 배우·감독 잔여분을 배치로 완료했다.** DB 실측(07-31 KST 등록 코호트 320명 기준):

- 배우·감독 95명 전원 처리 끝. 파일럿 37명 + 이번 배치 58명(작업조 8개, batch_key `2026-08-01-actor-director`).
- 이번 배치 등록 163건(책·영상·게임 — 게임 재검색 후속분 포함), full 승격 36명, 네 유형 조사 후 콘텐츠 0건 확정(`confirmed_empty`) 22명. 조사 장부 run 전부 마감(완료 59 · 취소 1).
- 당시 음악 31곡은 임시 후보로 남겼다. **이 방식은 26.08.10 폐기했다.**
- 유보 후보: 장동건 『무소유』(1차 출처만 나오면 등록 가능), 전지현 2건(원 매체 미상 — 장부에 `archived` 표시).

**남은 미조사는 음악인이다.** 문서 초판의 "314명(배우·감독 44, 음악인 270)"은 DB와 안 맞았다 —
실측은 코호트 내 음악인 196명(200명 중 파일럿 4명 완료) + 기타 직군 소수다. 파일럿 실측: 아이돌 인당 0~1건.

**26.08.10 후속 실측·교정:** 레거시 후보가 총 311건까지 쌓였고 등록·기각이 한 건도
처리되지 않은 상태를 확인했다. 전량 재검수해 iTunes 최종 등록 255건·기각 56건으로
마감했고 `pending=0`을 확인했다. 8/9 JSON 적재분 95건은 등록 91·기각 4다.

같은 실측에서 레거시 후보가 한국어 `evidence`만 보존해 새 `celeb_contents` 255행의
`review_en`이 비어 있음을 확인했다. 26.08.10 세 구간으로 나눠 기존 `review` 범위 안에서
255/255를 영문화했고, live 전수 재조회에서 공백·원문 복사·한글 잔존·대체문자·첫 문장 인물명
누락이 모두 0임을 확인했다. 후보 상태는 되돌리지 않았고 최종 수치는 등록 255·기각 56·pending 0이다.

후보 범위 밖까지 `celeb_contents`를 전수 조회해 추가 결손 127건(BOOK 58·VIDEO 65·MUSIC 4)도
같은 회차에 영문화했다. 최종 live 값은 감상문 12,915/12,915 영문 보유다. 추가 MUSIC 4건은
Spotify ID를 남겨 둔 채 번역만 하지 않고 iTunes 원곡·미리듣기·KO/EN locale까지 전환했다.

**별도 메타 locale 실측(26.08.10):** 인물과 연결된 콘텐츠 가운데 EN `content_locales`가 없던
레거시 작품은 172개(BOOK 137·VIDEO 34·MUSIC 1)였다. VIDEO 34·MUSIC 1을 보강한 뒤 13:04 KST
전역 재조회에서는 EN 결손 137개가 모두 BOOK으로 남았다. 실제 영문판이 있으면 OpenLibrary 판본을
대조하고, 없으면 `celeb-2-content-collector.md`의 `verified=false` 표시용 locale 규칙을 적용한다.

같은 전역 재조회에서 KO locale 결손도 569개 드러났다. 활성 인물 범위의 확장 감사 결과는 EN 83,
KO 566 결손이며 이 때문에 전량 감사 명령은 아직 실패한다. `audit-web-i18n`은 이제 이 두 방향을
오류로 드러내며, 결손 적재가 끝나기 전에는 콘텐츠 메타 locale 완료를 선언하지 않는다. 이는 위
12,915건의 감상문 `review_en` 완료와 다른 축이다.

이제 신규 MUSIC은 찾은 인물 작업에서 바로 iTunes 트랙·`previewUrl`을 확인하고
`contents`·KO/EN locale·`celeb_contents`까지 등록한다. `celeb_music_candidates`에
`pending`으로 넣고 별도 회차에 넘기는 방식은 다시 쓰지 않는다. 현재 절차는
`docs/project/celeb/celeb-2-content-collector.md`의 「MUSIC - 아이튠즈」 절이 쥔다.

**재발 방지:** 운영 DB의 26.08.09 direct research RPC에는 MUSIC 후보 보류 코드가 남아 있다.
enqueue alias만 고치던 26.08.10 미적용 migration은 보류를 다시 활성화하므로 삭제했다. direct
worker는 적격 MUSIC commit을 RPC 전에 거부한다. 레거시 iTunes 등록 스크립트도 한국어
`evidence`에 `--candidate-id`와 `--review-en`이 함께 없으면 provider 조회 전에 중단한다.
후속 migration은 alias·MUSIC 최종 등록·`review_en` 보존을 함께 교정하고, `pending=0` canary까지
통과해야 운영 gate를 해제할 수 있다.

웹 검색 한도(`CLAUDE_CODE_MAX_WEB_SEARCHES_PER_SESSION`)는 200 → 100000으로 올려 뒀다.
그 전에는 세션당 10명 남짓이 한계였고 작업자 8명이 전원 우회 검색으로 돌았다.

## 되돌리기용 백업 (보존)

| 테이블 | 내용 |
|--------|------|
| `meta_reharvest_backup_20260801` | 음악 3,029행만 남겼다. 아이튠즈 이전 중 사고가 나면 여기서 되돌린다 |

책 관련 백업(고아 155권·네이버 잔재·링크)은 네이버를 다시 쓸 일이 없어 **전부 삭제했다.**
음악 백업은 이전이 끝날 때까지 남긴다 — 실제로 80곡 복구에 썼다.
