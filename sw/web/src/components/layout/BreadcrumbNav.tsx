/*
  파일명: /components/layout/BreadcrumbNav.tsx
  기능: Breadcrumb 네비게이션 래퍼
  책임: BreadcrumbContext 내부에서 훅을 호출하여 Breadcrumb을 렌더링한다.
*/ // ------------------------------

"use client";

import Breadcrumb from "@/components/ui/Breadcrumb";
import { useBreadcrumb } from "@/hooks/useBreadcrumb";

export default function BreadcrumbNav() {
  const items = useBreadcrumb();
  return <Breadcrumb items={items} className="mb-4" />;
}
