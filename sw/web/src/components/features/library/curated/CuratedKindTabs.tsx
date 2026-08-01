/*
  파일명: /components/features/library/curated/CuratedKindTabs.tsx
  기능: 기관 선정 갈래 탭
  책임: 서비스 공용 탭 부품에 주소 이동을 붙인다.
        고른 갈래는 주소(?kind=)에 남아 링크로 공유되고 뒤로가기도 듣는다.
*/ // ------------------------------

"use client";

import { useRouter } from "@/i18n/navigation";
import FilterTabs from "@/components/ui/FilterTabs";

interface Props {
  items: { value: string; label: string }[];
  activeValue: string;
  counts: Record<string, number>;
}

export default function CuratedKindTabs({ items, activeValue, counts }: Props) {
  const router = useRouter();

  return (
    <FilterTabs
      items={items}
      activeValue={activeValue}
      counts={counts}
      onSelect={(value) => router.push(`/library/curated?kind=${value}`)}
    />
  );
}
