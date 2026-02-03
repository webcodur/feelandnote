# 칭호 시스템 통합 및 아이콘 관리 인수인계서

이 문서는 **Feelandnote** 칭호 시스템의 네오 판테온(Neo-Pantheon) 테마 적용 및 아이콘 관리 체계 통합에 관한 후속 작업 안내를 담고 있습니다.

## 1. 개요
`web-bo`와 `web` 서비스가 동일한 등급/카테고리 스타일을 공유하며, DB에 저장된 커스텀 SVG 아이콘을 동적으로 렌더링할 수 있도록 프론트엔드 기반 작업을 완료했습니다.

## 2. 데이터베이스 후속 작업 (필수)
시스템 권한 문제로 자동 적용되지 않았습니다. Supabase SQL Editor에서 다음 쿼리를 실행해 주세요.

```sql
-- 1. titles 테이블 컬럼 추가
ALTER TABLE public.titles 
ADD COLUMN IF NOT EXISTS icon_svg text,
ADD COLUMN IF NOT EXISTS icon_type text DEFAULT 'lucide';

-- 2. 컬럼 설명 추가
COMMENT ON COLUMN public.titles.icon_svg IS 'SVG path data (d-path) for the title icon';
COMMENT ON COLUMN public.titles.icon_type IS 'Type of icon source: lucide, svg, emoji';
```

## 3. 아이콘 데이터 입력 가이드
각 칭호에 네오 판테온 스타일의 커스텀 아이콘을 적용하려면 DB의 `icon_svg` 컬럼에 SVG `path`의 `d` 값을 입력하면 됩니다.

### 입력 방법
1. **타입 설정**: `icon_type`을 `'svg'`로 설정합니다.
2. **패스 입력**: `icon_svg`에 SVG 패스 데이터를 넣습니다.
   - 예: `M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z` (Trophy 아이콘)

### 렌더링 원리
- `web` 및 `web-bo` 컴포넌트는 `icon_type === 'svg'`인 경우, 해당 패스를 24x24 viewBox 내에서 자동으로 렌더링합니다.
- 색상 및 네오 판테온 테마 효과(대리석 배경, 금빛 광택 등)는 공통 상수(`sw/web/src/constants/titles.ts`)에 정의된 등급별 설정에 따라 자동으로 적용됩니다.

## 4. 관련 주요 파일
- **공통 설정**: [titles.ts](file:///sw/web/src/constants/titles.ts)
- **Admin UI**: [titles/page.tsx](file:///sw-bo/src/app/(admin)/titles/page.tsx)
- **Service UI**: [AchievementsContent.tsx](file:///sw/web/src/components/features/profile/AchievementsContent.tsx)
