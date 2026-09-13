import type { TimelineData } from "@/actions/home/getCelebTimeline";
import { getEraInfo, getYear, type EraInfo } from "./utils";

export const TIMELINE_PAGE_SIZE = 50;

export function getTimelinePath(country: string, defaultCountry: string, page = 1) {
  const query = new URLSearchParams();
  if (country && country !== defaultCountry) query.set("country", country);
  if (page > 1) query.set("page", String(page));
  return `/explore/timeline${query.size ? `?${query}` : ""}`;
}

/** 연표 전체 데이터는 서버에 두고 현재 페이지의 인물만 클라이언트에 전달한다. */
export function paginateTimeline(data: TimelineData, countryParam?: string, pageParam?: string) {
  const defaultCountry = data.countries[0]?.code ?? "";
  const country = data.countries.some(item => item.code === countryParam) ? countryParam! : defaultCountry;
  const figures = data.celebs.filter(item => item.nationality === country).sort((a, b) =>
    getYear(a.birth_date!) - getYear(b.birth_date!) || a.id.localeCompare(b.id),
  );
  const totalPages = Math.max(1, Math.ceil(figures.length / TIMELINE_PAGE_SIZE));
  const requestedPage = pageParam && /^[1-9]\d*$/.test(pageParam) ? Number(pageParam) : 1;
  const page = Math.min(Number.isSafeInteger(requestedPage) ? requestedPage : 1, totalPages);
  const eras: { era: EraInfo; href: string }[] = [];
  const seenEras = new Set<string>();
  figures.forEach((figure, index) => {
    const era = getEraInfo(getYear(figure.birth_date!));
    if (seenEras.has(era.key)) return;
    seenEras.add(era.key);
    const eraPage = Math.floor(index / TIMELINE_PAGE_SIZE) + 1;
    eras.push({ era, href: `${getTimelinePath(country, defaultCountry, eraPage)}#era-${era.key}` });
  });
  return {
    country,
    defaultCountry,
    page,
    totalPages,
    eras,
    celebs: figures.slice((page - 1) * TIMELINE_PAGE_SIZE, page * TIMELINE_PAGE_SIZE),
    path: getTimelinePath(country, defaultCountry, page),
    previousPath: page > 1 ? getTimelinePath(country, defaultCountry, page - 1) : null,
    nextPath: page < totalPages ? getTimelinePath(country, defaultCountry, page + 1) : null,
  };
}
