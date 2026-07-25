# 세력도감 「AI」 상위 그룹 개편 계획서

> ⚠️ **이 문서는 상수 시대의 기록이다(26.07.26 기준 낡음).** 상위 그룹 계층은 26.07.26에 DB 컬럼 `celeb_tags.parent_id`로 승격했고 `sw/web/src/constants/factionGroups.ts`는 삭제됐다. 아래 "코드 상수가 정본"이라는 서술은 전부 그 시점 이전의 사실이다. 현행 규격은 `docs/project/celeb/celeb-tag-system.md`의 「상위 그룹」 절을 본다.

> **최종 실측 체크: 26.07.16** — 실 DB로 `celeb_tags` 전량(40행) 대조: `parent_id` 컬럼 부재·그룹 헤더 8행(sort 1~8, 배정 0명)·맨해튼 단독(sort 9)·`mapping-ai` 삭제·`Mistral` 개명 모두 확인. `constants/factionGroups.ts` 그룹 8개·자식 구성 대조. **구현 서술은 코드·DB와 일치**하며, 낡은 것은 아래 "스키마 변경 권한" 배경 서술 하나였다(교정함). UI 3곳 렌더 동작은 화면으로 확인하지 않았다.

/explore/faction 태그 목록을 계층화하고, AI 회사 태그를 상위 그룹 하나로 묶는다. 겸사겸사 세력도감 AI 태그 인물을 faction(영상 시리즈) 최신 로스터에 맞춰 보강하고 faction(영상 시리즈) 쪽 결손을 메운다.

작성 2026-07-05. 상태: **구현 완료** (아래 "진행 결과" 참조).

## 진행 결과 (2026-07-05)

구현 당시 Supabase 스키마 변경 권한(MCP·관리 토큰)이 막혔다고 판단해 `parent_id` 컬럼 방식(후보 A) 대신 **코드 상수 방식**으로 구현했다. 그룹 소속은 `sw/web/src/constants/factionGroups.ts`가 단일원천이며, 그룹 헤더는 `celeb_tags`에 일반 태그 행으로 존재한다.

> **정정(2026-07-16)**: 위 "권한이 막혔다"는 전제는 **더 이상 사실이 아니다.** 이 시점에 DDL이 정상 동작한다(마이그레이션 `drop_unused_remotion_images_and_dialogue_backup`(20260715171752)로 테이블 2개 DROP 성공). 따라서 코드 상수 방식을 강제하던 제약은 해소됐고, `parent_id` 컬럼 이관은 **재검토 여지 있음**이다. 다만 이관 여부는 판단 사항이라 여기서 결정하지 않는다(코드 상수 방식도 정상 동작 중이며, 실익·이관 비용은 별도 검토 대상). 현재 정본은 여전히 `factionGroups.ts`다.

- **DB(REST)**: AI 그룹 + 7개 그룹 태그(제국과 군주·난세의 영웅·사상의 계보·혁명과 건국·예술의 시대·자수성가와 혁신·시련을 넘어) 생성. `mapping-ai` 삭제. `Mistral AI`→`Mistral`. faction(영상 시리즈) 20명 세력도감 태그 배정. 최상위 정렬 = 그룹 8개(sort 1~8) + 맨해튼 단독(9).
- **그룹 구성**: AI(11)/제국과 군주(4)/난세의 영웅(2)/사상의 계보(2)/혁명과 건국(3)/예술의 시대(4)/자수성가와 혁신(3)/시련을 넘어(2), 맨해튼 단독.
- **코드**: `getFeaturedTags`가 그룹 헤더를 포함하고 자식에 `parentSlug` 부착. 공용 유틸 `factionGrouping.ts`.
- **디자인(섹션 헤더형)**: 컬렉션(`FactionIntroView`)은 그룹을 전체폭 구분 헤더 + 펼치면 자식 카드 그리드로 렌더(여러 그룹 동시 펼침, AI 기본 펼침). 드로어·시트도 그룹 헤더 톤 통일. 최상위엔 그룹·무소속만, 하위는 펼쳐야 노출.
- **검증**: `tsc --noEmit` 통과. eslint `set-state-in-effect` 경고는 원본·프로젝트 전반 기존 패턴이라 미변경.
- **백오피스**: 코드 상수 방식이라 그룹 편집은 상수 파일 수정으로 대체(관리 화면 변경 없음).

---

### (원안) 상태: 승인 대기

---

## 1. 배경 · 문제

- 현행 `celeb_tags`는 **완전 평면**이다. 계층(부모-자식) 컬럼이 없고 `sort_order` 정수 하나로만 순서가 정해진다.
- AI 회사 태그 11개(OpenAI·Anthropic·Google DeepMind·xAI·Meta·Mistral AI·Hugging Face·DeepSeek·Thinking Machines·SSI·AI 선구자들, `sort_order` 27~37)가 역사·문화 테마 태그와 같은 평면에 나열돼, 컬렉션 화면(`FactionIntroView`의 4열 그리드)이 AI 카드로 뒤덮여 산만하다.
- `AI의 지도를 그리다`(slug `mapping-ai`, sort 1)는 예전 태그로 삭제 대상이다.
- 세력도감 AI 태그의 배정 인물이 faction(영상 시리즈)「AI-Supremacy」로스터보다 뒤처져 있다. faction엔 있는데 태그엔 없는 인물이 **20명**이다.
- faction(영상 시리즈) 쪽은 Hugging Face 세력만 미완이다: 팀 3명 중 2명이 비활성(disabled), 22개 세력 중 유일하게 단체사진이 비어 있다.

---

## 2. 목표

1. `celeb_tags`에 계층 개념을 최소 침습으로 도입하고, AI 회사 태그 11개를 상위 그룹 「AI」 하나로 묶는다.
2. `mapping-ai` 태그를 삭제한다.
3. 세력도감 목록 UI를 「그룹 카드 접기 → 펼치면 자식 태그」 2단 구조로 개편한다.
4. faction(영상 시리즈)의 20명을 세력도감 AI 태그에 반영(DB 보강)한다.
5. faction Hugging Face 세력을 정상화한다(2명 활성화 + 단체사진 + 잔재 정리).

---

## 3. 설계

### 3-1. DB 스키마 — 자기참조 `parent_id` (후보 A, 최소 침습)

`celeb_tags`에 컬럼 하나만 추가한다.

```sql
ALTER TABLE celeb_tags
  ADD COLUMN parent_id uuid NULL REFERENCES celeb_tags(id) ON DELETE SET NULL;
```

- 그룹 「AI」를 `celeb_tags`에 **1행 생성**한다(셀럽 미배정, 헤더 역할). name=`AI`, name_en=`AI`, slug=`ai`, 대표 색 지정.
- AI 회사 태그 11개의 `parent_id`를 그 행 id로 지정한다.
- 그룹도 하나의 태그 행이므로 기존 name/description/color/slug/team_images/is_featured/sort_order·백오피스 폼·정렬 파이프라인을 100% 재활용한다.
- 대안(그룹 텍스트 컬럼 B / 별도 테이블 C)은 각각 메타 관리 애매·오버엔지니어링이라 기각.

### 3-2. 조회 로직 — `getFeaturedTags`

- `select`에 `parent_id` 추가, `FeaturedTagRow`·`FeaturedTag` 타입에 `parent_id: string | null` 추가.
- 반환은 **평면 배열 유지 + 각 태그에 `parent_id` 부착**을 기본으로 한다(UI에서 그룹핑). 그룹 행 자신도 배열에 포함하되 `celebs`는 비어 있다.
- `getTagSharedLibrary`·`getTagChronologicalLibrary`는 자식 태그 단위로 그대로 동작(그룹은 목록만 묶고 콘텐츠는 자식 단위 유지) → 변경 없음.

### 3-3. 목록 UI — 그룹 카드 접기/펼치기 (3곳)

**핵심 원칙(불변)**: 컬렉션 최상위에는 **그룹(AI)과 부모 없는 태그만** 노출한다. AI 하위 태그(OpenAI·Anthropic 등)는 **최상위 그리드에 직접 나타나지 않는다.** 「AI」그룹을 펼쳤을 때만 자식이 보인다. 허용 상태는 "상위 그룹만 보임" 또는 "상위 그룹 + (펼친) 하위 보임" 둘뿐이고, "하위만 보임"은 금지다.

「AI」그룹은 컬렉션에서 카드 1개로 접혀 보이고, 클릭하면 자식 11개가 펼쳐진다. URL은 자식 태그 slug를 그대로 쓴다(그룹 전용 URL 미부여).

- `FactionIntroView.tsx` (주 그리드, `:60-61`): 부모 없는 태그 + 그룹 카드를 먼저 렌더, 그룹 카드 클릭 시 자식 11개 인라인 확장.
- `FactionTagDrawerDesktop.tsx` (`:86-87`): 그룹 헤더 + 자식 들여쓰기.
- `FactionTagSheetMobile.tsx` (`:93-94`): 동일.
- `FeaturedFaction.tsx`: 현재 `activeTagIndex`(number) 인덱스 선택 모델. 그룹 행이 배열에 섞이므로 **평탄화 인덱스 유지**(그룹 행은 선택 대상에서 제외, 자식만 선택 가능)로 최소 변경. slug replaceState 로직은 자식 slug 유지라 그대로.

### 3-4. faction(영상 시리즈) 인물 → 세력도감 태그 보강 (20명)

faction「AI-Supremacy」에 있고 태그엔 없는 20명을 `celeb_tag_assignments`에 추가한다. 배정 시 `short_desc`/`long_desc`는 faction-data.json의 인물 직함·소개에서 초안 생성 후 검수.

| 태그 | 추가 인물(slug) |
|------|------|
| AI 선구자들 | warren-mcculloch, walter-pitts, frank-rosenblatt, jurgen-schmidhuber, sepp-hochreiter, alex-graves, alex-krizhevsky, fei-fei-li, olga-russakovsky (9) |
| Google DeepMind | shane-legg, quoc-le, pushmeet-kohli (3) |
| OpenAI | noam-brown, sebastien-bubeck (2) |
| Anthropic | ben-mann, mike-krieger (2) |
| Meta | yang-song, jason-wei (2) |
| Thinking Machines | soumith-chintala, lilian-weng (2) |

> 전제: 20명이 `profiles` 테이블에 이미 등록돼 있어야 배정 가능하다. Phase 1 착수 시 slug 존재 여부를 먼저 확인하고, 미등록자는 등록 여부를 별도 결정한다(과거 faction 전원 DB 동기화 이력 있음).

### 3-5. 백오피스 — 부모 지정

- `web-bo .../members/tags/TagFormModal.tsx`: 부모 태그 선택 드롭다운 추가(없음=최상위).
- `TagList.tsx`: 그룹 중첩 표시.
- `actions/admin/tags.ts`: `CelebTag` 타입·create/update payload에 `parent_id` 반영.

### 3-6. faction Hugging Face 정상화

- 팀 2명(julien-chaumond·thomas-wolf) `disabled` 해제.
- 클레망 들랑그 개인샷 정리(현재 가공 전 mp4 경로).
- 단체사진(cluster.image) 채우기 — **이미지 생성은 유료라 별도 승인 필요**(아래 결정거리 D).
- `_inactiveGroups`의 빈 껍데기 2개("Hugging Face", "자유진영") 제거.

---

## 4. Phase 분할 (각 Phase 완료·검증 후 다음)

| Phase | 범위 | 검증 |
|------|------|------|
| 1 | DB: `parent_id` 컬럼 + 「AI」그룹 생성 + mapping-ai 삭제 + 11개 태그 부모 연결 + 20명 태그 보강 | REST 재조회로 계층·배정 확인 |
| 2 | `getFeaturedTags` + 타입에 parent_id 반영, supabase 타입 재생성 | `tsc --noEmit` |
| 3 | 목록 UI 3곳 그룹 접기/펼침 + FeaturedFaction 선택 모델 | `tsc`·`eslint`, dev 화면 |
| 4 | 백오피스 태그 폼 부모 지정 + TagList 중첩 | `tsc`·`eslint` |
| 5 | faction Hugging Face 정상화(활성화·잔재정리·단체사진) | 편집 화면 |

DB 변경(Phase 1)은 되돌리기 번거로우니 착수 직전 한 번 더 확인한다.

---

## 5. 결정거리 (승인 시 함께 확정)

- **A. AI 선구자들 태그를 「AI」그룹에 포함?** — 제안: 포함(faction F01 선구자들과 대응하는 인물사 태그). 회사가 아니라 인물사라 그룹 밖에 두는 선택지도 있음.
- **B. Mistral AI → Mistral 이름 정리?** — 제안: 정리. 그룹 라벨이 「AI」라 자식 이름의 꼬리 AI가 중복. 단 OpenAI·xAI는 고유명에 AI가 박혀 있어 유지.
- **C. 그룹 카드 클릭 UX** — 제안: 인라인 확장(URL 자식 slug 유지). 그룹 전용 페이지(`/explore/faction/ai`)는 필요 시 후속.
- **D. Hugging Face 단체사진** — (1) 새 이미지 생성(유료 승인 필요) / (2) 기존 개인샷 조합 / (3) 보류. 제안 미정, 사장님 결정 필요.
- **E. 20명 중 profiles 미등록자 처리** — Phase 1에서 확인 후, 미등록 시 등록할지 스킵할지.

---

## 6. 참조

- 태그 시스템 SSoT: `docs/project/celeb/celeb-tag-system.md`
- 조회 액션: `sw/web/src/actions/home/getFeaturedTags.ts`
- 목록 UI: `sw/web/src/components/features/landing/{FactionIntroView,FactionTagDrawerDesktop,FactionTagSheetMobile,FeaturedFaction}.tsx`
- 백오피스: `sw/web-bo/src/app/(admin)/factions/`(테마 목록·편집. 26.07.25에 `members/tags/`에서 이관), `sw/web-bo/src/actions/admin/tags.ts`
- faction 데이터: `sw/remotion/public/factions/AI-Supremacy/faction-data.json`
