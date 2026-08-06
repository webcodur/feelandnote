# 부록 A. 세력도감 태그

> **최종 실측 체크: 26.08.03** — 아래 「26.08.03 단일화」 절이 최신 구조다. 그 이전 실측은 26.07.27(개편 절)·26.07.16(DB 스키마 전수, 서버 액션 4종, `components/features/landing/` 컴포넌트 7종, 타입, 라우트, 백오피스 경로).

## 26.08.03 단일화 — 가장 먼저 읽을 것

복사 구조를 폐기하고 데이터를 한 벌로 줄였다. 이 문서의 나머지 절은 이 변경을 얹어 읽어야 한다. 작업 기록은 `docs/todo/faction/faction-atlas-reconciliation-2026-08-03.md` 「단일화 전환」.

- **인물 텍스트(대사 quote·직함·소개 epithet/lines)의 유일 원천은 제작 테이블 `faction_people`이다.** 제작 유래 인물의 도감 한줄은 직함 첫 항목(JSON `lines[0]`, PostgreSQL `lines[1]`)으로 고정한다. 별도 손질은 `web_long_desc`(±en, 상세 소개)·`web_image_url`·`web_hidden`만 허용한다. 옛 `web_short_desc`(±en)는 폐기했다.
- **웹·BO 읽기는 DB 뷰 `faction_atlas_members` 하나다.** 제작 유래(한줄=직함 첫 항목, 상세=`web_long_desc` 손질 우선) ∪ 웹 전용 배정. 태그당 같은 셀럽 중복은 제작 앞자리 배치를 채택하고, `disabled` 인물은 제외한다. 정렬은 제작 순번 우선이고 웹 전용 배정은 10000+ 순번으로 뒤에 선다.
- **`celeb_tag_assignments`는 웹 전용 명단(영상 없는 16태그의 수동 배정) 123행 전용이다.** 최초 단일화 때 남은 214행 중 영상 연결분은 P14에서 제작으로 흡수했고, 제작 유래 사본 650행은 26.08.03 삭제했다(백업: `_backup/celeb-tag-assignments-full-2026-08-03.json`).
- **「출간」의 텍스트 복사는 폐기됐다.** 제작에서 고치면 캐시 주기(또는 `/api/revalidate` tags·celebs) 안에 웹에 반영된다. 출간 패널은 사진(개인샷→`faction_people.web_image_url`, 그룹샷→`celeb_tags.team_images`)·영상·음악 업로드 도구로 축소됐다.
- **노출 결정은 `celeb_tags.is_featured` 스위치 하나다.**
- **BO 테마 편집기는 행마다 제작/수동 출처 배지를 단다.** 제작 행은 상세 소개·개인샷·숨김만 `web_*` 칸에 기록하고 한줄은 직함 1행을 읽기 전용으로 보여준다. 제거는 숨김(`web_hidden`)으로 동작하며, 순서 편집은 수동 행 전용이다.

## 26.07.27 개편 — 먼저 읽을 것

하루에 네 가지가 바뀌었다. 이 문서의 나머지 절은 이 변경을 반영해 읽어야 한다.

### ① 도감 노출은 배정의 `hidden` 이 정한다

예전에는 `profiles.status='active'` 가 도감 노출까지 좌우했다. 그 값은 영상 제작 쪽 사정으로 정해지는 것이라 진열 판단과 맞지 않았고, **실측 42명이 13개 테마에서 통째로 사라져 있었다**(팩션에서 등록한 인물들). 이제 도감 조회는 그 게이트를 보지 않는다.

- `celeb_tag_assignments.hidden`(boolean, 기본 false) — 테마마다 따로 켜고 끈다. 같은 인물이 A 테마에서는 보이고 B 테마에서는 안 보일 수 있다
- 등급 게이트(`LISTING_DEFAULT_TIERS`)는 그대로다 — 신화·관계 등급은 여전히 목록에 안 뜬다
- BO 편집 화면 인물 줄의 「도감 노출 / 숨김」 단추가 이 값을 바꾼다(`setTagCelebHidden`)
- 감춘 배정은 DB 조회 단계에서 걸러지므로 인원 상한 자리를 차지하지 않는다
- **26.08.03부터 이 컬럼은 수동 행 전용이다.** 제작 유래 인물의 숨김은 `faction_people.web_hidden`이 맡고, 뷰 `faction_atlas_members`가 둘을 합쳐 `hidden` 하나로 내놓는다. BO 단추는 출처에 따라 알맞은 칸에 쓴다

### ② 인원 상한 16 → 24 (→ 26.07.29에 40)

`getFeaturedTags` 의 `MAX_CELEBS_PER_TAG`. 한 사람이 여러 테마에 겹쳐 드는 일이 정상이 되면서 상한에 걸려 멀쩡한 인물이 조용히 잘려 나갔다(소셜 네트워크의 싸이월드 창업자). 감추는 일은 `hidden` 이 맡고 이 값은 사고 방지용 천장이다. 26.07.29 신화 팩션 전량 연결 때 **40**으로 재상향했다(북유럽 신화 29명 수용).

### ③ `team_images` 는 주소 배열이 아니라 「사진 + 담긴 인물」 목록이다

```jsonc
[{ "url": "...", "label": "안전을 설계한 사람들", "labelEn": "...", "celebIds": ["uuid", ...] }]
```

- 정본 타입·정규화: `packages/shared/src/lib/faction-team-image.ts`(`toTeamImages`·`toTeamImageUrls`·`serializeTeamImages`). **옛 문자열 배열도 그대로 읽힌다**
- 출간(`faction-sync/publish.ts`)이 영상 묶음의 이름·소속 인물을 함께 실어 나른다. 손으로 다시 적을 필요 없다
- 도감 화면은 사진마다 무리 이름을 제목으로 띄우고, 그 사진의 인물을 목록에서 사진 아래 들여쓰기로 매단다
- ⚠️ 화면 저장분(캐시)에 옛 형태가 남을 수 있어 **화면 세 곳에서 한 번 더 정규화**한다(`FactionShowcase`·`FactionIntroView`·`FactionPreviewModal`)

### ④ 대분류 13개 · 태그 139개 (26.08.03 실측)

축이 뒤섞여 있던 묶음을 분야 기준으로 다시 세웠다. **인공지능 · 기술과 과학 · 경제와 산업 · 권력과 전쟁 · 사상과 신념 · 미술 · 음악 · 문학과 영화 · 스포츠 · 이면 세계 · 삶의 궤적 · 특집 · 신화와 이야기.**

- 26.08.03에 옛 「예술과 문화」를 **미술 · 음악 · 문학과 영화**로 분리했다. 미술은 르네상스·빈의 세기말·현대 건축, 음악은 브리티시 인베이전·록 밴드·지휘자·K-POP·아이돌 4분류, 문학과 영화는 잃어버린 세대·영화 감독을 직접 자식으로 둔다.
- 위계는 두 단계까지만 허용하므로 「한국 아이돌」 중간 그룹은 두지 않는다. 아이돌 현직/전직·남성/여성 4태그가 `music`의 직접 자식이다.

- 「삶의 궤적」은 분야가 아니라 살아온 방식(자수성가·독학가·결핍·망명자)이라 따로 뒀다
- 「특집」은 한 사람이나 한 사건을 통째로 파는 자리다(머스크 계열 5 + 틸 유니버스)
- 「신화와 이야기」는 나중에 소설·영화·게임 인물까지 받을 그릇이다. 지금은 진열을 꺼 뒀다
- 빈 껍데기가 된 옛 묶음 셋(난세의 영웅·혁명과 건국·시련을 넘어)은 자식을 옮긴 뒤 삭제했다

**팩션 편 상태(`faction_episodes.status`)도 두 값으로 줄었다** — `ready`(도감으로 옮길 수 있다) / `blocked`(출연진이 사람이 아니거나 등록 인물이 셋 미만). 옛 다섯 값(idea/todo/live/done/shelved)은 폐기. 렌더 편성 여부는 예전대로 `registered` 가 쥔다.

---

## DB 스키마

### celeb_tags (태그 마스터)

| 컬럼 | 타입 | 필수 | 기본값 | 설명 |
|------|------|:----:|--------|------|
| `id` | uuid | ✅ | `gen_random_uuid()` | PK |
| `name` | text | ✅ | - | 태그명 (한국어) |
| `name_en` | text | - | - | 태그명 (영문) |
| `description` | text | - | - | 태그 설명 (한국어). 한두 문장, 운문체 권장 |
| `description_en` | text | - | - | 태그 설명 (영문) |
| `color` | text | - | `#7c4dff` | HEX 색상. 태그 pill UI에 사용 |
| `slug` | text | - | - | 테마별 고유 주소. `/explore/faction/<slug>` (예: `xai`). UNIQUE(null 허용). BO에서 입력 |
| `team_images` | jsonb | ✅ | `[]` | 단체 사진 목록. **주소만이 아니라 `{url, label, labelEn, celebIds}`** (26.07.27, 위 개편 ③). 옛 문자열 배열도 읽힌다. R2: `faction/{tagId}/team/{uuid}.webp` |
| `sort_order` | integer | - | `0` | 태그 목록 정렬 순서 (낮을수록 먼저) |
| `is_featured` | boolean | - | `false` | `true`면 세력도감에 노출, `false`면 예고편(Soon) 표시 |
| `start_date` | date | - | - | 기간 한정 태그 시작일 (미사용) |
| `end_date` | date | - | - | 기간 한정 태그 종료일 (미사용) |
| `created_at` | timestamptz | - | `now()` | 생성 시각 |
| `updated_at` | timestamptz | - | `now()` | 수정 시각 |

### celeb_tag_assignments (셀럽-태그 매핑)

> **26.08.03 P14 정비 후 웹 전용 명단(영상 없는 16태그의 수동 배정) 123행 전용이다.** 제작(영상) 유래 인물은 이 테이블에 없다 — 원천은 `faction_people`이고 뷰 `faction_atlas_members`가 두 갈래를 합쳐 준다. 제작 유래 사본 650행은 26.08.03 삭제(백업: `_backup/celeb-tag-assignments-full-2026-08-03.json`).

| 컬럼 | 타입 | 필수 | 기본값 | 설명 |
|------|------|:----:|--------|------|
| `id` | uuid | ✅ | `gen_random_uuid()` | PK |
| `tag_id` | uuid | ✅ | - | FK → `celeb_tags.id` |
| `celeb_id` | uuid | ✅ | - | FK → `profiles.id` |
| `short_desc` | text | - | - | 이 태그에서 이 인물의 한줄 소개 (한국어) |
| `short_desc_en` | text | - | - | 한줄 소개 (영문) |
| `long_desc` | text | - | - | 이 태그에서 이 인물의 상세 설명 (한국어, 1~2문장) |
| `long_desc_en` | text | - | - | 상세 설명 (영문) |
| `faction_image_url` | text | - | - | 이 태그에서 이 인물의 화보 1장 URL(수동 행 몫. **제작 유래 인물의 개인샷은 `faction_people.web_image_url`**). 쇼케이스 좌측 큰 사진(Hero)의 소스. 없으면 `profiles.avatar_url`로 폴백(= 얼굴 크롭이 Hero에 뜬다). R2: `faction/{tagId}/celeb-{celebId}.webp` |
| `sort_order` | integer | - | `0` | 태그 내 인물 정렬 순서 (낮을수록 먼저). 뷰에서 웹 전용 배정은 10000+ 순번으로 제작 유래 뒤에 선다 |
| `hidden` | boolean | ✅ | `false` | **이 테마에서 이 인물을 감출지**(26.07.27 신설, 위 개편 ①). 셀럽 전역 상태와 무관하다. 제작 유래 인물의 숨김은 `faction_people.web_hidden` |
| `assigned_at` | timestamptz | - | `now()` | 배정 시각 |

### 관계

```
celeb_tags (1) ──< celeb_tag_assignments (N) >── profiles (1)
```

- 1개 태그에 여러 셀럽 배정 가능
- 1개 셀럽이 여러 태그에 소속 가능
- `short_desc`/`long_desc`는 **태그-셀럽 관계별**로 다름 (같은 인물이라도 태그마다 다른 설명)
- **화면·액션이 실제로 읽는 것은 이 테이블이 아니라 뷰 `faction_atlas_members`다**(26.08.03) — 제작 유래(`faction_people`, `web_*` 손질 우선) ∪ 웹 전용 배정을 한 창구로 합쳐, `source`(production/manual)·`person_id`·`assignment_id` 행 식별자까지 실어 준다
- `celeb_tags`는 **완전 평면**이다. `parent_id` 등 계층 컬럼이 **없다**(2026-07-16 실측). 상위 그룹은 코드 상수로 관리한다 — 아래 "상위 그룹 (코드 상수)" 참조

---

## 데이터 규칙

### 태그 (celeb_tags)

- `name`: 짧고 인상적인 이름. 명사구 또는 은유적 표현 권장
  - 좋은 예: "정복자", "결핍", "페이팔 마피아", "로마 황제"
  - 나쁜 예: "유명한 로마 시대 황제들 모음"
- `description`: 1~2문장. 운문체/격언체 권장. 설명적이되 건조하지 않게
  - 예: "세계를 발밑에 두고도 지혜에 대한 갈증을 멈추지 않은 자들의 기록."
- `color`: 태그 주제와 어울리는 HEX 색상. 기존 태그 색상과 구별되도록
- `is_featured`: 인물 배정과 description이 모두 완료된 후에 `true`로 전환
- `name_en`, `description_en`: 한국어 작성 후 반드시 영문도 작성

### 배정 (celeb_tag_assignments)

> ⚠ 이 절의 직접 배정은 **영상 없는 태그의 수동 명단에만** 해당한다(26.08.03). 영상(제작) 유래 인물은 `faction_people`이 원천이라 배정 행을 만들지 않는다 — 뷰가 자동으로 싣는다. 제작 유래 인물의 한줄은 직함 첫 항목 고정이며 상세 소개만 `faction_people.web_long_desc`에서 손질한다.

- `short_desc`: 10자 내외 한줄 수식어. 태그 내에서 이 인물의 역할/정체성
  - 예: "공화정을 끝낸 독재관", "원자폭탄의 아버지"
- `long_desc`: 1~2문장 상세 설명. 이 인물이 왜 이 태그에 속하는지
- `sort_order`: 시간순(출생순), 중요도순, 또는 서사 흐름순 중 태그 성격에 맞게 결정
- 태그당 권장 인원: **5~8명**. 최소 3명. 화면 상한은 **40명**(`getFeaturedTags`의 `MAX_CELEBS_PER_TAG`, 16→24→40으로 상향) — 초과분은 세력도감에 안 뜬다. 감추려면 상한이 아니라 숨김(수동 행 `hidden` / 제작 행 `web_hidden`)을 쓴다
- **한 인물이 여러 테마에 드는 것은 정상이다.** 실측 두 테마 13명·세 테마 2명이 이미 그렇게 진열 중이고, 일론 머스크는 다섯 테마에 선다. 겹침을 피하려 인물을 빼지 마라

---

## 프론트엔드 연동

### 페이지

- `/explore/faction` — 세력도감 메인 페이지 (테마 미선택 시 소개 화면)
- `/explore/faction/<slug>` — 테마별 고유 주소. 해당 테마를 펼친 채 진입 (예: `/explore/faction/xai`). slug 미등록 태그는 404
- `/explore/faction?tag=<id>` — 구버전 쿼리 진입(하위호환 유지). 앱 내 테마 변경 시 주소창은 `history.replaceState`로 `/explore/faction/<slug>`로 갱신

### 서버 액션

| 액션 | 파일 | 역할 |
|------|------|------|
| `getFeaturedTags()` | `actions/home/getFeaturedTags.ts` | 태그 + 인물(**뷰 `faction_atlas_members` 직독**, 태그당 최대 40명, `hidden=false`만) + 표시용 프로필 조회. 팩션 대사는 뷰의 `quote/quote_en`만 쓰며 게임용 `celeb_dialogues`는 읽지 않는다. 각 태그에 `isGroup`/`parentSlug`를 붙여 반환. `unstable_cache`(태그: TAGS·CELEBS) |
| `getFactionTagName()` | `actions/home/getFactionTagName.ts` | slug → 테마명 단건 조회(상단 배너 breadcrumb용) |
| `getTagSharedLibrary()` | `actions/home/getTagSharedLibrary.ts` | 태그 내 셀럽 공유 콘텐츠 (2명 이상 겹침, celebCount 내림차순) |
| `getTagChronologicalLibrary()` | `actions/home/getTagChronologicalLibrary.ts` | 태그 내 셀럽 콘텐츠를 출생 연도순 타임라인으로 (셀럽당 최대 4개, `birth_date` 없는 인물은 제외) |

**태그별 인물 수 조회 경로** — web에는 카운트 전용 액션이 **없다**. 화면 숫자는 모두 `getFeaturedTags`가 실어온 `tag.celebs` 배열 길이에서 클라이언트가 센다.

- 개별 테마 카드: `tag.celebs.length` (`FactionIntroView`의 `TagCard`, "N Figures")
- 그룹 헤더: `groupCelebCount()` = 자식 태그들의 `celebs.length` 합 (`factionGrouping.ts`)
- RPC `get_tag_celeb_counts`는 살아 있으나 **백오피스 전용**이다 — `sw/web-bo/src/actions/admin/tags.ts`의 `getTags()`에서만 호출해 관리 목록의 `celeb_count`를 채운다. web 쪽에서 이 RPC를 부르는 코드는 없다

### 컴포넌트

`sw/web/src/components/features/landing/` 전체 7개다(이 디렉토리에 이 외 파일 없음).

| 컴포넌트 | 파일 | 역할 |
|----------|------|------|
| `FeaturedFaction` | `FeaturedFaction.tsx` | 메인 컨테이너. `activeTagIndex` 인덱스 선택 모델(-1 = 컬렉션 화면), 뷰 모드 탭, slug `history.replaceState` 갱신 |
| `FactionIntroView` | `FactionIntroView.tsx` | 컬렉션 화면(테마 미선택). 그룹 섹션 헤더 + 펼치면 자식 카드 그리드, 무소속 테마 카드 그리드 |
| `FactionShowcase` | `FactionShowcase.tsx` | Faction 뷰. **좌측 큰 사진(단체샷 또는 개인샷) + 설명, 우측 세력 장·소속 인물 트리**. 목록은 최대 400px 폭의 스크롤 패널이며 번호·이미지·정보를 분리한다. 단체샷은 큰 장 번호·96px 장표·강조 패널로 하나의 세력 장을 열고, 개인샷은 들여쓰기·연결선·74px 초상으로 그 아래 매달린다. 번호도 `단체 3 → 3-1 → 3-2`처럼 부모를 이어받으며 인원 배지는 단체 행 우측에 둔다. 큰 뷰어의 `현재/전체`는 실제 감상 순서를 나타낸다. PC는 단체샷 캐러셀, 모바일은 높이를 제한한 목록과 `단체샷 → 소속 인물 한 명씩 → 다음 단체샷` 순서의 좌우 이동을 쓴다. 인물 스피커 버튼으로 인사 대사 재생 |
| `SharedLibraryView` | `SharedLibraryView.tsx` | 공유 서재 뷰. 콘텐츠 타입 필터(ALL 기본) |
| `FactionTagDrawerDesktop` | `FactionTagDrawerDesktop.tsx` | 데스크탑 테마 전환 드로어(그룹 헤더 + 자식) |
| `FactionTagSheetMobile` | `FactionTagSheetMobile.tsx` | 모바일 테마 전환 시트 |
| `factionGrouping.ts` | `factionGrouping.ts` | 그룹핑 헬퍼(컴포넌트 아님). `topLevelTags`·`childTags`·`groupPreviewCelebs`·`groupCelebCount` |

> **폐기된 옛 이름** — 과거 문서가 표에 박아둔 `CuratedSpotlightDesktop`·`CuratedSpotlightMobile`·`FeaturedSpotlightDesktop`·`FeaturedSpotlightMobile`·`SpotlightTeamBanner`·`SpotlightHeroImage`는 **저장소에 존재하지 않는다.** 전부 `326146f5`(2026-06-28, "기획전 노출 컴포넌트 단일화")에서 제거되고 그 자리에 `SpotlightShowcase.tsx`(현재는 `FactionShowcase.tsx`로 재개명)가 신설됐다. 대체 관계는 1:1 리네임이 아니라 **다수 → 하나로의 통합**이다:
>
> | 옛 이름 | 실제 |
> |---------|------|
> | `CuratedSpotlightDesktop`(+ `curatedSpotlightDesktop/` 하위 `CelebThumbnails`·`useCuratedSpotlight`) | `FactionShowcase` |
> | `CuratedSpotlightMobile` / `FeaturedSpotlightMobile` / `FeaturedSpotlightDesktop` | `FactionShowcase` (데스크탑·모바일 분리 컴포넌트 자체가 없어짐. 반응형 한 벌로 처리하고, 테마 전환 UI만 드로어/시트로 나뉨) |
> | `SpotlightTeamBanner` (단체 이미지 상단 가로 배너) | `FactionShowcase` 좌측 사진 영역의 단체 항목 (**상단 배너가 아니다**. 여러 장이면 그 자리에서 캐러셀) |
> | `SpotlightHeroImage` (Hero 카드 아래 전용 화보) | `FactionShowcase` 좌측 큰 사진 그 자체 (`faction_image_url ?? avatar_url`. **Hero "아래"가 아니라 Hero 본체**) |
>
> 즉 단체샷·전용 화보를 그리는 별도 컴포넌트는 없다. 이미지 관련 화면 문제는 전부 `FactionShowcase.tsx` 한 곳을 본다.

### 상위 그룹 (`celeb_tags.parent_id`)

**26.07.26부터 DB가 정본이다.** 옛 코드 상수 `sw/web/src/constants/factionGroups.ts`는 삭제됐다.

- SSoT: `celeb_tags.parent_id`(자기참조 FK, `on delete set null`, 인덱스 `idx_celeb_tags_parent_id`). null이면 무소속
- **그룹 헤더는 별도 표식이 아니라 판정 결과다** — 자식을 하나라도 가진 태그가 곧 그룹이다. `getFeaturedTags`가 태그 전량의 `parent_id`를 세어 `isGroup`(자식 보유)·`parentSlug`(부모의 slug)를 붙인다
- 그룹 헤더도 `celeb_tags`의 **일반 태그 1행**이다(배정 0). `getFeaturedTags`는 배정이 없어도 그룹 헤더를 목록에 포함한다
- 26.08.03 DB 실측 그룹 13개: `ai`(11) / `technology-and-science`(9) / `business-and-industry`(11) / `power-and-war`(18) / `thought-and-conviction`(4) / `visual-arts`(3) / `music`(8) / `literature-and-film`(2) / `sports-legends`(3) / `shadow-world`(4) / `special-features`(6) / `myth-and-fiction`(3) / `paths-of-a-life`(4)
- 자식 표시 순서는 `sort_order`다(별도 순서 컬럼 없음). 백필 때 `sort_order`를 그룹 → 그 자식 차례로 0~39 재부여해 옛 상수의 표시 순서를 그대로 옮겼다
- 위계는 **두 단계까지**다. 이미 자식을 가진 태그는 다른 그룹에 들어갈 수 없고, 이미 어딘가에 속한 태그는 부모가 될 수 없다(`updateTag`가 막는다)
- 컬렉션 최상위에는 그룹 헤더와 무소속 태그만 노출한다. 자식은 그룹을 펼쳐야 보인다
- 그룹 추가·이동은 web-bo `/factions/themes/[tagId]`의 「상위 묶음」에서 한다. 새 그룹은 **일반 테마를 만든 뒤 다른 테마들이 그를 상위로 지정하면** 생긴다(그룹 전용 생성 화면 없음)
- 그룹 헤더 slug로 진입하면(예: `/explore/faction/ai`) 개별 테마가 아니므로 컬렉션 화면으로 연다

### 백오피스 관리 (web-bo)

- 관리 화면은 **세력도감 하나로 합쳤다(26.07.25)**. 옛 주소 `/celebs/tags`·`/members/tags`는 `/factions`로 보내는 리다이렉트만 남았고 사이드바 「태그」 항목도 없앴다
  - **`/factions` 는 두 작업 모드다(26.07.29)**. 같은 DB를 읽되 `영상 편`은 `faction_episodes` 한 편을 한 행으로, `도감 테마`는 `celeb_tags` 한 테마를 한 행으로 보여준다. 주소의 `?view=videos|themes`가 현재 관점을 쥐고 기본은 영상 편이다. 모드마다 「새 영상 편」·「새 테마」 조작이 바뀐다
  - **영상 편 모드**: 연결 여부와 무관하게 모든 편이 반드시 한 행씩 보인다. 제목·폴더, 렌더 편성(`registered`·순번), 도감 이관 가능 여부(`ready|blocked`·사유), 세력/인물 수, 연결 테마, 수정일을 한 표에서 확인한다. 전체·렌더 편성·미편성·테마 미연결 필터와 제목/폴더/테마 검색을 제공한다. `ready|blocked`는 영상 제작 진척도가 아니라 **도감으로 옮길 수 있는지**이므로 옛 `준비/작업 중/완료` 의미로 표시하지 않는다
  - **도감 테마 모드**: 열은 테마명(위계)·인물 수·도감 노출·단체샷/개인샷·영상이다. 「영상」 칸에는 그 테마를 세력으로 쓰는 편이 배지로 붙고(복수 가능, 누르면 그 편 편집기로) 없으면 「글 전용」이다. 끌어서 진열 순서를 바꾼다
  - **도감 테마 표 아래 두 구획(26.07.27)**: 「옮길 수 있는 편」(펼침 — 인물이 인명부에 있어 바로 테마로 옮길 수 있다)과 「못 옮기는 편」(접힘 — 출연진이 사람이 아니거나 등록 인물이 셋 미만). 옛 「미연결 영상」·「아이디어 후보」·「접어둠」 세 구획을 이 둘로 합쳤다
  - **묶음은 접힌 채 뜬다**: 소속 테마를 보려면 묶음 줄을 누른다. 편집 화면으로는 줄 오른쪽의 「편집」 단추로 간다(모든 줄이 같은 자리에 같은 단추를 갖는다)
  - **편별 조작의 자리**: 이름 변경·복제·삭제·렌더용 파일 쓰기는 영상 편 모드의 모든 행에 점 셋 메뉴(`variant="menu"`)로 붙는다. 도감 이관 상태·렌더 편성 전환과 같은 조작은 **영상 편집기 상단 조작줄**(`components/factions/FactionEpisodeActions.tsx`, `variant="bar"`)에도 있다. 같은 부품을 두 자리에서 써 기능을 복제하지 않는다
  - **위계 표시(26.07.26)**: 자식을 가진 테마가 「묶음 N」 표식과 함께 머리로 뜨고 소속 테마가 한 칸 들여쓰기로 따라붙는다. 끌어 옮기기는 **같은 층끼리만** 된다(묶음 머리를 끌면 소속 테마가 통째로 따라간다). 다른 묶음으로 옮기는 일은 순서가 아니라 소속이므로 테마 편집 화면의 「상위 묶음」에서 한다
  - `/factions/themes/[tagId]` = 테마 편집(예전 아코디언 한 칸이 화면 한 장이 됐다). 「상위 묶음」 선택지는 무소속 테마 전량 + 「묶음 없음」이다
  - 구성 파일: `app/(admin)/factions/FactionBoard.tsx`(모드 껍데기)·`FactionBoard/sections/{FactionVideoTable,FactionThemeTable}.tsx`·`ThemeFormModal.tsx`·`EpisodeFormModal.tsx`, `app/(admin)/factions/themes/[tagId]/{page,ThemeEditor}.tsx`, 공용 부품 `components/factions/FactionTable.tsx`·`FactionEpisodeActions.tsx`
  - 목록 조회 액션: `actions/admin/factions/themes.ts`(`listFactionThemes`·`getThemeEpisodeLinks`). 테마↔영상 연결의 근거는 `faction_groups.tag_id` 역조회뿐이다
  - **주소(slug)**: 입력 + `name_en` 기반 자동 생성 버튼
  - **단체 이미지**: 다중 업로드(크롭)·삭제·드래그 순서변경
  - **전용 인물 화보**: 셀럽 행마다 1장 업로드·교체·삭제
- 서버 액션: `actions/admin/tags.ts`(`setTagTeamImages`, `setTagCelebImage`, slug 처리), `actions/admin/storage.ts`(`uploadTagTeamImage`/`deleteTagTeamImage`/`uploadTagCelebImage`/`deleteTagCelebImage`)
- 이미지 처리: `lib/image.ts`의 `faction`(1080×1080) 사이즈, `components/ui/ImageCropModal.tsx` 재사용. R2 업로드는 `lib/r2.ts`

### 뷰 모드

탭은 **2개**다 (`ViewMode = "faction" | "library"`).

1. **Faction** (기본) — `FactionShowcase`. 좌측 사진·설명 + 우측 리스트에서 항목을 골라 전환(드래그 아님). 인물 항목은 스피커 버튼으로 인사 대사 재생
2. **Library** — 한 화면에 두 블록을 세로로 쌓는다
   - 함께 본 서재 — 2명 이상이 공통 감상한 콘텐츠. 타입 필터 지원 (`SharedLibraryView`)
   - 인물별 서재 — 출생 연도순 타임라인. 셀럽당 콘텐츠 최대 4개 (`CelebContentTimeline`)

> Timeline은 독립 탭이 아니라 Library 탭 안의 아래쪽 블록이다.

### 타입

`CelebTagInfo`는 `types/home.ts`, `FeaturedTag`·`FeaturedCeleb`는 **`actions/home/getFeaturedTags.ts`**에 있다(`types/home.ts`가 아니다). 둘 다 `actions/home/index.ts`에서 재export한다.

```typescript
// types/home.ts
export interface CelebTagInfo {
  id: string
  name: string
  name_en: string | null
  color: string
  short_desc: string | null   // 태그 부여 사유 (짧은 문구)
  short_desc_en: string | null
  long_desc: string | null    // 태그 부여 상세 설명
  long_desc_en: string | null
}
```

```typescript
// actions/home/getFeaturedTags.ts
export interface FeaturedTag {
  id: string
  name: string
  name_en: string | null
  description: string | null
  description_en: string | null
  color: string
  slug: string | null
  team_images: FactionTeamImage[]  // 사진마다 {url, label?, labelEn?, celebIds?}
  celebs: FeaturedCeleb[]          // 태그당 최대 40명(MAX_CELEBS_PER_TAG)
  is_featured: boolean
  parentSlug?: string | null  // 속한 상위 그룹 slug (최상위면 null)
  isGroup?: boolean           // 그룹 헤더 여부
}

// 독립 인터페이스(CelebProfile 확장 아님). 아래 인물별 필드는 뷰 faction_atlas_members에서 온다(26.08.03 단일화)
export interface FeaturedCeleb {
  // …프로필·대사 필드 생략…
  short_desc: string | null
  short_desc_en: string | null
  long_desc: string | null
  long_desc_en: string | null
  faction_image_url: string | null
  faction_quote: string | null     // 세력도감 영상에서 이 인물이 하는 말 — 원천은 faction_people.quote
  faction_quote_en: string | null
}
```

---

## 태그 생성 절차

### 1단계: 태그 생성

```sql
INSERT INTO celeb_tags (name, name_en, description, description_en, color, sort_order, is_featured)
VALUES (
  '태그명',
  'Tag Name',
  '태그 설명. 운문체 권장.',
  'Tag description in English.',
  '#HEX색상',
  (SELECT COALESCE(MAX(sort_order), -1) + 1 FROM celeb_tags),  -- 자동 다음 순서
  false  -- 배정 완료 전까지 false 유지
)
RETURNING id, name;
```

### 2단계: 인물 확인

태그에 배정할 인물이 DB에 등록되어 있는지 확인한다.

> ⚠️ `status='inactive'` 를 걸러내지 마라 — 도감은 26.07.27부터 그 값을 보지 않는다(개편 ①). 목록에서 빠지는 기준은 **등급**(`celeb_tier` 가 full·light가 아닐 때)과 **배정의 `hidden`** 둘뿐이다.

```sql
SELECT id, nickname, nickname_en, status, celeb_tier
FROM profiles
WHERE nickname IN ('인물1', '인물2', ...)
   OR nickname_en ILIKE ANY(ARRAY['%Name1%', '%Name2%', ...])
ORDER BY nickname;
```

- DB 미등록 인물: `celeb-creation-rulebook` 에이전트로 먼저 등록
- `status = 'inactive'`인 인물도 태그 배정 가능하고 **실제로 도감에 노출된다**(26.07.27 이전에는 문서만 그렇게 적혀 있고 코드는 걸러냈다 — 그 게이트를 걷어냈다)

### 3단계: 인물 배정

> ⚠ 이 INSERT는 **영상 없는 태그의 수동 명단에만** 쓴다(26.08.03). 영상(제작) 유래 인물은 배정을 만들지 않는다 — `faction_people`이 원천이고 뷰가 자동으로 싣는다.

```sql
INSERT INTO celeb_tag_assignments (tag_id, celeb_id, short_desc, long_desc, sort_order)
VALUES
  ('태그ID', '셀럽ID', '한줄 수식어', '상세 설명 1~2문장', 0),
  ('태그ID', '셀럽ID', '한줄 수식어', '상세 설명 1~2문장', 1),
  ...
RETURNING celeb_id, short_desc;
```

**sort_order 기준**:
- 역사 그룹 태그 → 출생순 (birth_date 오름차순)
- 테마 태그 → 대중 인지도순 또는 서사 흐름순
- 현대 그룹 태그 → 기여도/중요도순

### 4단계: 검증

```sql
-- 태그별 인물 현황 확인 — 조회는 뷰로 한다(제작 유래 + 수동 배정 합산)
SELECT t.name, p.nickname, a.short_desc, a.long_desc, a.source
FROM faction_atlas_members a
JOIN celeb_tags t ON t.id = a.tag_id
JOIN profiles p ON p.id = a.celeb_id
WHERE t.id = '태그ID'
ORDER BY a.sort_order;
```

### 5단계: 활성화

수동 명단이라면 모든 인물의 short_desc, long_desc를 채운 뒤 태그를 활성화한다. 제작 명단의 short_desc는 직함 첫 항목에서 자동으로 온다.

```sql
UPDATE celeb_tags SET is_featured = true WHERE id = '태그ID';
```

### 6단계: 영문 번역 (선택)

```sql
-- 수동 행 전용. 제작 유래 인물은 직함 첫 영문 항목 + faction_people.web_long_desc_en을 쓴다
UPDATE celeb_tag_assignments SET
  short_desc_en = 'English short desc',
  long_desc_en = 'English long desc'
WHERE tag_id = '태그ID' AND celeb_id = '셀럽ID';
```

---

## 체크리스트

새 태그 생성 시 아래 항목을 모두 확인한다.

- [ ] `celeb_tags` INSERT 완료 (name, name_en, description, description_en, color)
- [ ] 후보 인물 전원 `profiles` 테이블에 등록 확인
- [ ] 인물 채움 확인 — 영상 유래는 제작(`faction_people`)에서 자동, 수동 명단만 `celeb_tag_assignments` INSERT (전원 short_desc, long_desc 작성)
- [ ] sort_order 정렬 기준 결정 및 적용
- [ ] 기존 태그 색상과 중복되지 않는 color 확인
- [ ] 인원 5~8명 범위 확인
- [ ] `is_featured = true` 전환
- [ ] (선택) 영문 번역 (short_desc_en, long_desc_en)

---

## 참고

- **Supabase 프로젝트 ID**: `wouqtpvfctednlffross`
- **태그 아이디어 후보**: `docs/todo/faction/tag-ideas.md`
- **세력도감 페이지**: `sw/web/src/app/[locale]/(main)/explore/faction/page.tsx`, 테마별 주소는 `.../faction/[slug]/page.tsx`(미등록 slug는 `notFound()`)
- **getFeaturedTags 액션**: `sw/web/src/actions/home/getFeaturedTags.ts` (`FeaturedTag`·`FeaturedCeleb` 타입도 여기)
- **상위 그룹 SSoT**: `celeb_tags.parent_id` (DB). 편집 화면은 web-bo `/factions/themes/[tagId]`
- **그룹핑 헬퍼**: `sw/web/src/components/features/landing/factionGrouping.ts`
- **팩션(영상 시리즈) 인물 반영·이미지 3종(아바타·개인샷·그룹샷)·상위 그룹·캐시 무효화**: 스킬 `faction-celeb-sync` (`.agents/skills/faction-celeb-sync/SKILL.md`). 상위 그룹 개편 기록은 `docs/project/faction-ai-group-refactor.md`.
