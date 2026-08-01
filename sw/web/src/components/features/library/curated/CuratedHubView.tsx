/*
  파일명: /components/features/library/curated/CuratedHubView.tsx
  기능: 기관 선정 허브
  책임: 선정 주체를 성격별(대학·언론·시상기관·투표 등)로 묶어 진열하고 각 기관의 목록으로 안내한다.
*/ // ------------------------------

import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import Image from "next/image";
import { GraduationCap, Newspaper, Award, Clapperboard, Users, Store, Library, Building2, Landmark } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import NationalityText from "@/components/ui/NationalityText";
import type { CuratedHub } from "@/actions/library/types";
import CuratedListCard from "./CuratedListCard";

/** 성격 진열 순서. 여기 없는 성격은 뒤에 붙는다 */
const KIND_ORDER = ["university", "media", "award", "festival", "community", "bookstore", "library", "organization"];

/** 성격마다 다른 표식을 준다 — 같은 그림이면 훑을 때 구분이 안 된다 */
const KIND_ICONS: Record<string, LucideIcon> = {
  university: GraduationCap,
  media: Newspaper,
  award: Award,
  festival: Clapperboard,
  community: Users,
  bookstore: Store,
  library: Library,
  organization: Building2,
};

/** 허브에서 한 기관이 펼치는 목록 수. 나머지는 기관 화면에서 본다 */
const LISTS_PER_CURATOR = 2;

export default async function CuratedHubView({ hub }: { hub: CuratedHub }) {
  const t = await getTranslations("library.curated");

  if (hub.curators.length === 0) {
    return <p className="py-16 text-center text-[14px] text-text-tertiary">{t("empty")}</p>;
  }

  const byKind = new Map<string, CuratedHub["curators"]>();
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

  return (
    <div className="space-y-10">
      <p className="max-w-3xl text-[14px] leading-relaxed text-text-secondary">{t("intro")}</p>

      {kinds.map((kind) => {
        const KindIcon = KIND_ICONS[kind] ?? Landmark;
        return (
        <section key={kind} className="space-y-4">
          <h2 className="flex items-center gap-2 text-[17px] font-serif font-bold text-text-primary">
            <KindIcon size={16} className="text-accent" />
            {t(`kind.${kind}`)}
          </h2>

          {/* 기관이 스물이 넘어 한 줄에 하나씩 쌓으면 스크롤이 끝없다. 넓은 화면은 두 줄로 나눈다 */}
          <div className="grid gap-4 lg:grid-cols-2">
            {byKind.get(kind)!.map((curator) => (
              <div
                key={curator.slug}
                className="rounded-2xl border border-white/[0.06] bg-[#161616]/80 p-4 hover:border-white/[0.12] sm:p-5"
              >
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
                      <p className="mt-1.5 line-clamp-2 text-[13px] leading-relaxed text-text-secondary">
                        {curator.description}
                      </p>
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
                    {/* 목록을 여럿 낸 기관은 여기서 다 펼치지 않는다 — 허브가 끝없이 길어진다 */}
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
            ))}
          </div>
        </section>
        );
      })}
    </div>
  );
}
