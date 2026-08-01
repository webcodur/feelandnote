/*
  파일명: /components/features/library/hub/CuratedPreview.tsx
  기능: 서가 허브의 「기관 선정」 미리보기
  책임: 대표 목록 몇 개를 담긴 작품 표지와 함께 보이고 기관 선정 화면으로 안내한다.
        서가 허브의 다른 구획이 모두 그림으로 말하므로 여기도 글자만 두지 않는다.
*/ // ------------------------------

import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import Image from "next/image";
import type { CuratedHub, CuratedListSummary } from "@/actions/library/types";

const PREVIEW_LIMIT = 4;
/** 카드 하나에 세우는 표지 수 */
const COVERS_SHOWN = 5;

interface Picked {
  curatorName: string;
  curatorSlug: string;
  kind: string;
  list: CuratedListSummary;
}

export default async function CuratedPreview({ hub }: { hub: CuratedHub }) {
  const t = await getTranslations("library.curated");

  // 기관을 번갈아 뽑아 한 기관이 미리보기를 독차지하지 않게 한다.
  // 표지가 있는 목록을 앞세운다 — 표지 없는 카드가 먼저 오면 구획 전체가 허전해 보인다
  const picked: Picked[] = [];
  for (const wantCovers of [true, false]) {
    for (let round = 0; picked.length < PREVIEW_LIMIT; round++) {
      let added = false;
      for (const c of hub.curators) {
        const list = c.lists[round];
        if (!list) continue;
        if (wantCovers !== list.covers.length >= 3) continue;
        if (picked.some((p) => p.list.slug === list.slug)) continue;
        picked.push({ curatorName: c.name, curatorSlug: c.slug, kind: c.kind, list });
        added = true;
        if (picked.length >= PREVIEW_LIMIT) break;
      }
      if (!added) break;
    }
  }

  if (picked.length === 0) return null;

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {picked.map(({ curatorName, curatorSlug, kind, list }) => (
        <Link
          key={`${curatorSlug}/${list.slug}`}
          href={`/library/curated/${curatorSlug}/${list.slug}`}
          className="group overflow-hidden rounded-xl border border-white/[0.06] bg-[#161616]/80 hover:border-accent/40"
        >
          {/* 담긴 작품 표지 — 목록이 무엇인지 글자보다 빨리 알린다 */}
          {list.covers.length >= 3 && (
            <div className="flex gap-px bg-black/40">
              {list.covers.slice(0, COVERS_SHOWN).map((src, i) => (
                <div key={`${src}-${i}`} className="relative aspect-[3/4] flex-1 overflow-hidden bg-neutral-900">
                  <Image
                    src={src}
                    alt=""
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    sizes="(max-width: 640px) 20vw, 130px"
                  />
                </div>
              ))}
            </div>
          )}

          <div className="space-y-1 p-3.5">
            <div className="flex items-center gap-2 text-[11px] text-text-tertiary">
              <span className="rounded border border-accent/20 bg-accent/[0.06] px-1.5 py-0.5 text-accent">
                {t(`kind.${kind}`)}
              </span>
              <span className="truncate">{curatorName}</span>
            </div>
            <p className="text-[15px] font-serif font-bold leading-snug text-text-primary group-hover:text-accent">
              {list.title}
            </p>
            <p className="text-[11px] text-text-tertiary">{t("itemCount", { count: list.itemCount })}</p>
          </div>
        </Link>
      ))}
    </div>
  );
}
