/*
  파일명: /components/features/library/curated/CuratorView.tsx
  기능: 선정 주체(대학·언론사·시상기관) 상세
  책임: 기관 소개와 그 기관이 발표한 목록 전부를 보여준다.
        목록 영역은 허브와 같은 조작대(카테고리·기관별/주제별)를 쓴다 — 안에서도 같은 UI다.
*/ // ------------------------------

import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import Image from "next/image";
import { ArrowLeft, ExternalLink } from "lucide-react";
import NationalityText from "@/components/ui/NationalityText";
import type { CuratorDetail } from "@/actions/library/types";
import CuratorBrowse from "./CuratorBrowse";

export default async function CuratorView({ curator }: { curator: CuratorDetail }) {
  const t = await getTranslations("library.curated");

  return (
    <div className="space-y-8">
      <Link
        href="/library/curated"
        className="inline-flex items-center gap-1.5 text-[13px] text-text-tertiary hover:text-accent"
      >
        <ArrowLeft size={14} />
        {t("backToHub")}
      </Link>

      <header className="flex items-start gap-4">
        {curator.logoUrl ? (
          // 로고는 흰 종이를 전제로 만들어진 것이 많아 어두운 화면에 그대로 얹으면 묻힌다
          // 여백은 로고 파일에 이미 들어 있다. 여기서 또 주면 그림이 작아진다
          <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-white">
            <Image src={curator.logoUrl} alt={curator.name} fill className="object-contain" sizes="64px" />
          </div>
        ) : (
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border border-white/[0.06] bg-neutral-900 text-[22px] font-serif font-bold text-text-tertiary">
            {curator.name.slice(0, 1)}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <h2 className="text-[22px] font-serif font-bold leading-tight text-text-primary">{curator.name}</h2>
          <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[12px] text-text-tertiary">
            <span className="rounded border border-accent/20 bg-accent/[0.06] px-1.5 py-0.5 text-accent">
              {t(`kind.${curator.kind}`)}
            </span>
            {curator.country && <NationalityText code={curator.country} />}
            {curator.foundedYear && <span>{curator.foundedYear}</span>}
            <span>{t("listCount", { count: curator.listCount })}</span>
          </div>
        </div>
      </header>

      {curator.description && (
        <p className="max-w-3xl text-[14px] leading-relaxed text-text-secondary">{curator.description}</p>
      )}

      {curator.homepageUrl && (
        <a
          href={curator.homepageUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-[13px] text-text-tertiary hover:text-accent"
        >
          <ExternalLink size={13} />
          {curator.homepageUrl.replace(/^https?:\/\//, "")}
        </a>
      )}

      {/* 목록 진열 — 허브와 같은 조작대로 훑는다. 데이터는 서버가 실어 보낸 것 안에서만 섞는다 */}
      <CuratorBrowse curator={curator} />
    </div>
  );
}
