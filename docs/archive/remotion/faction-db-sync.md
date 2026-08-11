# 팩션 ↔ 본서비스 동기화 (faction-db-sync)

> ⚠️ **대체됨(26.07.25)** — 이 문서의 "다리(양방향 동기화)" 방식은 당일 폐기됐다. 코드도 옮겨졌다: 아래 「파일 배치」의 remotion-bo 경로 전부가 26.07.25 Phase 5 에서 삭제되고 `sw/web-bo/src/lib/faction-sync/`(진단·투영은 DB→DB 로 개조, 창구는 서버 액션 `actions/admin/factions/publish.ts`)로 대체됐다. 여기 적힌 진단 항목·`GET/POST /api/faction/db-sync` 규격은 무효다 — 현행은 `docs/project/remotion/faction/unification.md` §4·§9 와 진행 로그. 현행 SSoT는 같은 문서(집 하나: DB 단일 원천 + web-bo 단일 편집기)가 쥔다. 이 문서는 faction-sync 코드(이미지 배관·매핑 규칙)의 유래 기록으로만 남긴다. "스키마 변경 불필요" 서술도 무효 — faction_* 5테이블이 신설됐다.
>
> ⚠️ **재차 대체됨(26.08.03 단일화)** — 남아 있던 텍스트 투영(제작→배정 복사)마저 폐기됐다. 인물 텍스트의 유일 원천은 `faction_people`(도감 손질은 같은 행의 `web_*` 칸)이고, 웹·BO는 DB 뷰 `faction_atlas_members`를 직독한다. `celeb_tag_assignments`는 웹 전용 명단(영상 없는 태그의 수동 배정) 214행 전용으로 축소됐고 제작 유래 사본 650행은 삭제됐다(백업: `_backup/celeb-tag-assignments-full-2026-08-03.json`). 출간 패널은 사진(개인샷→`faction_people.web_image_url`, 그룹샷→`celeb_tags.team_images`)·영상·음악 업로드 도구로만 남았다. **아래 「데이터 매핑 (SSoT)」 표의 텍스트 행(epithet/lines → short_desc/long_desc, sort_order, 개인샷→assignments)은 역사 기록이다.** 현행은 `docs/project/remotion/faction/unification.md` §4-3.

> 실측 대조: 26.07.25 — remotion-bo·web-bo·web 코드 전수 정찰 + Supabase DB 실측(celeb_tags 40종) + 로컬 팩션 재고(에피소드 22·인물 524·slug 연결 99.4%) 기반 설계.

## 배경 — 왜 만드나

팩션 로컬 데이터(`sw/remotion/public/factions/`)와 본서비스 세력도감(DB `celeb_tags`·`celeb_tag_assignments` + R2 이미지)이 구조적으로 어긋난다. 원인은 명확하다:

- **로컬→DB 반영 경로가 0개**다(예외: 음성 voice_id_ko 1필드 수동 버튼). 다리는 수동 스킬(`faction-celeb-sync`) + 에피소드별 하드코딩 스크립트(web-bo scripts 3종)뿐.
- **DB→로컬**도 최초 1회 필드 복사(셀럽 검색)와 아바타 수동 다운로드뿐, diff 감지가 없다.
- remotion-bo의 DB 등록 배지(✓DB/⚠없음)는 Provider 미마운트로 **죽어 있다**.
- 실증 사례: Digital-Resistance — 로컬 그룹샷 6장 vs DB team_images 0장. DB 배정 7명 vs 로컬 인물 16명.

## 결정 — 기반은 remotion-bo

| 근거 | 내용 |
|------|------|
| 원본 위치 | 팩션 콘텐츠 원본(JSON·이미지·음성)은 로컬 파일. 이를 읽을 수 있는 것은 로컬 도구인 remotion-bo뿐 |
| 키 보유 | remotion-bo `.env`에 `SUPABASE_SERVICE_ROLE_KEY`·`R2_*` 7종이 이미 있다(미사용이었음) |
| 작업 흐름 | 인물·대사·이미지 작업이 FactionEditor에서 일어난다. 출간 버튼도 거기 있어야 손이 간다 |
| web-bo 역할 | 범용 셀럽 관리(신규 인물 등록·아바타·태그 수동 편집)로 존속. R2 키 규격·이미지 스펙만 공유 |

스키마 변경(DDL) **불필요** — 기존 테이블·컬럼만으로 전량 매핑된다. (Supabase MCP는 26.07.25 실측 정상 동작. 스킬 문서의 "401 차단" 기록은 낡았다.)

## 데이터 매핑 (SSoT)

| 팩션 (faction-data.json) | 본서비스 | 키 | 비고 |
|--------------------------|----------|-----|------|
| `FactionGroup` | `celeb_tags` 1행 | `group.tagSlug` ↔ `celeb_tags.slug` | **신규 필드 `tagSlug`**. 미지정 시 세력 폴더 슬러그(`NN-<slug>`의 slug)를 제안값으로 사용. **여러 세력이 같은 tagSlug를 공유할 수 있다**(예: PayPal-Mafia 세력 4개 → 태그 `paypal-mafia` 하나, Digital-Resistance 6→1). AI-Supremacy만 세력=태그 1:1 |
| `group.name` 첫 줄 | `celeb_tags.name` | — | 채움 전용(비어 있을 때만). `--force` 시 덮어씀 |
| `group.nameEn` 첫 줄 | `celeb_tags.name_en` | — | 〃 |
| `group.color` | `celeb_tags.color` | — | 〃 |
| `FactionPerson` | `celeb_tag_assignments` 1행 | `person.celebId`(우선) / `person.slug`(폴백) ↔ `profiles.id`/`slug` | DB에 프로필이 없으면 그 인물은 출간 불가로 보고(생성은 celeb 파이프라인 소관) |
| `person.epithet` ?? `lines[0]` | `assignments.short_desc` | — | 채움 전용 |
| `lines[1..2]` join(', ') | `assignments.long_desc` | — | 채움 전용 |
| `epithetEn` ?? `linesEn[0]` / `linesEn[1..2]` | `short_desc_en` / `long_desc_en` | — | 채움 전용 |
| 데이터 배열 순서(세력→클러스터→인물) | `assignments.sort_order` | — | 출간 시 항상 재기록. **태그 공유 시 전역 순번**(그 태그를 공유하는 전체 세력을 관통해 계산 — 한 세력만 출간해도 전역 기준) |
| `person.image` (로컬 PNG) | `assignments.faction_image_url` | R2 `faction/{tagId}/celeb-{celebId}.webp` | sharp inside-fit 1080, webp q88, **얼굴 크롭 금지**(원본 비율).  |
| `clusters[].image` (로컬 `_group.png`) | `celeb_tags.team_images[]` | R2 `faction/{tagId}/team/g{NN}c{NN}-{hash8}.webp`(g=세력 번호·c=클러스터 번호, 각 2자리) | 1080 정사각(cover·attention). **재구성은 태그 단위** — 그 태그를 공유하는 전체 세력의 그룹샷을 세력→클러스터 순서로 모아 배열을 만든다(한 세력만 출간해도 다른 세력 몫 유지, 덮어쓰기 방지). 한 장이라도 파일 결손이면 배열 교체 보류 |
| `person.mythical` | `profiles.celeb_tier = 'fiction'` 대조 | — | 진단 표시용 |

**건드리지 않는 것**: `profiles`의 인물 본문(닉네임·bio·아바타 — celeb 파이프라인 소관), DB에서 사람이 다듬은 `short_desc`/`long_desc`(채움 전용 원칙), 상위 그룹 계층(**26.07.26부터 `celeb_tags.parent_id`가 정본** — 출간은 손대지 않고 "추가 필요 slug" 안내만 출력한다. ⚠️ 그 안내 문구는 아직 삭제된 옛 상수 파일을 가리킨다).

## 동작 3종

### 1) 진단 `GET /api/faction/db-sync/status?episode=<ep>`

읽기 전용. 에피소드의 세력·인물 전수를 DB·R2와 대조해 반환한다.

```ts
{
  episode: string,
  groups: [{
    index, name, tagSlug: string | null,        // null = tagSlug 미지정(출간 불가, 제안값 동봉)
    suggestedSlug: string,                       // NN-폴더 슬러그
    tag: { exists, id?, name?, isFeatured?, teamImagesCount } ,
    teamShots: { local: number, matched: number },  // 로컬 _group.png 수 vs 매니페스트 해시 일치 수
    people: [{
      name, celebId?, slug?, mythical?,
      profile: 'linked' | 'missing' | 'unkeyed', // DB 조회 결과
      assigned: boolean,
      desc: 'db' | 'fillable' | 'none',          // DB에 이미 있음 / 로컬로 채울 수 있음 / 둘 다 없음
      soloShot: 'synced' | 'stale' | 'local-only' | 'db-only' | 'none',
      avatar: boolean                             // profiles.avatar_url 존재
    }]
  }],
  summary: { publishable, blocked, ... }
}
```

`stale` 판정은 로컬 파일 해시 vs 매니페스트(아래) 기록 비교.

### 2) 출간 `POST /api/faction/db-sync/publish`

```ts
{ episode, groupIndex?: number,     // 미지정 = 전체. UI는 세력 단위로 순차 호출해 진행률 표시
  scope: { tag?: bool, assignments?: bool, descs?: bool, personImages?: bool, teamImages?: bool },
  dryRun?: bool, force?: bool }      // force = 채움 전용 필드도 덮어씀
```

순서: 태그 upsert(slug 기준) → 배정 upsert(celeb_id+tag_id 기준, sort_order 재기록) → 개인샷 업로드+URL 갱신 → 그룹샷 업로드+team_images 재구성 → 완료 시 웹 캐시 무효화(`/api/revalidate`, `tags`+`celebs`).

- **멱등성**: 이미지 콘텐츠 해시를 에피소드 로컬 매니페스트 `_db-sync.json`에 기록(파일별 sha1 8자·R2 키·업로드 시각·tagId). 해시 동일 → 업로드 생략. 개인샷은 고정 키 덮어쓰기, 그룹샷은 해시 포함 키라 자연 분리(참조가 빠진 옛 team 파일은 R2에 남긴다 — 삭제는 후속).
- **보호 규칙**: ① 텍스트는 채움 전용이 기본(사람이 DB에서 다듬은 소개문을 절대 덮지 않는다) ② 프로필 미존재 인물은 건너뛰고 명단 보고 ③ dryRun이 모든 쓰기 직전 단계까지 동일 계산 후 변경 예정 목록만 반환.
- 결과: 항목별 `created | updated | skipped(사유) | blocked(사유)` 목록.

### 3) 역수입(pull) — 콘텐츠 제작 재료

- **DB 배지 복구**: 죽어 있는 `FactionCelebProvider`를 폐기하고, 담화(discourse)에서 검증된 `useCelebExists` 직접 호출 방식으로 `FactionPersonRow` 배지를 살린다. ✓DB(초록)/⚠없음/미연결/신화가 실데이터로 뜬다.
- **재료 조회 확장**: 기존 `/api/celebs/[slug]`(프로필+도서)와 voice 가져오기 외에, status 응답에 avatar 유무·fiction 여부를 실어 편집 화면이 "이 인물의 DB 재료 상태"를 즉시 보여준다. (가상독백·대사 끌어오기는 담화 통합 단계에서 확장 — 이번 범위 밖)

## 파일 배치

```
sw/remotion-bo/src/lib/faction-sync/
  types.ts       # 계약 타입 (status·publish 요청/응답)
  supabase.ts    # createAdminClient 재사용 래퍼 (기존 lib/supabase.ts 활용)
  r2.ts          # uploadToR2/publicUrl — web-bo/src/lib/r2.ts와 동일 규격 (env 동일 키)
  image.ts       # sharp 변환 2종: soloShot(inside 1080 q88) / teamShot(cover 1080 attention q85)
  manifest.ts    # _db-sync.json 읽기/쓰기
  diff.ts        # 진단 로직 (로컬 데이터 + DB 병렬 조회 → status 응답)
  publish.ts     # 출간 로직 (diff 재사용, scope별 실행)
sw/remotion-bo/src/app/api/faction/db-sync/status/route.ts
sw/remotion-bo/src/app/api/faction/db-sync/publish/route.ts
sw/remotion-bo/src/components/faction/FactionPublishPanel.tsx   # 「출간」 토글 패널
```

- `faction-types.ts`의 `FactionGroup`에 `tagSlug?: string` 추가(주석: celeb_tags.slug 연결 키). remotion 측 `Faction/types.ts`에도 동일 추가(렌더는 무시하나 타입 동기 유지 원칙).
- 캐시 무효화: `POST {WEB_BASE_URL}/api/revalidate` body `{tag, secret: CRON_SECRET}` — 태그 `tags`·`celebs` 2회. env 미설정 시 결과에 "수동 무효화 필요" 경고를 실어 반환(조용한 폴백 금지).

## env (remotion-bo/.env 추가분)

```
WEB_BASE_URL=http://localhost:3000   # 배포 웹 주소로 교체 가능
CRON_SECRET=<sw/web/.env와 동일값>
```

## UI — FactionEditor 「출간」 패널

- 기존 「유튜브」(FactionYouTubePanel) 토글과 같은 패턴으로 「출간」 토글 신설.
- 열면 status 호출 → 세력별 행: tagSlug(인라인 편집·제안값 채움) · 태그 상태 칩 · 인물 N(연결/미연결/미배정) · 개인샷 n/N · 그룹샷 n/N · desc 채움 가능 수.
- 버튼: 세력별 「미리보기(dry-run)」·「출간」, 상단 「전체 출간」(세력 순차 실행, 진행률). force 체크박스(경고 문구).
- 결과 로그: created/updated/skipped/blocked 목록 + factionGroups.ts 안내(신규 태그 slug가 상위 그룹 상수에 없으면 그 slug 나열).
- 미연결(프로필 없음) 인물은 web-bo `/celebs/new` 안내와 함께 명단 표시.

## 검증 계획 (파일럿)

1. `pnpm tsc --noEmit` (remotion-bo·web-bo).
2. **PayPal-Mafia dry-run** — 이미 완전 동기화된 에피소드. 기대: 변경 예정 0 또는 텍스트 skipped 전량(멱등성 증명). 단 매니페스트가 없으므로 이미지 해시 초회 기록은 발생.
3. **AI-Supremacy dry-run** — 세력 11·인물 70. 기존 DB(openai 등 10태그)와 대조해 매핑이 정확히 붙는지 확인.
4. **Digital-Resistance 실출간** — DB에 배정 7명·그룹샷 0장 vs 로컬 16명·그룹샷 6장. 실제 어긋남 해소를 실측. 출간 후 웹 `/explore/faction/digital-resistance` 확인 + 캐시 무효화 동작 확인.
5. 재실행 시 skipped 전량(멱등성 2차 증명).

## 한계·후속 과제

- **상위 그룹 계층** — **DB 이관 완료(26.07.26, `celeb_tags.parent_id`).** 지정은 web-bo `/factions/themes/[tagId]`의 「상위 묶음」에서 사람이 한다. 출간은 여전히 안내만 하고 계층을 건드리지 않는다. **후속**: 출간 결과의 `constantHint` 문구가 아직 삭제된 `factionGroups.ts`를 가리키므로 「상위 묶음에서 지정하세요」로 바꿔야 한다(`sw/web-bo/src/lib/faction-sync/publish.ts`·`types.ts`·`FactionPublishPanel.tsx`).
- **아바타** — 출간 범위 밖(celeb-avatar-register 스킬 소관). 진단에 유무만 표시.
- **X-Empire slug 결손 3명**(제임스/앤드루 머스크·로스 노딘) — 진단이 unkeyed로 잡아준다. 데이터 보완은 콘텐츠 작업.
- **북리커맨드·가상독백** — 같은 골격(진단→출간→역수입)으로 후속 통합. 이번 범위 밖.
- **R2 고아 파일 청소** — team 옛 uuid 파일 등. 후속.
