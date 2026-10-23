"use client";

import type { CSSProperties } from "react";
import { useTranslations } from "next-intl";
import { ArrowUpRight, ArrowRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import ContentCover from "@/components/ui/ContentCover";
import NationalityText from "@/components/ui/NationalityText";
import type { CuratedHub, CuratedListSummary } from "@/actions/library/types";
import { getCuratorBrand } from "./curatorBrandPalettes";
import { getCuratorLogoSurface } from "./curatorLogos";
import { CURATOR_LOGO_PALETTES } from "./curatorLogoPalettes";
import CuratorLogo from "./CuratorLogo";
import styles from "./CuratedGallery.module.css";

const COVER_ASPECT: Record<string, string> = { MUSIC: "aspect-square", GAME: "aspect-[3/4]" };

function CoverStrip({ list, compact = false }: { list: CuratedListSummary; compact?: boolean }) {
  const covers = list.covers.slice(0, compact ? 2 : 5);
  const aspect = COVER_ASPECT[list.contentType] ?? "aspect-[2/3]";
  if (!covers.length) return null;
  return <div aria-hidden="true" className={compact ? styles.compactCovers : styles.covers}>
    {covers.map((src, index) => <div key={`${index}-${src}`} className={`${styles.cover} ${aspect}`}>
      <ContentCover src={src} alt="" draggable={false} sizes={compact ? "30px" : "(min-width: 1024px) 72px, 16vw"} className="object-cover" fallback={null} />
    </div>)}
  </div>;
}

function ListMeta({ list }: { list: CuratedListSummary }) {
  const t = useTranslations("library.curated");
  return <span className={styles.meta}>
    {[t("itemCount", { count: list.itemCount }), list.isAnnual ? t("annual") : list.isRanked ? t("ranked") : null].filter(Boolean).join(" · ")}
  </span>;
}

/** 로고 전시 면과 편집한 캡션을 분리한다. 기관·목록은 각각 바로 열 수 있다. */
export function CuratedInstitutionCard({ curator, curatorQuery = "" }: {
  curator: CuratedHub["curators"][number];
  curatorQuery?: string;
}) {
  const t = useTranslations("library.curated");
  const multiple = curator.lists.length > 1;
  const brand = getCuratorBrand(curator.slug, curator.kind);
  const surface = getCuratorLogoSurface(curator.slug);
  const colors = CURATOR_LOGO_PALETTES[curator.slug]?.colors ?? [];
  const colorWeight = colors.reduce((sum, color) => sum + color.weight, 0);
  return <article className={styles.card} style={{
    "--curator-accent": brand.accent, "--logo-surface": surface.background, "--logo-ink": surface.ink,
  } as CSSProperties}>
    <Link href={`/explore/works/curated/${curator.slug}${curatorQuery}`} prefetch={false} className={styles.identity}>
      <div className={styles.stage}>
        <div className={styles.stageMeta}>
          <span>{t(`kind.${curator.kind}`)}</span>
          {curator.country && <NationalityText code={curator.country} display="text" />}
        </div>
        <CuratorLogo slug={curator.slug} name={curator.name} logoUrl={curator.logoUrl} kind={curator.kind} size="gallery" />
        {colors.length > 0 && <span className={styles.palette} aria-hidden="true">
          {colors.map(color => <span key={color.hex} style={{ background: color.hex, flexGrow: color.weight / colorWeight }} />)}
        </span>}
      </div>
      <div className={styles.heading}>
        <h2 className={styles.name}>{curator.name}</h2>
        <span className={styles.arrow}><ArrowUpRight size={16} aria-hidden /></span>
      </div>
    </Link>
    <div>
      {curator.lists.map(list => <Link key={list.slug} href={`/explore/works/curated/${curator.slug}/${list.slug}`} prefetch={false}
        aria-label={`${curator.name} · ${list.title}`} className={styles.list}>
        <div className={styles.listLine}>
          <div className={styles.listText}>
            <h3 className={styles.listTitle}>{list.title}</h3>
            <ListMeta list={list} />
          </div>
          {multiple ? <CoverStrip list={list} compact /> : <ArrowRight size={16} className="shrink-0 text-text-tertiary" aria-hidden />}
        </div>
        {!multiple && <CoverStrip list={list} />}
      </Link>)}
    </div>
  </article>;
}

/** 기관 안의 목록도 테두리 상자 대신 제목·설명·표지를 편집한 지면으로 잇는다. */
export default function CuratedListCard({ list }: { list: CuratedListSummary }) {
  const brand = getCuratorBrand(list.curatorSlug, list.curatorKind);
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
