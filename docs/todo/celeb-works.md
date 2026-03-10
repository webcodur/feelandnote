# 셀럽 창작 서가 (celeb_works)

셀럽 개인 페이지에서 "이 인물이 만든 작품"을 보여주는 기능.

## 배경

기존에는 셀럽 페이지에서 "감상한 콘텐츠"만 표시했다. 플라톤 페이지에 가면 플라톤이 읽은 책은 나오지만, 정작 플라톤이 쓴 『국가』는 안 보였다. 셀럽이 직접 집필/감독/작곡/창작한 작품도 보여줘야 한다는 필요에서 시작.

## 설계 요약

- 셀럽 페이지에 **"감상 서가 / 창작 서가"** 탭 전환 추가
- `celeb_works` 테이블로 셀럽-창작물 관계 저장
- `content_id`가 있으면 기존 contents와 연결, NULL이면 네이버 검색 연동 카드 (미술 작품 등)
- ContentCard의 리뷰 자리에 **창작 배경** 텍스트 표시
- 각 카드에 **역할**(저자/감독/작곡 등)과 **발표 연도** 뱃지

## 완료 항목

| 항목 | 상태 | 비고 |
|------|------|------|
| DB: `celeb_works` 테이블 생성 | ✅ 완료 | 마이그레이션 적용됨 |
| 타입: `CelebWork`, `WorkRole` 정의 | ✅ 완료 | `sw/web/src/types/database.ts` |
| 서버 액션: `getCelebWorks` | ✅ 완료 | `sw/web/src/actions/celebs/getCelebWorks.ts` |
| 서버 액션: `getCelebWorkCounts` | ✅ 완료 | `sw/web/src/actions/celebs/getCelebWorkCounts.ts` |
| UI: `CreativeLibrary` 컴포넌트 | ✅ 완료 | `sw/web/src/components/features/celeb/creativeLibrary/` |
| UI: 감상/창작 탭 전환 (`LibraryTabs`) | ✅ 완료 | `CelebPageContent.tsx` 내부 |
| i18n: ko/en 메시지 | ✅ 완료 | `tabConsume`, `tabCreate`, `worksEmpty`, `worksControl` |
| web-bo: 서버 액션 CRUD | ✅ 완료 | `sw/web-bo/src/actions/admin/celebs.ts` |
| web-bo: 창작물 관리 페이지 | ✅ 완료 | `sw/web-bo/src/app/(admin)/celebs/[slug]/works/` |
| web-bo: 셀럽 상세에 링크 추가 | ✅ 완료 | "창작물 관리 →" |
| 에이전트: `celeb-works-collector` 정의 | ✅ 완료 | `.claude/agents/celeb-10-works-collector.md` |
| 룰북: 창작물 수집 가이드 | ✅ 완료 | `docs/project/celeb/celeb-10-works-collector.md` |

## 미완료 항목

| 항목 | 우선순위 | 설명 |
|------|----------|------|
| 데이터 수집: 셀럽별 창작물 등록 | 높음 | `celeb-works-collector` 에이전트로 일괄 수집 필요. 현재 테이블은 비어 있음 |
| 수집 대상 셀럽 선정 | 높음 | 1,073명 중 창작물이 의미 있는 인물 우선순위 결정 필요 (작가, 감독, 작곡가, 화가 등) |
| 기존 콘텐츠 자동 매칭 | 중간 | DB에 이미 있는 콘텐츠(다른 셀럽 감상 서가에 등록된 것)를 creator 텍스트 매칭으로 celeb_works.content_id에 연결하는 일괄 스크립트 |
| ART 타입 검색 연동 고도화 | 낮음 | 현재 네이버 검색 기본 연동. 위키미디어 커먼즈 이미지 연동 등 검토 가능 |
| Supabase 타입 재생성 | 낮음 | celeb_works 포함 타입 재생성 (현재 `as any` 미사용, 직접 타입 정의로 처리) |
| 창작 서가 빈 상태 UX | 낮음 | 데이터 없는 셀럽에서 탭 노출 여부 결정 (현재는 빈 메시지 표시) |

## DB 스키마

```sql
CREATE TABLE celeb_works (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  celeb_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content_id text REFERENCES contents(id) ON DELETE SET NULL,  -- NULL이면 검색 연동
  title text NOT NULL,
  title_en text,
  role text NOT NULL DEFAULT 'author',        -- author/director/composer/artist/editor/screenwriter/developer/performer
  description text,                           -- 창작 배경 (한국어)
  description_en text,                        -- 창작 배경 (영문)
  work_type text NOT NULL DEFAULT 'BOOK',     -- BOOK/VIDEO/MUSIC/GAME/ART
  release_year integer,                       -- BC는 음수 (예: BC 380 → -380)
  search_keyword text,                        -- 네이버 검색 키워드 (NULL이면 title 사용)
  created_at timestamptz NOT NULL DEFAULT now()
);
```

## 파일 구조

```
sw/web/
├── src/actions/celebs/getCelebWorks.ts
├── src/actions/celebs/getCelebWorkCounts.ts
├── src/components/features/celeb/creativeLibrary/CreativeLibrary.tsx
├── src/app/[locale]/(main)/celeb/[slug]/CelebPageContent.tsx  (LibraryTabs 추가)
├── src/types/database.ts  (CelebWork, WorkRole 추가)
├── messages/ko/celeb.json
└── messages/en/celeb.json

sw/web-bo/
├── src/actions/admin/celebs.ts  (getCelebWorksAdmin, addCelebWork, updateCelebWork, deleteCelebWork)
└── src/app/(admin)/celebs/[slug]/works/
    ├── page.tsx
    ├── WorksList.tsx
    └── AddWorkForm.tsx

.claude/agents/celeb-10-works-collector.md
docs/project/celeb/celeb-10-works-collector.md
```
