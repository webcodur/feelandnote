/*
  파일명: /app/(main)/explore/ranking/sections.tsx
  기능: 분야별 랭킹 화면 본문
  책임: 고른 매체의 순위 목록 + 공통 감상작을 조회해 인물 순위판(FigureRankingBoard)의 content로 바꾼다.
        화면 배치는 순위판이 쥔다 — 여기는 조회와 변환만 한다.
        Lane 안에서 그려지므로 여기서 던지면 안 된다 — 완성 HTML 모드에서 화면 전체가 죽는다.
*/ // ------------------------------

import { getLocale, getTranslations } from "next-intl/server";
import { getTopByContentTypeFull } from "@/actions/home/getTopByContentTypeFull";
import { getSharedContents } from "@/actions/home/getSharedContents";
import { getCategoryByDbType } from "@/constants/categories";
import { getCelebProfileUrl } from "@/lib/url";
import FigureRankingBoard, {
  type FigureRankingBoardContent,
  type RankingNavRow,
} from "@/components/features/user/explore/figureRankingBoard/FigureRankingBoard";
import { RetryBlock } from "@/components/ui/pending";
import { TYPE_COLORS, type ContentTypeKey } from "./constants";

export async function TopByTypeMedia({ type, navRows }: { type: ContentTypeKey; navRows: RankingNavRow[] }) {
  const accent = TYPE_COLORS[type];
  let entry: Awaited<ReturnType<typeof getTopByContentTypeFull>>;
  let shared: Awaited<ReturnType<typeof getSharedContents>> = [];
  try {
    entry = await getTopByContentTypeFull(type);
    if (entry) {
      shared = await getSharedContents(entry.celebs.map((c) => c.id), entry.type, 10);
    }
  } catch (e) {
    console.error(`[RankingPage] ${type} 조회 실패:`, e);
    entry = null;
  }

  // JSX 생성은 try 밖에서 한다 — try 안 JSX는 렌더 오류를 못 잡으면서 린트만 문다
  // 조회 실패든 이 매체를 감상한 인물이 없는 경우든 선택기는 남기고 무대 안에 다시 시도만 세운다
  if (!entry) {
    return <FigureRankingBoard navRows={navRows} accent={accent}><RetryBlock /></FigureRankingBoard>;
  }

  const [locale, t, tc, tu] = await Promise.all([
    getLocale(),
    getTranslations("explore.topByType"),
    getTranslations("content.category"),
    getTranslations("content.unit"),
  ]);
  const isEn = locale === "en";
  const media = tc(type.toLowerCase());
  const unit = tu(type.toLowerCase());
  const Icon = getCategoryByDbType(type)?.lucideIcon;

  const content: FigureRankingBoardContent = {
    head: {
      icon: Icon ? <Icon size={20} aria-hidden /> : undefined,
      title: isEn ? entry.label.en : entry.label.ko,
      description: t("rankDesc", { media }),
    },
    ranking: {
      kind: "podium",
      items: entry.celebs.map((celeb) => ({
        href: getCelebProfileUrl({ id: celeb.id, slug: celeb.slug }),
        nickname: celeb.nickname,
        nickname_en: celeb.nickname_en,
        avatarUrl: celeb.avatar_url,
        subtitle: isEn && celeb.title_en ? celeb.title_en : celeb.title,
        value: celeb.typeCount,
        unit,
      })),
      valuePrefix: Icon ? <Icon size={10} style={{ color: accent }} aria-hidden /> : undefined,
    },
    shelf: shared.length > 0 ? {
      media,
      groups: [{
        id: "shared",
        title: media,
        works: [...shared].sort((a, b) => b.celeb_count - a.celeb_count).map((item) => ({
          contentId: item.content_id,
          type: item.content_type,
          title: item.title ?? (isEn ? "Untitled" : "제목 미상"),
          creator: item.creator,
          thumbnail: item.thumbnail_url,
        })),
      }],
    } : undefined,
  };

  return <FigureRankingBoard navRows={navRows} accent={accent} content={content} />;
}
