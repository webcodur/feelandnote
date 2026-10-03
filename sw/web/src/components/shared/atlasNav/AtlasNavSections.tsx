/*
  파일명: /components/shared/atlasNav/AtlasNavSections.tsx
  기능: 구획 목차 내비게이션의 클라이언트 셸
  책임: 서버 페이지가 항목 목록만 넘기면 공용 스크롤 추적과 레일·띠·시트를 달아준다.
*/ // ------------------------------
"use client";

import { useSectionNavigation } from "@/lib/scroll/useSectionNavigation";
import AtlasNav, { type AtlasNavItem } from "./AtlasNav";

interface AtlasNavSectionsProps {
  items: AtlasNavItem[];
}

export default function AtlasNavSections({ items }: AtlasNavSectionsProps) {
  const { activeSectionId, navigate } = useSectionNavigation(items.map((item) => item.sectionId));

  return <AtlasNav items={items} activeId={activeSectionId} onNavigate={navigate} />;
}
