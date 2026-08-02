---
name: faction-celeb-sync
description: 팩션(factions/) 영상 인물을 세력도감(/explore/faction)에 반영할 때 적용한다. 26.08.03 단일화 이후 텍스트(대사·직함·소개)는 제작 편집만으로 자동 반영되고, web-bo 「출간」 패널은 사진·영상·음악 전용이며, 영상 없는 태그의 수동 명단은 배정 테이블로 관리한다. 데이터 구조·이미지 3종 구분·캐시 규칙과, 파이프라인이 못 하는 예외 작업(신규 인물 등록·아바타·신원 비공개 인물)의 절차를 담는다. "세력도감 인물 채워", "태그에 인물 배정", "개인샷/그룹샷 넣어", "팩션 인물 세력도감 반영", "얼굴 없는/익명 인물 등록", "세력도감 이미지 안 뜸/얼굴만 뜸", "출간 안 됨" 등에 호출.
---

# 팩션 영상 → 세력도감 연동

세력도감(`/explore/faction`)은 셀럽을 테마(태그)로 묶어 보여준다. **26.08.03 단일화 이후 표준 경로는 셋으로 갈린다.**

1. **텍스트(대사·직함·소개)** — web-bo(포트 3001) `/factions/<편>` 편집기에서 제작 데이터(`faction_people`)를 고치면 끝이다. 별도 출간 없이 캐시 주기(또는 `/api/revalidate` tags·celebs) 안에 웹에 반영된다.
2. **사진·영상·음악** — 편집기 헤더의 「출간」 패널로 올린다(진단→dry-run→출간).
3. **영상 없는 태그의 수동 명단** — 배정 테이블(`celeb_tag_assignments`)을 web-bo `/factions/themes/[tagId]` 테마 편집기에서 관리한다.

수동 스크립트·REST 직접 수정은 파이프라인이 못 하는 예외에만 쓴다. 파이프라인 SSoT는 `docs/project/web-bo.md` 「세력도감」 절(설계 근거는 `docs/project/remotion/faction-unification.md` §4-3·§9), 태그 시스템 SSoT는 `docs/project/celeb/celeb-tag-system.md`.

> **26.07.25 이관** — 출간 배관이 remotion-bo에서 web-bo로 옮겨 오면서 창구가 **API 라우트가 아니라 서버 액션**(`src/actions/admin/factions/publish.ts`의 `diagnoseFactionPublish`·`publishFactionEpisode`)이 됐다. 옛 `api/faction/db-sync/{status,publish}` 2라우트는 삭제됐고 **remotion-bo의 팩션 주소는 404다.** 서버 액션은 `curl`로 찌를 수 없으므로 진단·출간은 화면에서 한다.
> **26.08.03 단일화** — 출간의 텍스트 복사가 폐기됐다. 인물 텍스트의 유일 원천은 `faction_people`이고 웹·BO는 DB 뷰 `faction_atlas_members`를 직독한다.

## 표준 절차

1. **연결 키 확인** — 편집기에서 세력마다 연결 키(`tagSlug` = `celeb_tags.slug`)를 지정한다. 여러 세력이 태그 하나를 공유할 수 있다(예: PayPal-Mafia 4세력 → `paypal-mafia`). 인물은 셀럽 검색으로 추가하면 `celeb_id`가 자동으로 맺힌다. **연결 키가 없으면 `tag-slug-missing`으로 막히고 쓰기가 0건이 된다**(태그 자체가 없는 것은 출간이 만들 수 있지만, 연결 키조차 없으면 만들 근거가 없다).
2. **텍스트는 제작 편집으로 끝낸다** — 대사·직함·소개는 `faction_people`이 유일 원천이라 편집기에서 고치면 자동 반영된다. 도감용 손질(소개 교정·개인샷 교체·숨김)은 테마 편집기에서 하면 같은 행의 `web_*` 칸(`web_short_desc`/`web_long_desc` ±en·`web_image_url`·`web_hidden`)에 기록된다 — 행마다 제작/수동 출처 배지가 붙고, 제작 행의 제거는 숨김으로 동작하며, 순서 편집은 수동 행 전용이다.
3. **진단** — 「출간」 버튼으로 패널을 펼치면 세력·인물 전수의 DB 대조 결과가 뜬다. 제작과 서비스가 같은 DB 안에 있어 **텍스트 대조는 사라졌다**(옛 `desc: db|fillable|none` 항목 폐기). 남는 항목은 5종이다.

   | 진단 | 판정 기준 |
   |---|---|
   | 셀럽 미해소 인물 | `faction_people.celeb_id`가 null — 연결 키가 없거나, 있어도 그 셀럽이 DB에 없다 |
   | 태그 미지정 세력 | `faction_groups.tag_id`가 null |
   | 개인샷·그룹샷 저장소 동기 상태 | 로컬 파일 해시 ↔ 매니페스트(`_db-sync.json`) 대조 |
   | 얼굴 사진(아바타) 유무 | `profiles.avatar_url` |
   | 신화 표시 ↔ 셀럽 등급 어긋남 | `mythical`과 `fiction` 등급이 서로 다름 |

4. **미리보기(dry-run)** — 변경 예정 목록(created/updated/skipped/blocked)을 확인한다.
5. **출간(사진·영상·음악)** — 태그 upsert → 개인샷 R2 업로드(주소는 `faction_people.web_image_url`에 기록) → 그룹샷 R2 업로드(`celeb_tags.team_images` 재구성) → 영상·음악 → 운영 웹 캐시 무효화(`[TAGS, CELEBS]`)까지 한 번에 돈다. 멱등(해시 매니페스트 `_db-sync.json`) — 재실행하면 skipped 전량이 정상. **텍스트(배정 upsert·소개문 복사)는 26.08.03에 폐기돼 돌지 않는다.**

**⚠ 매니페스트가 없는 편은 첫 회에 이미지 기록이 발생한다.** 옛 일회성 스크립트로 사진을 올린 편은 주소 키가 이미 같아도 `_db-sync.json`이 없어 다시 올린다. 실측(PayPal-Mafia): 미리보기 updated 25 = 영문 소개문 10명분 채움 + 개인샷 14장 + 단체사진 4장(도감이 옛 `team/0.webp` 식 키를 쥐고 있어 해시 키로 갈린다). **전부 실제 어긋남이고 결함이 아니다** — "변경 0"을 기대하지 않는다.

**사진 범위를 켰는데 `FACTION_LOCAL`이 없으면** 조용히 건너뛰지 않고 사유를 들고 실패한다(`sw/web-bo/.env`).

**보호·조회 규칙**: 셀럽 미해소 인물은 blocked 명단으로 보고. 그룹샷 배열은 태그 단위로 재구성해 공유 태그의 다른 세력 몫을 보존하고, 한 장이라도 실패하면 배열 교체를 보류한다. 같은 셀럽이 한 태그 안 여러 자리에 있으면 제작 앞자리 배치를 채택하고, 정렬은 제작 순번 우선(웹 전용 배정은 10000+ 순번), 숨김·`disabled` 제외 — **이 셋은 출간이 아니라 뷰 `faction_atlas_members`의 조회 규칙이다**(26.08.03). 옛 채움 전용 보호·`sort_order` 전역 재기록은 배정 사본이 사라지면서 대상이 없어졌다.

## 데이터 구조

- **제작(유일 원천)** — `faction_episodes`·`faction_groups`·`faction_clusters`·`faction_people`·`faction_episode_parts` 5테이블. **인물 텍스트(대사 quote·직함·소개 epithet/lines)는 `faction_people`이 유일 원천이다(26.08.03).** 도감 손질은 같은 행의 `web_*` 칸 — `web_short_desc`/`web_long_desc`(±en)·`web_image_url`(개인샷)·`web_hidden`(숨김). 태그 연결은 `faction_groups.tag_id` → `celeb_tags`, 셀럽 연결은 `faction_people.celeb_id`.
- **읽기 창구 = DB 뷰 `faction_atlas_members`** — 제작 유래(`web_*` 손질 우선, 태그당 셀럽 중복은 제작 앞자리 채택, disabled 제외) ∪ 웹 전용 배정. 정렬은 제작 순번 우선, 웹 전용은 10000+. 행 식별자 `source`(production/manual)·`person_id`·`assignment_id` 포함. 웹·BO 모두 이 뷰를 읽는다.
- `celeb_tags` — 태그 마스터(테마). 그룹 헤더도 여기 일반 태그 1행으로 존재. **노출 결정은 `is_featured` 스위치 하나다.**
- `celeb_tag_assignments` — **웹 전용 명단(영상 없는 태그의 수동 배정) 214행 전용**(26.08.03 축소. 제작 유래 사본 650행 삭제, 백업: `_backup/celeb-tag-assignments-full-2026-08-03.json`). 수동 행의 소개(`short_desc`/`long_desc`)·개인샷(`faction_image_url`)·숨김(`hidden`)이 여기 붙는다.
- `profiles.avatar_url` — 인물 공통 아바타(태그 무관).

## 이미지 3종 — 절대 혼동 금지

화면 소스: `FactionShowcase.tsx`에서 Hero = `faction_image_url ?? avatar_url`(뷰 `faction_atlas_members`가 실어 주는 값), 리스트 썸네일 = `avatar_url`, 단체샷 = `team_images`.

| 종류 | 컬럼/필드 | 성격 | R2 경로 | 채우는 경로 |
|------|-----------|------|---------|------|
| **아바타** | `profiles.avatar_url` | 얼굴 크롭(원형 썸네일) | `celebs/{celebId}/avatar.webp` | **파이프라인 밖** — `celeb-avatar-register` 스킬 또는 `web-bo/scripts/upload-celeb-avatar.ts --image-file` |
| **개인샷** | `faction_people.web_image_url`(제작 유래, 26.08.03~) · 수동 행은 `assignments.faction_image_url` | **원본 전신/연출 화보**(Hero 큰 사진) | `faction/{tagId}/celeb-{celebId}.webp` | 출간 패널(person.image → 원본 비율 유지, **얼굴 크롭 금지**) 또는 테마 편집기 업로드 |
| **그룹샷** | `celeb_tags.team_images[]` | 단체 화보(캐러셀) | `faction/{tagId}/team/g{NN}c{NN}-{hash8}.webp` | 출간 패널(clusters[].image 전체, 태그 단위 재구성) |

**함정**: 개인샷을 안 채우면 Hero가 아바타(얼굴 크롭)로 폴백돼 "얼굴이 Hero에 뜬다". 아바타=얼굴, 개인샷=원본 전신 — 반드시 다른 이미지.

아바타의 프레임 기하·안전 영역·발주 프롬프트·판정 기준은 `docs/project/celeb-avatar-spec.md`가 SSoT다(개인샷에는 적용하지 않는다).

## 파이프라인이 못 하는 것 (예외 작업)

- **신규 인물 등록** — 프로필 없는 인물(blocked 명단)은 celeb 파이프라인(web-bo `/celebs/new`·`celeb-creation-rulebook`)으로 먼저 등록. 신화·허구는 `fiction` 티어 + 인물 데이터 `mythical: true`.
- **상위 그룹 계층** — `celeb_tags.parent_id`가 SSoT다(26.07.26 코드 상수에서 승격, `constants/factionGroups.ts`는 삭제됨). 신규 태그를 그룹에 넣으려면 web-bo `/factions/themes/[tagId]`의 「상위 묶음」에서 고른다. ⚠️ 출간 결과의 `constantHint` 안내 문구는 아직 옛 상수 파일을 가리킨다(후속 교정 대상).
- **태그 노출 결정** — 신규 태그는 `is_featured=false`로 생성된다. 노출 전환·설명문(`description`)·색은 web-bo 태그 화면에서 사람이 다듬는다.
- **아바타** — 위 표 참조.

### 신원 비공개 인물의 아바타 등록

사토시 나카모토·익명 개발자처럼 실제 얼굴을 알 수 없는 인물도 셀럽 프로필과 아바타를 가질 수 있다.
**얼굴을 발명하는 작업이 아니라, 신원을 숨긴 채 조사 근거와 시각적 개성을 보존하는 작업**으로 처리한다.
익명 화보·REF 설계 기준은 `faction-image`의 「신원 비공개 인물」 절을 먼저 따른다.

1. **원본 선정** — 기존 `_refs/<인물>`을 먼저 열고, 팩션 개인 화보 후보를 한 장씩 직접 대조한다. 첫 파일을
   자동 채택하거나 비교용 시트·합본을 만들지 않는다. 일치하는 컷이 없으면 조사 후 서로 구별되는 익명 REF와
   개인 화보를 먼저 설계한다. 실제 얼굴을 추정·생성하거나 일반 웹 사진을 본인 사진으로 대체하지 않는다.
2. **크롭** — 목표 프레임 기하는 `docs/project/celeb-avatar-spec.md` §1·§2를 따른다. `sw/web-bo/scripts/crop-faces.ts`를 먼저 실행한다. 마스크·후면·불투명 고글 때문에 얼굴이
   검출되지 않은 경우에만 수동 정사각 크롭을 허용한다. 수동 크롭도 승인된 REF의 은폐 방식·복식·소품을
   보존하며 얼굴을 보정하거나 드러내지 않는다.
3. **배경 제거** — 반드시 `nobg-cutout` 스킬과 `C:\project\nobg` 전용 도구를 쓴다. 서비스 배경
   `#0a0a0a`, 밝은 배경, 원형 썸네일에서 경계·잔상·타인 신체가 없는지 직접 본다. 실패 후보는 업로드하지 않는다.
4. **등록·업로드** — 셀럽이 없으면 실존 인물 프로필을 먼저 생성하고 `faction_people.celeb_id`를 연결한다.
   최종 800×800 RGBA WebP를 `upload-celeb-avatar.ts --image-file`로
   `celebs/{celebId}/avatar.webp`에 올린다. 완전 은폐 인물은 `--face-detect false`를 명시한다.
5. **검증·출간** — R2 재다운로드본과 업로드 미리보기의 해시·크기·알파를 대조하고 운영 페이지가 새
   버전 URL을 읽는지 확인한다. `[CELEBS, TAGS]` 캐시를 무효화한 뒤 출간 패널의 진단→dry-run→출간을 거친다.
6. **로컬 정리까지 완료 조건** — 중간 재료는 저장소 `.tmp`가 아니라 작업별 시스템 임시 폴더 하나에만 둔다.
   업로드·운영 검증 직후 복사 재료, 크롭, 누끼, 밝기 비교, 원형 미리보기, R2 검증 다운로드, HTML, 합본·
   시트를 모두 삭제하고 `nobg/batch_work/{originals,nobg}`에서 이번 파일도 제거한다. 원래 팩션 자산과
   승인된 `_refs`, R2·DB 결과, 필수 출처 로그만 남긴다.

## 수동 REST 폴백 (파이프라인 장애 시에만)

데이터 CRUD는 REST(PostgREST + `SUPABASE_SERVICE_ROLE_KEY`)로 가능하다. Supabase MCP도 동작한다(26.07.25 실측 — 과거 "401 차단" 기록은 낡음, DDL도 가능).
```
curl.exe "$URL/rest/v1/celeb_tags?..." -H "apikey: $SRK" -H "Authorization: Bearer $SRK"
```
env: `sw/web/.env`(SERVICE_ROLE), R2 키는 `sw/web-bo/.env`(R2_*). CRLF라 값 파싱 시 `\r` 제거.

**REST로 직접 고쳤으면 캐시 무효화 필수** — `getFeaturedTags`는 `unstable_cache` 7일이라 화면이 안 바뀐다:
```
curl.exe -X POST "https://feelandnote.com/api/revalidate" -H "Content-Type: application/json" \
  -d '{"tag":"tags","secret":"<CRON_SECRET>"}'   # "celebs"도 한 번 더
```
`CRON_SECRET`은 `sw/web/.env`. (출간 패널은 이걸 자동으로 한다.)

관련: `celeb-avatar-register`(아바타), `nobg-cutout`(배경 제거), `faction-image`(팩션 발주·익명 인물 설계), `celeb-tag-system.md`(태그 SSoT), `web-bo.md` 「세력도감」 절(출간 배관), `faction-unification.md`(통합 설계).
