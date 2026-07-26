# 부록 A. 세력도감 태그

> **최종 실측 체크: 26.07.16** — DB 스키마(`celeb_tags`·`celeb_tag_assignments` 컬럼 전수), 서버 액션 4종, `components/features/landing/` 컴포넌트 7종, 타입 정의, 페이지 라우트, 백오피스 경로를 코드·DB와 대조해 교정.

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
| `team_images` | jsonb | ✅ | `[]` | 단체 이미지 URL 배열(표시 순서대로). NOT NULL. 쇼케이스 좌측 사진 영역에 단체 항목으로 노출(여러 장이면 캐러셀). R2: `spotlight/{tagId}/team/{uuid}.webp`(물리 명칭은 옛 이름 유지) |
| `sort_order` | integer | - | `0` | 태그 목록 정렬 순서 (낮을수록 먼저) |
| `is_featured` | boolean | - | `false` | `true`면 세력도감에 노출, `false`면 예고편(Soon) 표시 |
| `start_date` | date | - | - | 기간 한정 태그 시작일 (미사용) |
| `end_date` | date | - | - | 기간 한정 태그 종료일 (미사용) |
| `created_at` | timestamptz | - | `now()` | 생성 시각 |
| `updated_at` | timestamptz | - | `now()` | 수정 시각 |

### celeb_tag_assignments (셀럽-태그 매핑)

| 컬럼 | 타입 | 필수 | 기본값 | 설명 |
|------|------|:----:|--------|------|
| `id` | uuid | ✅ | `gen_random_uuid()` | PK |
| `tag_id` | uuid | ✅ | - | FK → `celeb_tags.id` |
| `celeb_id` | uuid | ✅ | - | FK → `profiles.id` |
| `short_desc` | text | - | - | 이 태그에서 이 인물의 한줄 소개 (한국어) |
| `short_desc_en` | text | - | - | 한줄 소개 (영문) |
| `long_desc` | text | - | - | 이 태그에서 이 인물의 상세 설명 (한국어, 1~2문장) |
| `long_desc_en` | text | - | - | 상세 설명 (영문) |
| `spotlight_image_url`(물리 명칭은 옛 이름 유지) | text | - | - | 이 태그 전용 인물 화보 1장 URL. 쇼케이스 좌측 큰 사진(Hero)의 소스. 없으면 `profiles.avatar_url`로 폴백(= 얼굴 크롭이 Hero에 뜬다). R2: `spotlight/{tagId}/celeb-{celebId}.webp` |
| `sort_order` | integer | - | `0` | 태그 내 인물 정렬 순서 (낮을수록 먼저) |
| `assigned_at` | timestamptz | - | `now()` | 배정 시각 |

### 관계

```
celeb_tags (1) ──< celeb_tag_assignments (N) >── profiles (1)
```

- 1개 태그에 여러 셀럽 배정 가능
- 1개 셀럽이 여러 태그에 소속 가능
- `short_desc`/`long_desc`는 **태그-셀럽 관계별**로 다름 (같은 인물이라도 태그마다 다른 설명)
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

- `short_desc`: 10자 내외 한줄 수식어. 태그 내에서 이 인물의 역할/정체성
  - 예: "공화정을 끝낸 독재관", "원자폭탄의 아버지"
- `long_desc`: 1~2문장 상세 설명. 이 인물이 왜 이 태그에 속하는지
- `sort_order`: 시간순(출생순), 중요도순, 또는 서사 흐름순 중 태그 성격에 맞게 결정
- 태그당 권장 인원: **5~8명**. 최소 3명. 화면 상한은 **16명** (`getFeaturedTags`의 `assignments.slice(0, 16)`) — 초과 배정분은 세력도감에 안 뜬다

---

## 프론트엔드 연동

### 페이지

- `/explore/faction` — 세력도감 메인 페이지 (테마 미선택 시 소개 화면)
- `/explore/faction/<slug>` — 테마별 고유 주소. 해당 테마를 펼친 채 진입 (예: `/explore/faction/xai`). slug 미등록 태그는 404
- `/explore/faction?tag=<id>` — 구버전 쿼리 진입(하위호환 유지). 앱 내 테마 변경 시 주소창은 `history.replaceState`로 `/explore/faction/<slug>`로 갱신

### 서버 액션

| 액션 | 파일 | 역할 |
|------|------|------|
| `getFeaturedTags()` | `actions/home/getFeaturedTags.ts` | 태그 + 배정 셀럽(태그당 최대 16명) + 프로필·팔로워·영향력·콘텐츠 수·대사 병렬 조회. 각 태그에 `isGroup`/`parentSlug`를 붙여 반환. `unstable_cache`(태그: TAGS·CELEBS·CONTENTS·DIALOGUES) |
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
| `FactionShowcase` | `FactionShowcase.tsx` | Faction 뷰. **좌측 큰 사진(단체샷 또는 개인샷) + 설명, 우측 단체·인물 리스트**. 단체샷 여러 장이면 좌측에서 캐러셀. 인물 스피커 버튼으로 인사 대사 재생 |
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
> | `SpotlightHeroImage` (Hero 카드 아래 전용 화보) | `FactionShowcase` 좌측 큰 사진 그 자체 (`spotlight_image_url ?? avatar_url`. **Hero "아래"가 아니라 Hero 본체**) |
>
> 즉 단체샷·전용 화보를 그리는 별도 컴포넌트는 없다. 이미지 관련 화면 문제는 전부 `FactionShowcase.tsx` 한 곳을 본다.

### 상위 그룹 (`celeb_tags.parent_id`)

**26.07.26부터 DB가 정본이다.** 옛 코드 상수 `sw/web/src/constants/factionGroups.ts`는 삭제됐다.

- SSoT: `celeb_tags.parent_id`(자기참조 FK, `on delete set null`, 인덱스 `idx_celeb_tags_parent_id`). null이면 무소속
- **그룹 헤더는 별도 표식이 아니라 판정 결과다** — 자식을 하나라도 가진 태그가 곧 그룹이다. `getFeaturedTags`가 태그 전량의 `parent_id`를 세어 `isGroup`(자식 보유)·`parentSlug`(부모의 slug)를 붙인다
- 그룹 헤더도 `celeb_tags`의 **일반 태그 1행**이다(배정 0). `getFeaturedTags`는 배정이 없어도 그룹 헤더를 목록에 포함한다
- 현재 그룹 8개: `ai`(자식 11) / `rulers-and-empires`(4) / `heroes-of-turbulent-times`(2) / `the-thinkers`(2) / `revolutions-and-founding`(3) / `art-movements`(4) / `self-made-innovators`(3) / `against-adversity`(2). 무소속은 `manhattan-project` 하나
- 자식 표시 순서는 `sort_order`다(별도 순서 컬럼 없음). 백필 때 `sort_order`를 그룹 → 그 자식 차례로 0~39 재부여해 옛 상수의 표시 순서를 그대로 옮겼다
- 위계는 **두 단계까지**다. 이미 자식을 가진 태그는 다른 그룹에 들어갈 수 없고, 이미 어딘가에 속한 태그는 부모가 될 수 없다(`updateTag`가 막는다)
- 컬렉션 최상위에는 그룹 헤더와 무소속 태그만 노출한다. 자식은 그룹을 펼쳐야 보인다
- 그룹 추가·이동은 web-bo `/factions/themes/[tagId]`의 「상위 묶음」에서 한다. 새 그룹은 **일반 테마를 만든 뒤 다른 테마들이 그를 상위로 지정하면** 생긴다(그룹 전용 생성 화면 없음)
- 그룹 헤더 slug로 진입하면(예: `/explore/faction/ai`) 개별 테마가 아니므로 컬렉션 화면으로 연다

### 백오피스 관리 (web-bo)

- 관리 화면은 **세력도 하나로 합쳤다(26.07.25)**. 옛 주소 `/celebs/tags`·`/members/tags`는 `/factions`로 보내는 리다이렉트만 남았고 사이드바 「태그」 항목도 없앴다
  - **`/factions` 는 표 하나다(26.07.26 완전 병합)**. 기준은 도감 테마(`celeb_tags` 40종)이고 열은 테마명(위계)·인물 수·도감 노출·단체샷/개인샷·**영상**·순서. 「영상」 칸에는 그 테마를 세력으로 쓰는 편이 배지로 붙고(복수 가능, 누르면 그 편 편집기로) 없으면 「글 전용」이다. 끌어서 진열 순서를 바꾼다. 「새 영상 편」·「새 테마」 단추는 표 머리 오른쪽에 나란히 있다
  - **미연결 영상**: 어느 테마에도 안 걸린 편은 같은 표 맨 아래 구분 줄(묶음 머리와 같은 문법) 밑에 모인다. 열은 제목·상태·인물 수·세력 수·렌더 편성이고, 줄 끝 점 셋 메뉴로 이름 바꾸기·복제·지우기·렌더용 파일 쓰기를 한다
  - **편별 조작의 자리**: 상태·렌더 편성·내보내기·이름 변경·복제·삭제는 **영상 편집기 상단 조작줄**에 있다(`components/factions/FactionEpisodeActions.tsx`, `variant="bar"`). 목록이 테마 기준으로 합쳐지면서 연결된 편은 목록에 줄이 없기 때문이다. 같은 부품이 미연결 영상 줄의 점 셋 메뉴(`variant="menu"`)도 그린다 — 기능이 두 벌로 갈라지지 않게
  - **위계 표시(26.07.26)**: 자식을 가진 테마가 「묶음 N」 표식과 함께 머리로 뜨고 소속 테마가 한 칸 들여쓰기로 따라붙는다. 끌어 옮기기는 **같은 층끼리만** 된다(묶음 머리를 끌면 소속 테마가 통째로 따라간다). 다른 묶음으로 옮기는 일은 순서가 아니라 소속이므로 테마 편집 화면의 「상위 묶음」에서 한다
  - `/factions/themes/[tagId]` = 테마 편집(예전 아코디언 한 칸이 화면 한 장이 됐다). 「상위 묶음」 선택지는 무소속 테마 전량 + 「묶음 없음」이다
  - 구성 파일: `app/(admin)/factions/FactionBoard.tsx`(표 본체)·`ThemeFormModal.tsx`·`EpisodeFormModal.tsx`, `app/(admin)/factions/themes/[tagId]/{page,ThemeEditor}.tsx`, 공용 부품 `components/factions/FactionTable.tsx`·`FactionEpisodeActions.tsx`
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
  team_images: string[]     // 단체 이미지 URL 배열
  celebs: FeaturedCeleb[]   // 태그당 최대 16명
  is_featured: boolean
  parentSlug?: string | null  // 속한 상위 그룹 slug (최상위면 null)
  isGroup?: boolean           // 그룹 헤더 여부
}

// CelebProfile 확장 — 배정 행(celeb_tag_assignments)에서 온 필드가 붙는다
export type FeaturedCeleb = CelebProfile & {
  short_desc: string | null
  short_desc_en: string | null
  long_desc: string | null
  long_desc_en: string | null
  spotlight_image_url: string | null
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

```sql
SELECT id, nickname, nickname_en, status, celeb_tier
FROM profiles
WHERE nickname IN ('인물1', '인물2', ...)
   OR nickname_en ILIKE ANY(ARRAY['%Name1%', '%Name2%', ...])
ORDER BY nickname;
```

- DB 미등록 인물: `celeb-creation-rulebook` 에이전트로 먼저 등록
- `status = 'inactive'`인 인물도 태그 배정 가능 (세력도감에 정상 노출됨)

### 3단계: 인물 배정

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
-- 태그별 배정 현황 확인
SELECT t.name, p.nickname, a.short_desc, a.long_desc
FROM celeb_tag_assignments a
JOIN celeb_tags t ON t.id = a.tag_id
JOIN profiles p ON p.id = a.celeb_id
WHERE t.id = '태그ID'
ORDER BY a.sort_order;
```

### 5단계: 활성화

모든 인물의 short_desc, long_desc가 채워졌으면 태그를 활성화한다.

```sql
UPDATE celeb_tags SET is_featured = true WHERE id = '태그ID';
```

### 6단계: 영문 번역 (선택)

```sql
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
- [ ] `celeb_tag_assignments` INSERT 완료 (전원 short_desc, long_desc 작성)
- [ ] sort_order 정렬 기준 결정 및 적용
- [ ] 기존 태그 색상과 중복되지 않는 color 확인
- [ ] 인원 5~8명 범위 확인
- [ ] `is_featured = true` 전환
- [ ] (선택) 영문 번역 (short_desc_en, long_desc_en)

---

## 참고

- **Supabase 프로젝트 ID**: `wouqtpvfctednlffross`
- **태그 아이디어 후보**: `docs/todo/tag-ideas.md`
- **세력도감 페이지**: `sw/web/src/app/[locale]/(main)/explore/faction/page.tsx`, 테마별 주소는 `.../faction/[slug]/page.tsx`(미등록 slug는 `notFound()`)
- **getFeaturedTags 액션**: `sw/web/src/actions/home/getFeaturedTags.ts` (`FeaturedTag`·`FeaturedCeleb` 타입도 여기)
- **상위 그룹 SSoT**: `celeb_tags.parent_id` (DB). 편집 화면은 web-bo `/factions/themes/[tagId]`
- **그룹핑 헬퍼**: `sw/web/src/components/features/landing/factionGrouping.ts`
- **팩션(영상 시리즈) 인물 반영·이미지 3종(아바타·개인샷·그룹샷)·상위 그룹·캐시 무효화**: 스킬 `faction-celeb-sync` (`.agents/skills/faction-celeb-sync/SKILL.md`). 상위 그룹 개편 기록은 `docs/project/faction-ai-group-refactor.md`.
