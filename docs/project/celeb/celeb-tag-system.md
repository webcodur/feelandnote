# 셀럽 태그 시스템

스포트라이트 기획전에 사용되는 셀럽 태그의 DB 구조, 데이터 흐름, 생성 절차를 정의한다.

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
| `sort_order` | integer | - | `0` | 태그 목록 정렬 순서 (낮을수록 먼저) |
| `is_featured` | boolean | - | `false` | `true`면 스포트라이트에 노출, `false`면 예고편(Soon) 표시 |
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
| `sort_order` | integer | - | `0` | 태그 내 인물 정렬 순서 (낮을수록 먼저) |
| `assigned_at` | timestamptz | - | `now()` | 배정 시각 |

### 관계

```
celeb_tags (1) ──< celeb_tag_assignments (N) >── profiles (1)
```

- 1개 태그에 여러 셀럽 배정 가능
- 1개 셀럽이 여러 태그에 소속 가능
- `short_desc`/`long_desc`는 **태그-셀럽 관계별**로 다름 (같은 인물이라도 태그마다 다른 설명)

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
- 태그당 권장 인원: **5~8명**. 최소 3명, 최대 8명 (UI 제약)

---

## 프론트엔드 연동

### 페이지

`/explore/spotlight` — 스포트라이트 메인 페이지

### 서버 액션

| 액션 | 파일 | 역할 |
|------|------|------|
| `getFeaturedTags()` | `actions/home/getFeaturedTags.ts` | 태그 + 셀럽 8명 + 프로필·팔로워·영향력·대사 병렬 조회 |
| `getTagSharedLibrary()` | `actions/home/getTagSharedLibrary.ts` | 태그 내 셀럽 공유 콘텐츠 (2명 이상 겹침) |
| `getTagChronologicalLibrary()` | `actions/home/getTagChronologicalLibrary.ts` | 태그 내 셀럽 콘텐츠를 출생 연도순 타임라인으로 |
| `getTagCounts()` | `actions/home/getTagCounts.ts` | 태그별 셀럽 수 (RPC `get_tag_celeb_counts`) |

### 컴포넌트

| 컴포넌트 | 파일 | 역할 |
|----------|------|------|
| `FeaturedSpotlight` | `components/features/landing/FeaturedSpotlight.tsx` | 메인 컨테이너. 태그 선택 + 3가지 뷰 모드 |
| `CuratedSpotlightDesktop` | `components/features/landing/CuratedSpotlightDesktop.tsx` | Spotlight 뷰 (Hero Card + 드래그) |
| `CuratedSpotlightMobile` | `components/features/landing/FeaturedSpotlightMobile.tsx` | 모바일 Spotlight 뷰 |
| `SharedLibraryView` | `components/features/landing/SharedLibraryView.tsx` | 공유 서재 뷰 |

### 뷰 모드

1. **Spotlight** (기본) — 셀럽 카드 + 인사 대사. 드래그로 인물 전환
2. **Shared Library** — 2명 이상이 공통 감상한 콘텐츠. 타입 필터 지원
3. **Timeline** — 출생 연도순 정렬. 셀럽당 콘텐츠 최대 4개

### 타입

```typescript
// types/home.ts
interface CelebTagInfo {
  id: string
  name: string
  color: string
  short_desc: string | null
  long_desc: string | null
}

interface FeaturedTag {
  id: string
  name: string
  description: string | null
  color: string
  celebs: FeaturedCeleb[]  // 최대 8명
  is_featured: boolean
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
- `status = 'inactive'`인 인물도 태그 배정 가능 (스포트라이트에 정상 노출됨)

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
- **스포트라이트 페이지**: `sw/web/src/app/[locale]/(main)/explore/spotlight/page.tsx`
- **getFeaturedTags 액션**: `sw/web/src/actions/home/getFeaturedTags.ts`
