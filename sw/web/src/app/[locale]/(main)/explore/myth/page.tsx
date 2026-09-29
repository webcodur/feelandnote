import { getLocale, getTranslations } from "next-intl/server";
import { getMythData } from "@/actions/home/getMythData";
import { getMythClientData } from "@/actions/home/mythPublicData";
import { getLocalizedAlternates } from "@/lib/seo";
import Lane from "@/components/ui/pending/Lane";
import MythScreenSkeleton from "@/components/features/user/explore/myth/MythScreenSkeleton";
import { MythSection } from "../sections";

export const maxDuration = 30;

/** 검색 설명에 이름을 드는 지역 수 — 나머지는 「등」으로 받는다 */
const NAMED_REGIONS = 4;

/**
 * 검색 설명은 공개된 지역·신화·인물 수를 싣는다. 고정 문구(「신화의 핵심 이야기와 함의를 읽고…」)는
 * 어떤 신화가 있는지 말하지 못했다(26.09.29 전수 점검). 화면이 쓰는 자료와 같은 캐시를 읽으므로
 * 조회가 늘지 않고, 공개 범위도 화면과 같다(getMythClientData). 읽지 못하면 고정 문구로 돌아간다.
 */
async function describeMyths(locale: string, t: Awaited<ReturnType<typeof getTranslations>>) {
  try {
    const data = getMythClientData(await getMythData(locale));
    const myths = data.myths.filter((myth) => myth.isPublished);
    const regions = data.regions.filter((region) => region.id !== "other");
    if (myths.length === 0 || regions.length === 0) return t("description");
    return t("metaDescription", {
      regions: regions.slice(0, NAMED_REGIONS).map((region) => region.name).join(", "),
      regionCount: data.regions.length,
      mythCount: myths.length,
      people: data.people.length,
    });
  } catch (error) {
    console.error("[myth] 검색 설명용 자료 조회 실패:", error);
    return t("description");
  }
}

export async function generateMetadata() {
  const [t, locale] = await Promise.all([getTranslations("explore.hub.myth"), getLocale()]);
  return {
    title: t("title"),
    description: await describeMyths(locale, t),
    alternates: await getLocalizedAlternates("/explore/myth"),
  };
}

export default function MythPage() {
  return <Lane fallback={<MythScreenSkeleton />}><MythSection /></Lane>;
}
