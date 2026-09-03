/*
  파일명: /components/features/library/curated/CuratorView.tsx
  기능: 선정 주체(대학·언론사·시상 기관) 상세
  책임: 기관 소개와 그 기관이 발표한 목록 전부를 보여준다.
        목록 영역은 허브와 같은 조작대(카테고리·기관별/주제별)를 쓴다 — 안에서도 같은 UI다.
*/ // ------------------------------

import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import Image from "next/image";
import { ArrowLeft, ExternalLink } from "lucide-react";
import NationalityText from "@/components/ui/NationalityText";
import BlurDissolve from "@/components/ui/BlurDissolve";
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

      <header className="mx-auto flex max-w-3xl flex-col items-center text-center">
        {curator.logoUrl && (
          // 로고는 흰 종이를 전제로 만들어진 것이 많아 어두운 화면에 그대로 얹으면 묻힌다
          // 여백은 로고 파일에 이미 들어 있다. 여기서 또 주면 그림이 작아진다
          <div className="relative mb-4 size-24 overflow-hidden rounded-xl bg-white shadow-lg">
            <BlurDissolve className="absolute inset-0">
              <Image src={curator.logoUrl} alt={curator.name} fill className="object-contain" sizes="96px" />
            </BlurDissolve>
          </div>
        )}

        <h2 className="text-2xl font-bold leading-tight text-text-primary">{curator.name}</h2>
        <div className="mt-2 flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1 text-[12px] text-text-tertiary">
          <span className="rounded border border-accent/20 bg-accent/[0.06] px-1.5 py-0.5 text-accent">
            {t(`kind.${curator.kind}`)}
          </span>
          {curator.country && <NationalityText code={curator.country} />}
          {curator.foundedYear && <span>{t("since", { year: curator.foundedYear })}</span>}
          <span>{t("listCount", { count: curator.listCount })}</span>
        </div>

        {curator.description && (
          <p className="mt-4 text-[14px] leading-relaxed text-text-secondary">{curator.description}</p>
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
      </header>

      {/* 목록 진열 — 허브와 같은 조작대로 훑는다. 데이터는 서버가 실어 보낸 것 안에서만 섞는다 */}
      <CuratorBrowse curator={curator} />
    </div>
  );
}
