---
name: spotlight-celeb-sync
description: 팩션(factions/) 영상 인물을 스포트라이트(/explore/spotlight)에 반영할 때 적용한다. 태그 배정, 상위 그룹 계층, 그리고 인물 이미지 3종(아바타·개인샷·그룹샷)을 구분해 채우는 규칙·스크립트·캐시 무효화를 담는다. "스포트라이트 인물 채워", "태그에 인물 배정", "개인샷/그룹샷 넣어", "팩션 인물 스포트라이트 반영", "스포트라이트 이미지 안 뜸/얼굴만 뜸", "그룹 추가" 등에 호출.
---

# 팩션 → 스포트라이트 연동

스포트라이트(`/explore/spotlight`)는 셀럽을 테마(태그)로 묶어 보여준다. 팩션 영상 인물을 여기에 반영할 때의 데이터·이미지·캐시 규칙이다. 태그 시스템 SSoT는 `docs/project/celeb/celeb-tag-system.md`(부록 A), 그룹 개편 기록은 `docs/project/spotlight-ai-group-refactor.md`.

## 데이터 구조

- `celeb_tags` — 태그 마스터(테마). 그룹 헤더도 여기 일반 태그 1행으로 존재.
- `celeb_tag_assignments` — (tag_id, celeb_id) 배정. 태그별 인물 소개(`short_desc`/`long_desc`)와 **개인샷**(`spotlight_image_url`)이 여기 붙는다.
- `profiles.avatar_url` — 인물 공통 아바타(태그 무관).

## 이미지 3종 — 절대 혼동 금지 (이번에 사고남)

화면 소스: `SpotlightShowcase.tsx`에서 Hero = `spotlight_image_url ?? avatar_url`, 리스트 썸네일 = `avatar_url`, 단체샷 = `team_images`.

| 종류 | 컬럼/필드 | 성격 | R2 경로 | 처리 |
|------|-----------|------|---------|------|
| **아바타** | `profiles.avatar_url` | 얼굴 크롭(원형 썸네일) | `celebs/{celebId}/avatar.webp` | 얼굴 검출 크롭. `celeb-avatar-wikimedia` 스킬 또는 `web-bo/scripts/upload-celeb-image-from-wikimedia.ts --image-file` |
| **개인샷** | `celeb_tag_assignments.spotlight_image_url` | **원본 전신/연출 화보**(Hero 큰 사진) | `spotlight/{tagId}/celeb-{celebId}.webp` | **얼굴 크롭 금지**, 원본 비율 유지. `web-bo/scripts/upload-spotlight-celeb-images.ts` |
| **그룹샷** | `celeb_tags.team_images[]` | 단체 화보(상단 배너 캐러셀) | `spotlight/{tagId}/team/{uuid}.webp` | 정사각 webp. `web-bo/scripts/upload-tag-team-images.ts` |

**함정**: 개인샷(`spotlight_image_url`)을 안 채우면 Hero가 아바타(얼굴 크롭)로 폴백돼서 "얼굴이 Hero에 뜬다". 아바타와 개인샷은 **반드시 다른 이미지**로 채운다 — 아바타=얼굴, 개인샷=원본 전신.

## 팩션 이미지 소스

`sw/remotion/public/factions/<에피소드>/<NN-slug>/` (정본: `factions/_docs/folder-rules.md`):
- 개인샷 원본: `<NN-slug>/<cluster>/<slug>.png` (또는 레거시 인물 하위 폴더). **`faction-data.json`의 `person.image`가 가리키는 파일**이 진실.
- 그룹샷: `<NN-slug>/<cluster>/_group.png` (레거시 `group.png`·`group_shot.png` = 같은 역할). 클러스터가 여러 개면 그룹샷도 여러 장 → team_images에 전부 넣는다(일부만 넣으면 "충전 안 됨").

## 상위 그룹 계층 (코드 상수)

`sw/web/src/constants/spotlightGroups.ts`가 SSoT. `celeb_tags`에 `parent_id` 컬럼이 없어 그룹 소속을 코드로 관리(스키마 변경 권한 막힘). 그룹 헤더는 배정 0인 일반 태그 행. `getFeaturedTags`가 `isGroup`/`parentSlug` 부착, UI는 `spotlightGrouping.ts` + 섹션 헤더형. 그룹 추가/이동은 이 상수 파일만 고친다.

## DB 접근 — REST만, DDL 불가

Supabase MCP·관리 토큰(`sbp_`)이 401로 막혀 있다. **DDL(ALTER/CREATE) 불가.** 데이터 CRUD는 REST(PostgREST + `SUPABASE_SERVICE_ROLE_KEY`)로:
```
curl.exe "$URL/rest/v1/celeb_tags?..." -H "apikey: $SRK" -H "Authorization: Bearer $SRK"
```
env: `sw/web/.env`(SERVICE_ROLE), R2 키는 `sw/web-bo/.env`(R2_* 7개). CRLF라 값 파싱 시 `\r` 제거.

## 캐시 무효화 — REST 직접 수정 후 필수

`getFeaturedTags`는 `unstable_cache`(태그 `celebs`, 7일). REST로 DB를 직접 고치면 백오피스 자동 무효화 경로를 안 타므로 **화면이 안 바뀐다(브라우저 새로고침으로도 안 풀림 — 서버 데이터 캐시)**. 반드시:
```
curl.exe -X POST "http://localhost:3000/api/revalidate" -H "Content-Type: application/json" \
  -d '{"tag":"celebs","secret":"<CRON_SECRET>"}'
```
`CRON_SECRET`은 `sw/web/.env`. 미설정이면 503.

## 표준 절차 (팩션 인물 N명을 태그에 반영)

1. 인물 `profiles.id`·slug 확보(없으면 celeb 등록 먼저).
2. `celeb_tag_assignments` INSERT(short_desc/long_desc 작성).
3. **아바타**(얼굴) — celeb-avatar-wikimedia 또는 upload-celeb-image-from-wikimedia.ts.
4. **개인샷**(원본 전신) — upload-spotlight-celeb-images.ts (얼굴 크롭 금지).
5. **그룹샷**(단체) — upload-tag-team-images.ts (faction `_group.png` 전부 · 레거시 `group.png` 포함 시 동일).
6. **캐시 무효화** (`/api/revalidate` celebs).

관련: `celeb-avatar-wikimedia`(아바타), `faction-image`(팩션 발주), `celeb-tag-system.md`(태그 SSoT).
