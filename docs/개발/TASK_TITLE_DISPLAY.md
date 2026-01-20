# 작업: 닉네임 옆 대표 칭호 표기

## 배경
Feelnnote는 사용자 활동에 따라 칭호를 부여하는 업적 시스템이 있다. 사용자는 획득한 칭호 중 하나를 "대표 칭호"로 선택할 수 있다.

## 목적
- 선택한 대표 칭호를 닉네임 옆에 표시하여 사용자 정체성 강화
- 다른 사용자에게 활동 수준/성향을 간접적으로 전달
- 칭호 수집 동기 부여 (게이미피케이션)

## 작업 범위
닉네임이 표시되는 UI 7곳에 대표 칭호 뱃지를 병기한다.

## 사전 조건 (완료됨)
- `profiles.selected_title_id` 컬럼 존재
- `getSelectedTitle(userId)` 함수 존재 (`@/actions/achievements`)

## 작업 목록

### 1. TitleBadge 공통 컴포넌트 생성

**파일**: `sw/web/src/components/ui/TitleBadge.tsx`

```tsx
import { TITLE_GRADE_CONFIG, type TitleGrade } from "@/constants/titles";

interface TitleBadgeProps {
  title: { name: string; grade: string } | null;
  size?: "sm" | "md";
}

export default function TitleBadge({ title, size = "sm" }: TitleBadgeProps) {
  if (!title) return null;

  const config = TITLE_GRADE_CONFIG[title.grade as TitleGrade];
  const sizeStyles = {
    sm: "text-[10px] px-1.5 py-0.5",
    md: "text-xs px-2 py-1",
  };

  return (
    <span className={`${sizeStyles[size]} rounded font-medium ${config?.bgColor || "bg-white/10"} ${config?.color || "text-text-secondary"}`}>
      {title.name}
    </span>
  );
}
```

### 2. 프로필 조회에 칭호 포함

프로필 조회 시 `selected_title_id`를 조인하여 칭호 정보 반환하도록 수정.

**수정 파일**: `sw/web/src/actions/user/getProfile.ts` 또는 해당 조회 함수

```sql
-- 조인 예시
SELECT p.*, t.name as title_name, t.grade as title_grade
FROM profiles p
LEFT JOIN titles t ON p.selected_title_id = t.id
WHERE p.id = '사용자ID'
```

### 3. 표기 위치별 수정

#### 3.1 프로필 사이드바 (우선순위 높음)
**파일**: `sw/web/src/components/features/user/profile/UserProfileSidebar.tsx`
**위치**: 118번 줄 근처, `{profile.nickname}` 아래
**방식**: 닉네임 아래에 TitleBadge 추가

#### 3.2 헤더 프로필 메뉴 (우선순위 높음)
**파일**: `sw/web/src/components/layout/header/HeaderProfileMenu.tsx`
**위치**: 60번 줄 근처, `{profile?.nickname}` 옆
**방식**: 닉네임 옆 인라인 TitleBadge (size="sm")

#### 3.3 프로필 카드 (우선순위 높음)
**파일**: `sw/web/src/components/features/user/profile/ProfileCard.tsx`
**위치**: 73번 줄 근처, `{nickname}` 아래
**방식**: 닉네임 아래 TitleBadge

#### 3.4 피드 포스트 카드 (우선순위 중간)
**파일**: `sw/web/src/components/features/user/detail/sections/FeedPostCard.tsx`
**위치**: 66번 줄 근처, `{nickname}` 옆
**방식**: 닉네임 옆 인라인

#### 3.5 팔로우 목록 모달 (우선순위 중간)
**파일**: `sw/web/src/components/features/user/profile/FollowListModal.tsx`
**위치**: 211번 줄 근처, `{user.nickname}` 옆
**방식**: 닉네임 옆 인라인

#### 3.6 친구 활동 섹션 (우선순위 중간)
**파일**: `sw/web/src/components/features/home/FriendActivitySection.tsx`
**위치**: 139번 줄 근처, `userName` prop
**방식**: ReviewCard 컴포넌트에 title prop 추가 필요

#### 3.7 검색 결과 (우선순위 낮음)
**파일**: `sw/web/src/components/shared/search/SearchResultCards.tsx`
**위치**: 124번 줄 근처, `{user.nickname}` 아래
**방식**: 닉네임 아래 TitleBadge

## 참고 파일

| 파일 | 용도 |
|------|------|
| `sw/web/src/constants/titles.ts` | `TITLE_GRADE_CONFIG` (등급별 색상) |
| `sw/web/src/actions/achievements/selectTitle.ts` | `getSelectedTitle` 함수 |

## 체크리스트

- [ ] TitleBadge 컴포넌트 생성
- [ ] 프로필 조회에 칭호 조인 추가
- [ ] UserProfileSidebar 수정
- [ ] HeaderProfileMenu 수정
- [ ] ProfileCard 수정
- [ ] FeedPostCard 수정
- [ ] FollowListModal 수정
- [ ] FriendActivitySection 수정
- [ ] SearchResultCards 수정
