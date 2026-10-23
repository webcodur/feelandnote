/*
  파일명: /components/features/library/curated/CuratorView.tsx
  기능: 선정 주체(대학·언론사·시상 기관) 상세
  책임: 기관 소개와 그 기관이 발표한 목록 전부를 보여준다.
        목록 영역은 허브와 같은 조작대(카테고리·기관별/주제별)를 쓴다 — 안에서도 같은 UI다.
*/ // ------------------------------

import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import NationalityText from "@/components/ui/NationalityText";
import type { CuratorDetail } from "@/actions/library/types";
import CuratorBrowse from "./CuratorBrowse";
import CuratorLogo from "./CuratorLogo";
import { getCuratorBrand } from "./curatorBrandPalettes";
import { getCuratorLogoSurface } from "./curatorLogos";

export default async function CuratorView({ curator, initialBrowse }: { curator: CuratorDetail; initialBrowse?: { media?: string; topic?: string } }) {
  const t = await getTranslations("library.curated");
  const brand = getCuratorBrand(curator.slug, curator.kind);
  const surface = getCuratorLogoSurface(curator.slug);

  return (
    <div className="space-y-8">
      <Link
        href="/explore/works/curated"
        className="inline-flex items-center gap-1.5 text-[13px] text-text-tertiary hover:text-accent"
      >
        <ArrowLeft size={14} />
        {t("backToHub")}
      </Link>

      <header className="border-b border-line pb-8 md:pb-12">
        <div className="flex flex-col gap-7 md:flex-row md:items-start md:gap-12">
          <div className="flex aspect-[8/5] w-full shrink-0 items-center justify-center md:aspect-square md:w-60" style={{ background: surface.background }}>
            <CuratorLogo slug={curator.slug} name={curator.name} logoUrl={curator.logoUrl} kind={curator.kind} size="hero" />
          </div>
          <div className="min-w-0 flex-1">
            {/* 이 화면의 h1 — 배너는 이 주소에서 제목 요소를 내려놓는다(LibraryBanner CURATED_DETAIL_PATH) */}
            <h1 className="break-keep text-3xl font-semibold leading-tight tracking-[-0.045em] text-text-primary md:text-5xl">{curator.name}</h1>
            <div className="mt-4 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-text-secondary">
              <span className="rounded border px-1.5 py-0.5" style={{ color: brand.accent, borderColor: `${brand.accent}40` }}>
                {t(`kind.${curator.kind}`)}
              </span>
              {curator.country && <NationalityText code={curator.country} />}
              {curator.foundedYear && <span>{t("since", { year: curator.foundedYear })}</span>}
              <span>{t("listCount", { count: curator.listCount })}</span>
            </div>

            {curator.description && (
              <p className="mt-5 max-w-2xl break-keep text-sm leading-[1.9] text-text-secondary md:text-[15px]">{curator.description}</p>
            )}

            {curator.homepageUrl && (
              <a
                href={curator.homepageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex max-w-full items-center gap-1.5 break-all text-[13px] text-text-tertiary hover:text-accent"
              >
                <ExternalLink size={13} className="shrink-0" />
                {curator.homepageUrl.replace(/^https?:\/\//, "")}
              </a>
            )}
          </div>
        </div>
      </header>

      {/* 목록 진열 — 허브와 같은 조작대로 훑는다. 데이터는 서버가 실어 보낸 것 안에서만 섞는다 */}
      <CuratorBrowse key={`${initialBrowse?.media ?? ""}:${initialBrowse?.topic ?? ""}`} curator={curator} initialBrowse={initialBrowse} />
    </div>
  );
}
