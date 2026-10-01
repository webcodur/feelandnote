import { getTranslations } from "next-intl/server";
import { Globe } from "lucide-react";
import { INFLUENCE_ICONS } from "@feelandnote/influence-constants";
import { getLocalizedAlternates } from "@/lib/seo";
import Lane from "@/components/ui/pending/Lane";
import FigureRankingBoard, { type RankingNavRow } from "@/components/features/user/explore/figureRankingBoard/FigureRankingBoard";
import {
  INFLUENCE_RANKING_FIELD_ROWS,
  INFLUENCE_RANKING_ACCENT,
  getInfluenceRankingHref,
  resolveInfluenceRankingField,
} from "@/constants/influenceRanking";
import { InfluenceBody } from "./sections";

export const maxDuration = 30;

interface Props {
  searchParams: Promise<{ field?: string | string[] }>;
}

export async function generateMetadata({ searchParams }: Props) {
  const field = resolveInfluenceRankingField((await searchParams).field);
  const t = await getTranslations("explore.influence");
  return {
    title: t("metaTitle", { field: t(`titles.${field}`) }),
    description: t("metaDescription"),
    alternates: await getLocalizedAlternates(getInfluenceRankingHref(field)),
  };
}

export default async function InfluencePage({ searchParams }: Props) {
  const field = resolveInfluenceRankingField((await searchParams).field);
  const [t, pending] = await Promise.all([getTranslations("explore.influence"), getTranslations("pending")]);
  const navRows: RankingNavRow[] = INFLUENCE_RANKING_FIELD_ROWS.map((fields, index) => ({
    id: `influence-field-${index}`,
    label: t("fieldNav"),
    alwaysShowChips: true,
    activeId: field,
    items: fields.map((key) => {
      const Icon = key === "total_score" ? Globe : INFLUENCE_ICONS[key];
      return { id: key, name: t(`fields.${key}`), icon: <Icon size={13} aria-hidden />, href: getInfluenceRankingHref(key) };
    }),
  }));
  return (
    <Lane key={field} fallback={<FigureRankingBoard navRows={navRows} accent={INFLUENCE_RANKING_ACCENT} pendingLabel={pending("loading")} />}>
      <InfluenceBody field={field} navRows={navRows} />
    </Lane>
  );
}
