/*
  파일명: /app/(main)/explore/works/academy/[category]/page.tsx
  기능: 카테고리 진입 시 첫 번째 코스로 리다이렉트
  책임: ACADEMY_CATEGORY_IDS에서 category를 찾아 첫 코스로 redirect한다.
*/ // ------------------------------

import { redirect } from "@/i18n/navigation";
import { ACADEMY_CATEGORY_IDS } from "@/constants/libraryMuseum";

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ locale: string; category: string }>;
}) {
  const { locale, category } = await params;
  const cat = ACADEMY_CATEGORY_IDS.find((c) => c.id === category);

  if (!cat) {
    return redirect({ href: "/explore/works/academy", locale });
  }

  redirect({ href: `/explore/works/academy/${cat.id}/${cat.courses[0].id}`, locale });
}
