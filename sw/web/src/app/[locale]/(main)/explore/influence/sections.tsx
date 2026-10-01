import { getLocale, getTranslations } from "next-intl/server";
import { Globe, Info } from "lucide-react";
import { INFLUENCE_ICONS, INFLUENCE_MAX_SCORES, INFLUENCE_TOTAL_MAX_SCORE } from "@feelandnote/influence-constants";
import { getInfluenceRanking } from "@/actions/home/getInfluenceExplorer";
import { getSharedContents } from "@/actions/home/getSharedContents";
import { getCelebProfileUrl } from "@/lib/url";
import { INFLUENCE_RANKING_ACCENT, type InfluenceRankingField } from "@/constants/influenceRanking";
import FigureRankingBoard, { type FigureRankingBoardContent, type RankingNavRow } from "@/components/features/user/explore/figureRankingBoard/FigureRankingBoard";
import { RetryBlock } from "@/components/ui/pending";
import RankingStage from "@/components/shared/RankingStage";

export async function InfluenceBody({ field, navRows }: { field: InfluenceRankingField; navRows: RankingNavRow[] }) {
  const [locale, t, pending] = await Promise.all([getLocale(), getTranslations("explore.influence"), getTranslations("pending")]);
  const [result] = await Promise.allSettled([getInfluenceRanking(field, locale)]);
  if (result.status === "rejected") {
    console.error(`[InfluencePage] ${field} 조회 실패:`, result.reason);
    return <FigureRankingBoard navRows={navRows} accent={INFLUENCE_RANKING_ACCENT}><RetryBlock /></FigureRankingBoard>;
  }
  const { people, total } = result.value;
  if (people.length === 0) {
    return <FigureRankingBoard navRows={navRows} accent={INFLUENCE_RANKING_ACCENT}><p className="py-8 text-center text-sm text-text-secondary">{pending("empty")}</p></FigureRankingBoard>;
  }
  const Icon = field === "total_score" ? Globe : INFLUENCE_ICONS[field];
  const max = field === "total_score" ? INFLUENCE_TOTAL_MAX_SCORE : INFLUENCE_MAX_SCORES[field];
  const [shared, shelfT] = await Promise.all([
    getSharedContents(people.map((person) => person.id), undefined, 10, locale),
    getTranslations("explore.rankingBoard"),
  ]);
  const content: FigureRankingBoardContent = {
    head: {
      icon: <Icon size={20} aria-hidden />,
      title: t(`titles.${field}`),
      description: t("rankDesc", { total }),
    },
    ranking: {
      kind: "podium",
      podiumNotice: people[0].fieldTieCount > 1 ? (
        <aside
          aria-label={t("tiePlacementLabel")}
          className="mx-auto max-w-xl rounded-xl border px-3 py-2.5 sm:px-4"
          style={{ borderColor: `${INFLUENCE_RANKING_ACCENT}33`, backgroundColor: `${INFLUENCE_RANKING_ACCENT}0d` }}
        >
          <p className="flex items-start gap-2 text-xs font-semibold leading-relaxed text-text-primary sm:text-sm">
            <Info size={15} aria-hidden className="mt-0.5 shrink-0" style={{ color: INFLUENCE_RANKING_ACCENT }} />
            <span>{t("tiePlacementTitle", { name: people[0].nickname })}</span>
          </p>
          <p className="mt-1 pl-[23px] text-xs leading-relaxed text-text-secondary">
            {t(field === "total_score" ? "tiePlacementOverall" : "tiePlacementByTotal")} {t("tiePlacementEqual")}
          </p>
        </aside>
      ) : undefined,
      items: people.map((person) => ({
        href: getCelebProfileUrl(person),
        nickname: person.nickname,
        nickname_en: null,
        avatarUrl: person.avatar_url,
        rank: person.fieldRank,
        subtitle: person.fieldTieCount > 1 ? t("tiedRank", { rank: person.fieldRank }) : t("rank", { rank: person.fieldRank }),
        value: person.fieldScore,
        unit: `/ ${max}`,
      })),
    },
    shelf: shared.length > 0 ? {
      groups: [{
        id: field,
        title: t(`titles.${field}`),
        works: shared.map((work) => ({
          contentId: work.content_id,
          type: work.content_type,
          title: work.title ?? (locale === "en" ? "Untitled" : "제목 미상"),
          creator: work.creator,
          thumbnail: work.thumbnail_url,
        })),
      }],
    } : undefined,
    shelfFallback: (
      <RankingStage>
        <div className="px-5 py-5 md:px-6">
          <h3 className="font-serif text-lg font-bold text-text-primary">{shelfT("shelfTitleAll")}</h3>
          <p className="mt-2 text-sm text-text-secondary">{t("shelfEmpty")}</p>
        </div>
      </RankingStage>
    ),
  };
  return <FigureRankingBoard navRows={navRows} accent={INFLUENCE_RANKING_ACCENT} content={content} />;
}
