/*
  파일명: /app/(main)/explore/spectrum/page.tsx
  기능: 비범한 기록가 전체 보기 페이지
  책임: spectrum 16축 극단 셀럽 + 10명 차순위를 표시한다. 본문은 레인 하나로 스트리밍한다.
*/ // ------------------------------

import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { getLocalizedAlternates } from "@/lib/seo";
import { PendingBlock } from "@/components/ui/pending";
import Lane from "@/components/ui/pending/Lane";
import { SpectrumBody } from "./sections";

/* Lane이 요청 헤더(UA)를 읽어 화면을 동적으로 만든다 — 정적 재검증은 더 이상 의미가 없어 지웠다 */

export async function generateMetadata() {
  const t = await getTranslations("explore.spectrum");
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: await getLocalizedAlternates("/explore/spectrum"),
  };
}

export default function SpectrumPage() {
  const t = useTranslations("pending");

  return (
    <Lane fallback={<PendingBlock variant="rows" count={4} label={t("loading")} />}>
      <SpectrumBody />
    </Lane>
  );
}
