/*
  파일명: /components/features/library/curated/CuratedHubView.tsx
  기능: 기관 선정 허브
  책임: 선정 주체를 성격별(대학·언론·시상기관·투표 등)로 묶어 칩으로 조망하게 하고,
        칩을 고르면 그 기관만 펼친다. 스물이 넘는 기관을 세로로 늘어놓지 않기 위한 구성이다.
*/ // ------------------------------

import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import Image from "next/image";
import NationalityText from "@/components/ui/NationalityText";
import type { CuratedHub } from "@/actions/library/types";
import CuratedListCard from "./CuratedListCard";
import CuratedKindTabs from "./CuratedKindTabs";

/** 갈래 진열 순서. 여기 없는 갈래는 뒤에 붙는다 */
const KIND_ORDER = ["university", "media", "award", "festival", "community", "bookstore", "library", "organization"];

/** 한 기관 카드에서 펼치는 목록 수. 나머지는 기관 화면에서 본다 */
const LISTS_PER_CURATOR = 2;

type Curator = CuratedHub["curators"][number];

async function CuratorCard({ curator }: { curator: Curator }) {
  const t = await getTranslations("library.curated");

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-[#161616]/80 p-4 hover:border-white/[0.12] sm:p-5">
      <div className="flex items-start gap-3">
        {curator.logoUrl ? (
          <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-neutral-900">
            <Image src={curator.logoUrl} alt={curator.name} fill className="object-contain" sizes="44px" />
          </div>
        ) : (
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-white/[0.06] bg-neutral-900 text-[15px] font-serif font-bold text-text-tertiary">
            {curator.name.slice(0, 1)}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <Link
            href={`/library/curated/${curator.slug}`}
            className="text-[16px] font-serif font-bold text-text-primary hover:text-accent"
          >
            {curator.name}
          </Link>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] text-text-tertiary">
            {curator.country && <NationalityText code={curator.country} />}
            {curator.foundedYear && <span>{curator.foundedYear}</span>}
            <span>{t("listCount", { count: curator.listCount })}</span>
          </div>
          {curator.description && (
            <p className="mt-1.5 line-clamp-2 text-[13px] leading-relaxed text-text-secondary">{curator.description}</p>
          )}
        </div>
      </div>

      {curator.lists.length > 0 && (
        <>
          {/* 기관 카드가 절반 폭이므로 목록은 한 줄에 하나씩 — 더 쪼개면 글자가 뭉갠다 */}
          <div className="mt-4 grid gap-3">
            {curator.lists.slice(0, LISTS_PER_CURATOR).map((list) => (
              <CuratedListCard key={list.slug} list={list} />
            ))}
          </div>
          {curator.lists.length > LISTS_PER_CURATOR && (
            <Link
              href={`/library/curated/${curator.slug}`}
              className="mt-3 inline-block text-[12px] text-text-tertiary hover:text-accent"
            >
              {t("moreLists", { count: curator.lists.length - LISTS_PER_CURATOR })}
            </Link>
          )}
        </>
      )}
    </div>
  );
}

export default async function CuratedHubView({ hub, selected }: { hub: CuratedHub; selected: string | null }) {
  const t = await getTranslations("library.curated");

  if (hub.curators.length === 0) {
    return <p className="py-16 text-center text-[14px] text-text-tertiary">{t("empty")}</p>;
  }

  const byKind = new Map<string, Curator[]>();
  for (const c of hub.curators) {
    const arr = byKind.get(c.kind);
    if (arr) arr.push(c);
    else byKind.set(c.kind, [c]);
  }
  const kinds = [...byKind.keys()].sort((a, b) => {
    const ia = KIND_ORDER.indexOf(a);
    const ib = KIND_ORDER.indexOf(b);
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
  });

  // 탭이므로 늘 한 갈래가 켜져 있다. 주소에 없으면 첫 갈래로 연다
  const active = selected && byKind.has(selected) ? selected : kinds[0];
  const tabItems = kinds.map((k) => ({ value: k, label: t(`kind.${k}`) }));
  const counts = Object.fromEntries(kinds.map((k) => [k, byKind.get(k)!.length]));

  return (
    <div className="space-y-7">
      <p className="max-w-3xl text-[14px] leading-relaxed text-text-secondary">{t("intro")}</p>

      <CuratedKindTabs items={tabItems} activeValue={active} counts={counts} />

      {/* 기관이 스물이 넘어 한 줄에 하나씩 쌓으면 스크롤이 끝없다. 넓은 화면은 두 줄로 나눈다 */}
      <div className="grid gap-4 lg:grid-cols-2">
        {byKind.get(active)!.map((curator) => (
          <CuratorCard key={curator.slug} curator={curator} />
        ))}
      </div>
    </div>
  );
}
