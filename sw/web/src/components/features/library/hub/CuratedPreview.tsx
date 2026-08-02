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
import FilmHoles from "@/components/features/library/curated/FilmHoles";

/** 넓은 화면에서 3열 2행이 되는 수. 넷이면 2열 2행이라 카드가 넓게 퍼져 가로로 눕는다 */
const PREVIEW_LIMIT = 6;
/** 카드 하나에 세우는 표지 수.
 *  다섯 장을 나란히 세우면 표지가 폭의 1/5로 눌려 카드가 가로로 납작해진다.
 *  세 장이면 표지가 그만큼 커져 카드 세로가 살고, 옆 구획의 작품 카드와 높이가 얼추 맞는다 */
const COVERS_SHOWN = 3;
/** 여섯 칸 중 영상 목록에 떼어 두는 자리 수 */
const VIDEO_SLOTS = 2;

interface Picked {
  curatorName: string;
  curatorSlug: string;
  curatorLogo: string | null;
  kind: string;
  list: CuratedListSummary;
}

/** 기관을 번갈아 뽑아 한 기관이 미리보기를 독차지하지 않게 한다.
 *  표지가 있는 목록을 앞세운다 — 표지 없는 카드가 먼저 오면 구획 전체가 허전해 보인다 */
function pickLists(
  curators: CuratedHub["curators"],
  limit: number,
  accept: (list: CuratedListSummary) => boolean,
  taken: Set<string>
): Picked[] {
  const out: Picked[] = [];
  for (const wantCovers of [true, false]) {
    for (let round = 0; out.length < limit; round++) {
      let added = false;
      for (const c of curators) {
        const list = c.lists[round];
        if (!list || !accept(list)) continue;
        if (wantCovers !== list.covers.length >= 3) continue;
        if (taken.has(list.slug)) continue;
        taken.add(list.slug);
        out.push({ curatorName: c.name, curatorSlug: c.slug, curatorLogo: c.logoUrl, kind: c.kind, list });
        added = true;
        if (out.length >= limit) break;
      }
      if (!added) break;
    }
  }
  return out;
}

export default async function CuratedPreview({ hub }: { hub: CuratedHub }) {
  const t = await getTranslations("library.curated");

  // 책 목록이 영상보다 훨씬 많아 그냥 뽑으면 영상이 한 칸도 안 들어차는 때가 있다.
  // 서가에 영화 목록도 있다는 걸 이 구획만 보고 알 수 있어야 하므로 자리를 따로 떼어 둔다
  const taken = new Set<string>();
  const videos = pickLists(hub.curators, VIDEO_SLOTS, (l) => l.contentType === "VIDEO", taken);
  const books = pickLists(hub.curators, PREVIEW_LIMIT - videos.length, (l) => l.contentType !== "VIDEO", taken);

  // 영상을 끝에 몰아 두면 아래 줄만 검게 뜬다. 줄마다 섞이도록 사이사이에 끼운다
  const picked: Picked[] = [];
  const step = videos.length > 0 ? Math.ceil((books.length + videos.length) / videos.length) : 0;
  let vi = 0;
  for (const b of books) {
    picked.push(b);
    if (vi < videos.length && picked.length % step === step - 1) picked.push(videos[vi++]);
  }
  picked.push(...videos.slice(vi));

  if (picked.length === 0) return null;

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {picked.map(({ curatorName, curatorSlug, curatorLogo, kind, list }) => {
        // 영화 포스터도 책 표지와 같은 세로 비율이라 그림만으로는 둘이 구별되지 않는다.
        // 그래서 영상 목록은 카드 자체를 필름처럼 꾸민다 — 어두운 바탕에 위아래 구멍 띠
        const isVideo = list.contentType === "VIDEO";

        return (
        <Link
          key={`${curatorSlug}/${list.slug}`}
          href={`/library/curated/${curatorSlug}/${list.slug}`}
          className={
            isVideo
              ? "group overflow-hidden rounded-2xl border border-white/10 bg-black hover:border-accent/60 hover:shadow-[0_0_30px_rgba(212,175,55,0.15)] transition-all duration-500 transform hover:-translate-y-1"
              : "group overflow-hidden rounded-2xl border border-white/[0.08] bg-[#161616]/90 hover:border-accent/60 hover:shadow-[0_0_30px_rgba(212,175,55,0.15)] transition-all duration-500 transform hover:-translate-y-1"
          }
        >
          {/* 담긴 작품 표지 — 목록이 무엇인지 글자보다 빨리 알린다 */}
          {list.covers.length >= 3 && (
            <div className={isVideo ? "bg-black" : undefined}>
              {isVideo && <FilmHoles />}
              <div className="flex gap-px bg-black/40">
                {list.covers.slice(0, COVERS_SHOWN).map((src, i) => (
                  <div key={`${src}-${i}`} className="relative aspect-[3/4] flex-1 overflow-hidden bg-neutral-900">
                    <Image
                      src={src}
                      alt=""
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                      sizes="(max-width: 640px) 33vw, 140px"
                    />
                  </div>
                ))}
              </div>
              {isVideo && <FilmHoles />}
            </div>
          )}

          <div className="flex gap-3 p-3.5">
            {/* 기관 표식. 흰 종이를 전제로 만들어진 것이 많아 밝은 타일에 올린다.
                여백은 그림 파일에 이미 들어 있어 여기서 또 주지 않는다 */}
            {curatorLogo ? (
              <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-lg bg-white">
                <Image src={curatorLogo} alt={curatorName} fill className="object-contain" sizes="36px" />
              </div>
            ) : (
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/[0.06] bg-neutral-900 text-[13px] font-serif font-bold text-text-tertiary">
                {curatorName.slice(0, 1)}
              </div>
            )}

            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex items-center gap-1.5 text-[11px] text-text-tertiary">
                {/* 책 목록인지 영상 목록인지가 먼저 보여야 한다 — 같은 자리에 섞여 놓이기 때문이다 */}
                <span className="rounded border border-white/[0.14] px-1.5 py-0.5 text-text-secondary">
                  {t.has(`mediaLabel.${list.contentType}`) ? t(`mediaLabel.${list.contentType}`) : list.contentType}
                </span>
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
          </div>
        </Link>
        );
      })}
    </div>
  );
}
