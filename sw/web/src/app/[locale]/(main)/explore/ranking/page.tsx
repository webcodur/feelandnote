/*
  파일명: /app/(main)/explore/ranking/page.tsx
  기능: 분야별 랭킹 전체 보기
  책임: 4개 콘텐츠 타입별 Top 10 인물 랭킹을 매체별 레인으로 표시한다.
        레인 하나가 끝나면 그 매체만 뜨고, 다른 매체는 계속 기다린다.
*/ // ------------------------------

import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { getLocalizedAlternates } from "@/lib/seo";
import { PendingBlock } from "@/components/ui/pending";
import Lane from "@/components/ui/pending/Lane";
import { CONTENT_TYPES } from "./constants";
import { TopByTypeMedia } from "./sections";

/* 콜드 상태에서 봇이 받는 완성 HTML이 중간에 잘리지 않게 상한을 넉넉히 둔다 */
export const maxDuration = 30;

/* Lane이 요청 헤더(UA)를 읽어 화면을 동적으로 만든다 — 정적 재검증은 더 이상 의미가 없어 지웠다 */

export async function generateMetadata() {
  const t = await getTranslations("explore.topByType");
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: await getLocalizedAlternates("/explore/ranking"),
  };
}

export default function TopByTypePage() {
  const t = useTranslations("pending");

  return (
    <div className="space-y-10">
      {CONTENT_TYPES.map((type) => (
        <Lane
          key={type}
          fallback={
            <PendingBlock
              variant="grid"
              cols="grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"
              count={10}
              label={t("loading")}
            />
          }
        >
          <TopByTypeMedia type={type} />
        </Lane>
      ))}
    </div>
  );
}
