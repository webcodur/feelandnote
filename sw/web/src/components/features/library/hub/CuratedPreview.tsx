/*
  파일명: /components/features/library/hub/CuratedPreview.tsx
  기능: 서가 허브의 「기관 선정」 미리보기
  책임: 대표 목록 몇 개를 보여주고 기관 선정 화면으로 안내한다.
*/ // ------------------------------

import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { CuratedHub } from "@/actions/library/types";

const PREVIEW_LIMIT = 4;

export default async function CuratedPreview({ hub }: { hub: CuratedHub }) {
  const t = await getTranslations("library.curated");

  // 기관을 번갈아 뽑아 한 기관이 미리보기를 독차지하지 않게 한다
  const picked: { curatorName: string; curatorSlug: string; kind: string; listSlug: string; title: string; itemCount: number }[] = [];
  for (let round = 0; picked.length < PREVIEW_LIMIT; round++) {
    let added = false;
    for (const c of hub.curators) {
      const list = c.lists[round];
      if (!list) continue;
      picked.push({
        curatorName: c.name,
        curatorSlug: c.slug,
        kind: c.kind,
        listSlug: list.slug,
        title: list.title,
        itemCount: list.itemCount,
      });
      added = true;
      if (picked.length >= PREVIEW_LIMIT) break;
    }
    if (!added) break;
  }

  if (picked.length === 0) return null;

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {picked.map((p) => (
        <Link
          key={`${p.curatorSlug}/${p.listSlug}`}
          href={`/library/curated/${p.curatorSlug}/${p.listSlug}`}
          className="group rounded-xl border border-white/[0.06] bg-[#161616]/80 p-4 hover:border-accent/40 hover:bg-[#1b1b1b]/80"
        >
          <div className="flex items-center gap-2 text-[11px] text-text-tertiary">
            <span className="rounded border border-accent/20 bg-accent/[0.06] px-1.5 py-0.5 text-accent">
              {t(`kind.${p.kind}`)}
            </span>
            <span className="truncate">{p.curatorName}</span>
          </div>
          <p className="mt-2 text-[15px] font-serif font-bold leading-snug text-text-primary group-hover:text-accent">
            {p.title}
          </p>
          <p className="mt-1 text-[11px] text-text-tertiary">{t("itemCount", { count: p.itemCount })}</p>
        </Link>
      ))}
    </div>
  );
}
