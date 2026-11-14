import { permanentRedirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { getPathname } from "@/i18n/navigation";
import { exploreModeHref, type ExploreSearchParams } from "@/constants/exploreModes";

// 독립 목록의 옛 주소는 탐색의 해당 모드로 연결한다.
export default async function LegacyCatalogPage({ searchParams }: { searchParams: Promise<ExploreSearchParams> }) {
  const [params, locale] = await Promise.all([searchParams, getLocale()]);
  permanentRedirect(getPathname({ href: exploreModeHref("faction", params), locale }));
}
