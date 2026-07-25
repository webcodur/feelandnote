---
name: faction-celeb-sync
description: 팩션(factions/) 영상 인물을 세력도감(/explore/faction)에 반영할 때 적용한다. 표준 경로는 web-bo `/factions` 편집기의 「출간」 패널(진단→dry-run→출간). 데이터 매핑·이미지 3종 구분·캐시 규칙과, 파이프라인이 못 하는 예외 작업(신규 인물 등록·아바타·상위 그룹 상수)의 절차를 담는다. "세력도감 인물 채워", "태그에 인물 배정", "개인샷/그룹샷 넣어", "팩션 인물 세력도감 반영", "세력도감 이미지 안 뜸/얼굴만 뜸", "출간 안 됨" 등에 호출.
---

# 팩션 영상 → 세력도감 연동

세력도감(`/explore/faction`)은 셀럽을 테마(태그)로 묶어 보여준다. **표준 경로는 web-bo(포트 3001) `/factions/<편>` 편집기 헤더의 「출간」 패널이다** — 수동 스크립트·REST 직접 수정은 파이프라인이 못 하는 예외에만 쓴다. 파이프라인 SSoT는 `docs/project/web-bo.md` 「세력도」 절(설계 근거는 `docs/project/remotion/faction-unification.md` §4·§9), 태그 시스템 SSoT는 `docs/project/celeb/celeb-tag-system.md`.

> **26.07.25 이관** — 출간 배관이 remotion-bo에서 web-bo로 옮겨 오면서 창구가 **API 라우트가 아니라 서버 액션**(`src/actions/admin/factions/publish.ts`의 `diagnoseFactionPublish`·`publishFactionEpisode`)이 됐다. 옛 `api/faction/db-sync/{status,publish}` 2라우트는 삭제됐고 **remotion-bo의 팩션 주소는 404다.** 서버 액션은 `curl`로 찌를 수 없으므로 진단·출간은 화면에서 한다.

## 표준 절차

1. **연결 키 확인** — 편집기에서 세력마다 연결 키(`tagSlug` = `celeb_tags.slug`)를 지정한다. 여러 세력이 태그 하나를 공유할 수 있다(예: PayPal-Mafia 4세력 → `paypal-mafia`). 인물은 셀럽 검색으로 추가하면 `celeb_id`가 자동으로 맺힌다. **연결 키가 없으면 `tag-slug-missing`으로 막히고 쓰기가 0건이 된다**(태그 자체가 없는 것은 출간이 만들 수 있지만, 연결 키조차 없으면 만들 근거가 없다).
2. **진단** — 「출간」 버튼으로 패널을 펼치면 세력·인물 전수의 DB 대조 결과가 뜬다. 제작과 서비스가 같은 DB 안에 있어 **텍스트 대조는 사라졌다**(옛 `desc: db|fillable|none` 항목 폐기). 남는 항목은 5종이다.

   | 진단 | 판정 기준 |
   |---|---|
   | 셀럽 미해소 인물 | `faction_people.celeb_id`가 null — 연결 키가 없거나, 있어도 그 셀럽이 DB에 없다 |
   | 태그 미지정 세력 | `faction_groups.tag_id`가 null |
   | 개인샷·그룹샷 저장소 동기 상태 | 로컬 파일 해시 ↔ 매니페스트(`_db-sync.json`) 대조 |
   | 얼굴 사진(아바타) 유무 | `profiles.avatar_url` |
   | 신화 표시 ↔ 셀럽 등급 어긋남 | `mythical`과 `fiction` 등급이 서로 다름 |

3. **미리보기(dry-run)** — 변경 예정 목록(created/updated/skipped/blocked)을 확인한다.
4. **출간** — 태그 upsert → 배정 upsert(순번 재기록) → 개인샷·그룹샷 R2 업로드 → 운영 웹 캐시 무효화(`[TAGS, CELEBS]`)까지 한 번에 돈다. 멱등(해시 매니페스트 `_db-sync.json`) — 재실행하면 skipped 전량이 정상.

**⚠ 매니페스트가 없는 편은 첫 회에 이미지 기록이 발생한다.** 옛 일회성 스크립트로 사진을 올린 편은 주소 키가 이미 같아도 `_db-sync.json`이 없어 다시 올린다. 실측(PayPal-Mafia): 미리보기 updated 25 = 영문 소개문 10명분 채움 + 개인샷 14장 + 단체사진 4장(도감이 옛 `team/0.webp` 식 키를 쥐고 있어 해시 키로 갈린다). **전부 실제 어긋남이고 결함이 아니다** — "변경 0"을 기대하지 않는다.

**사진 범위를 켰는데 `FACTION_LOCAL`이 없으면** 조용히 건너뛰지 않고 사유를 들고 실패한다(`sw/web-bo/.env`).

**보호 규칙(파이프라인 내장)**: 도감에서 사람이 다듬은 소개문은 덮지 않는다(채움 전용, force 시에만 덮음). `sort_order`는 태그를 관통하는 전역 순번으로 항상 다시 쓴다. 같은 셀럽이 한 태그 안 여러 자리에 있으면 자리가 가장 앞인 배치만 채택한다(판정이 편 전체를 보므로 세력을 하나씩 출간해도 결과가 같다). 셀럽 미해소 인물은 blocked 명단으로 보고. 그룹샷 배열은 태그 단위로 재구성해 공유 태그의 다른 세력 몫을 보존하고, 한 장이라도 실패하면 배열 교체를 보류한다.

## 데이터 구조

- **제작 측(비공개)** — `faction_episodes`·`faction_groups`·`faction_clusters`·`faction_people`·`faction_episode_parts` 5테이블. 투영은 `faction_groups.tag_id` → `celeb_tags`, `faction_people.celeb_id` → `celeb_tag_assignments` 단방향이다. 제작 데이터도 같은 DB에 있으므로 텍스트를 파일과 대조할 일이 없다.
- `celeb_tags` — 태그 마스터(테마). 그룹 헤더도 여기 일반 태그 1행으로 존재.
- `celeb_tag_assignments` — (tag_id, celeb_id) 배정. 태그별 인물 소개(`short_desc`/`long_desc`)와 **개인샷**(`spotlight_image_url`, 물리 명칭은 옛 이름 유지)이 여기 붙는다.
- `profiles.avatar_url` — 인물 공통 아바타(태그 무관).

## 이미지 3종 — 절대 혼동 금지

화면 소스: `FactionShowcase.tsx`에서 Hero = `spotlight_image_url ?? avatar_url`, 리스트 썸네일 = `avatar_url`, 단체샷 = `team_images`.

| 종류 | 컬럼/필드 | 성격 | R2 경로 | 채우는 경로 |
|------|-----------|------|---------|------|
| **아바타** | `profiles.avatar_url` | 얼굴 크롭(원형 썸네일) | `celebs/{celebId}/avatar.webp` | **파이프라인 밖** — `celeb-avatar-wikimedia` 스킬 또는 `web-bo/scripts/upload-celeb-image-from-wikimedia.ts --image-file` |
| **개인샷** | `assignments.spotlight_image_url` | **원본 전신/연출 화보**(Hero 큰 사진) | `spotlight/{tagId}/celeb-{celebId}.webp` | 출간 패널(person.image → 원본 비율 유지, **얼굴 크롭 금지**) |
| **그룹샷** | `celeb_tags.team_images[]` | 단체 화보(캐러셀) | `spotlight/{tagId}/team/g{NN}c{NN}-{hash8}.webp` | 출간 패널(clusters[].image 전체, 태그 단위 재구성) |

**함정**: 개인샷을 안 채우면 Hero가 아바타(얼굴 크롭)로 폴백돼 "얼굴이 Hero에 뜬다". 아바타=얼굴, 개인샷=원본 전신 — 반드시 다른 이미지.

## 파이프라인이 못 하는 것 (예외 작업)

- **신규 인물 등록** — 프로필 없는 인물(blocked 명단)은 celeb 파이프라인(web-bo `/celebs/new`·`celeb-creation-rulebook`)으로 먼저 등록. 신화·허구는 `fiction` 티어 + 인물 데이터 `mythical: true`.
- **상위 그룹 계층** — `sw/web/src/constants/factionGroups.ts` 코드 상수가 SSoT(`celeb_tags`에 parent_id 없음). 신규 태그를 그룹에 넣으려면 이 상수에 slug 추가(출간 결과의 constantHint가 알려줌).
- **태그 노출 결정** — 신규 태그는 `is_featured=false`로 생성된다. 노출 전환·설명문(`description`)·색은 web-bo 태그 화면에서 사람이 다듬는다.
- **아바타** — 위 표 참조.

## 수동 REST 폴백 (파이프라인 장애 시에만)

데이터 CRUD는 REST(PostgREST + `SUPABASE_SERVICE_ROLE_KEY`)로 가능하다. Supabase MCP도 동작한다(26.07.25 실측 — 과거 "401 차단" 기록은 낡음, DDL도 가능).
```
curl.exe "$URL/rest/v1/celeb_tags?..." -H "apikey: $SRK" -H "Authorization: Bearer $SRK"
```
env: `sw/web/.env`(SERVICE_ROLE), R2 키는 `sw/web-bo/.env`·`sw/remotion-bo/.env`(R2_* — 동일). CRLF라 값 파싱 시 `\r` 제거.

**REST로 직접 고쳤으면 캐시 무효화 필수** — `getFeaturedTags`는 `unstable_cache` 7일이라 화면이 안 바뀐다:
```
curl.exe -X POST "https://feelandnote.com/api/revalidate" -H "Content-Type: application/json" \
  -d '{"tag":"tags","secret":"<CRON_SECRET>"}'   # "celebs"도 한 번 더
```
`CRON_SECRET`은 `sw/web/.env`. (출간 패널은 이걸 자동으로 한다.)

관련: `celeb-avatar-wikimedia`(아바타), `faction-image`(팩션 발주), `celeb-tag-system.md`(태그 SSoT), `web-bo.md` 「세력도」 절(출간 배관), `faction-unification.md`(통합 설계).
