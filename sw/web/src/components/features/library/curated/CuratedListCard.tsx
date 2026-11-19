"use client";

import type { CSSProperties } from "react";
import { useTranslations } from "next-intl";
import { ArrowUpRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import ContentCover from "@/components/ui/ContentCover";
import type { CuratedHub, CuratedListSummary } from "@/actions/library/types";
import { getCuratorBrand } from "./curatorBrandPalettes";
import CuratorLogo from "./CuratorLogo";
import styles from "./CuratedGallery.module.css";

const COVER_ASPECT: Record<string, string> = { MUSIC: "aspect-square", GAME: "aspect-[3/4]" };

function CoverStrip({ list }: { list: CuratedListSummary }) {
  const covers = list.covers.slice(0, 5);
  const aspect = COVER_ASPECT[list.contentType] ?? "aspect-[2/3]";
  if (!covers.length) return null;
  return <div aria-hidden="true" className={styles.covers}>
    {covers.map((src, index) => <div key={`${index}-${src}`} className={`${styles.cover} ${aspect}`}>
      <ContentCover src={src} alt="" draggable={false} sizes="(min-width: 1024px) 72px, 16vw" className="object-cover" fallback={null} />
    </div>)}
  </div>;
}

function ListMeta({ list, lead }: { list: CuratedListSummary; lead?: string }) {
  const t = useTranslations("library.curated");
  return <span className={styles.meta}>
    {[lead, t("itemCount", { count: list.itemCount }), list.isAnnual ? t("annual") : list.isRanked ? t("ranked") : null].filter(Boolean).join(" · ")}
  </span>;
}

/** 허브의 목록 카드 — 기관의 정사각 로고 아래 목록명을 단다. 기관명은 화면에 쓰지 않는다. */
export function CuratedListTile({ curator, list, showCurator = false }: {
  curator: CuratedHub["curators"][number];
  list: CuratedListSummary;
  /** 같은 이름의 목록이 여럿일 때만 기관명을 편수 앞에 붙여 구분한다 */
  showCurator?: boolean;
}) {
  const brand = getCuratorBrand(curator.slug, curator.kind, curator.logoPalette);
  return <Link href={`/explore/works/curated/${curator.slug}/${list.slug}`} prefetch={false}
    aria-label={`${curator.name} · ${list.title}`} className={styles.tile} style={{ "--curator-accent": brand.accent } as CSSProperties}>
    <div className={styles.tileLogo}>
      <CuratorLogo slug={curator.slug} name={curator.name} logoUrl={curator.logoUrl} kind={curator.kind} palette={curator.logoPalette} size="fill" />
    </div>
    <h2 className={styles.tileTitle}>{list.title}</h2>
    <ListMeta list={list} lead={showCurator ? curator.name : undefined} />
  </Link>;
}

/** 기관 안의 목록도 테두리 상자 대신 제목·설명·표지를 편집한 지면으로 잇는다. */
export default function CuratedListCard({ list }: { list: CuratedListSummary }) {
  const brand = getCuratorBrand(list.curatorSlug, list.curatorKind, list.curatorLogoPalette);
  const name = list.curatorName ?? list.curatorSlug;
  return <article className={styles.card} style={{ "--curator-accent": brand.accent } as CSSProperties}>
    <Link href={`/explore/works/curated/${list.curatorSlug}/${list.slug}`} prefetch={false} className={`${styles.identity} ${styles.listCard}`}>
      <div className={styles.listCardTop}>
        <h2 className={styles.name}>{list.title}</h2>
        <ArrowUpRight size={20} className="shrink-0 text-text-tertiary" aria-hidden />
      </div>
      <ListMeta list={list} />
      {list.description && <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-text-secondary">{list.description}</p>}
      <CoverStrip list={list} />
      <span className="sr-only">{name}</span>
    </Link>
  </article>;
}
