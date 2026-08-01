---
name: celeb-music-collect
description: 음악 콘텐츠 등록·이전. Spotify 차단으로 아이튠즈로 옮기는 중이며, 속도 제한 때문에 하루치씩 나눠 처리한다. "음악 조사", "음악 이전", "음악 등록", "아이튠즈 이전", "음악 마이그레이션" 등으로 호출.
---

# 음악 조사 수행

셀럽 음악 콘텐츠를 **아이튠즈 기준으로 등록·이전**한다. 하루 한 번 돌리는 작업이다.

## 왜 하루치씩인가

Spotify가 2026-02 개발자 모드 정책을 바꿔 앱 소유자의 유료 구독을 요구하게 됐고, **26.08.01 우리 앱에 적용돼 조회가 전부 403**이다(구독한 적이 없어 복구 수단도 없다). 아이튠즈가 그 자리를 대신한다.

아이튠즈는 인증·키가 없는 대신 **IP 단위 속도 제한이 빡빡하다.**

> **26.08.01 실측**: 한 번에 하나씩 0.7초 간격으로 두드려도 **232곡에서 차단**됐다. 세 번 물러났다 재시도해도 안 풀렸고, 해제까지 **약 3시간** 걸렸다. 그 회차의 남은 1,232곡은 손도 못 대고 실패로 밀렸다.

그래서 **상한 200곡**을 지키고, 막히면 그날은 그만둔다. 욕심내면 그날치가 통째로 날아간다.

## 실행

```bash
cd sw/web-bo && node scripts/itunes-music-migrate.mjs            # 200곡(기본)
cd sw/web-bo && node scripts/itunes-music-migrate.mjs --limit 50 # 50곡만
cd sw/web-bo && node scripts/itunes-music-migrate.mjs --dry-run  # 판정만, DB 미수정
```

스크립트가 **두 가지를 함께** 처리한다.

1. **기존 Spotify 곡 이전** — 남은 곡을 순서대로 집어 아이튠즈에서 같은 곡을 찾는다
2. **조사에서 넘어온 후보 등록** — `celeb_music_candidates`의 `pending` 건을 콘텐츠로 만들고 인물에 연결한다

세부:
- 남은 Spotify 곡을 순서대로 집어 아이튠즈에서 같은 곡을 찾는다
- 제목·아티스트가 모두 맞고 **미리듣기 음원이 있는** 후보만 채택
- 표지·출처·`metadata.previewUrl`·`external_id`를 갱신
- 403/429가 오면 즉시 멈추고 남은 분량을 다음 회차로 넘긴다
- 끝나면 남은 곡 수를 알려준다

**끝났는지 판정**: 출력 마지막 줄이 `남은 Spotify 곡: 0곡 — 이전 완료`면 끝이다.

## 밟으면 터지는 곳

**1. 미리듣기 없는 곡을 옮기면 재생이 죽는다**
재생기는 `metadata.previewUrl`로 음원을 튼다. 그게 없는데 `external_id`를 아이튠즈 번호로 바꾸면 Spotify 임베드도 못 쓰고 미리듣기도 없어 **재생 버튼이 먹통**이 된다. 26.08.01에 80곡을 그렇게 죽였다가 백업에서 되돌렸다. 스크립트가 이미 막고 있으니 그 판정을 풀지 마라.

**2. 차단을 "결과 없음"으로 삼키지 마라**
403을 조용히 빈 배열로 처리하면 멀쩡한 곡이 전부 "매칭 실패"로 기록된다. 실제로 한 회차가 통째로 그렇게 날아갔다(전환 0 / 보류 1,497). 스크립트는 차단을 예외로 드러내고 멈춘다.

**3. 한국 스토어는 아티스트를 한국어로 준다**
`Nirvana`를 찾는데 `너바나`가 와서 다른 사람으로 걸러진다. 미국 스토어를 먼저 보고 한국으로 되짚어야 한다. 이걸 안 하면 성공률이 25%까지 떨어진다(실측: 고친 뒤 50%).

**4. 조사 중에는 음악을 등록하지 마라 — 후보 표에만 넣는다**
인물 조사(`celeb-2-content-collector`)에서 음악 후보를 만나면 `contents`·`user_contents`를 만들지 말고 아래 표에 한 줄만 넣는다.

```sql
INSERT INTO celeb_music_candidates (celeb_id, title, artist, source_url, evidence)
VALUES ('{셀럽 id}', '{곡명}', '{아티스트}', '{인터뷰·기사 URL}', '{언급 정황 한 줄}')
ON CONFLICT DO NOTHING;
```

| 칸 | 내용 |
|----|------|
| `source_url` | 필수. 인물이 그 곡을 언급한 인터뷰·기사·방송 원본 |
| `evidence` | 언급 정황 한 줄. 나중에 review를 쓸 때 근거가 된다 |
| `status` | `pending` → 이 스킬이 `registered`(+`content_id`) 또는 `rejected`(+사유)로 바꾼다 |

같은 인물+같은 곡은 한 번만 들어간다(유니크 인덱스).

**정식 조사 장부(`celeb_content_research_*`)는 쓰지 마라** — run 개설·4유형 scope·완료 함수로 이어지는 무거운 절차이고, 트리거가 진행 중인 run 외의 입력을 막는다.

남은 음악인 270명이면 200곡 안팎이 등록 대상인데 이는 차단 지점(232곡)과 같은 규모다. 조사와 등록을 같이 하면 조사 도중에 음악이 통째로 실패한다.

## 참고 수치

| | |
|---|---|
| 직군별 음악 등록량(실측) | 뮤지션 인당 0.75곡 · 배우 0.04곡 · 감독 0곡 |
| 아이튠즈 차단 지점 | 232곡 (해제 약 3시간) |
| 곡당 조회 | 최대 4회(미국·한국 × 곡·앨범) |

## 이전이 다 끝나면

Spotify 곡이 0이 되면 아래를 걷는다. 그 전에는 **지우지 마라** — 아직 Spotify로 재생되는 곡의 안내가 사라진다.

- `sw/web/messages/{ko,en}/content.json`의 `contentDetail.spotify.*`, `musicPlayer.noticeSpotify` 계열
- `MediaEmbed.tsx`의 `SpotifyEmbed` 컴포넌트, `FloatingMusicPlayer.tsx`의 임베드 분기
- 백업 테이블 `meta_reharvest_backup_20260801`(음악 3,029행)

## 관련 문서

| 문서 | 내용 |
|------|------|
| `docs/project/external-services.md` 「외부 콘텐츠 검색 API」 | Spotify 차단 경위·아이튠즈 전환의 SSoT |
| `docs/project/celeb/celeb-2-content-collector.md` 「MUSIC - 아이튠즈」 | 수집 절차상의 위치 |
| `docs/todo/external-api-migration-2026-08-01.md` | 진행률과 남은 일 |
