/*
  파일명: /components/features/user/explore/sections/SpectrumFullSection/sections/AxisLibraryPanel.tsx
  기능: 기질의 서재
  책임: 현재 축의 상·하위 극단 집단이 공통으로 감상한 작품을 두 칼럼으로 보여준다.
        인물 극단 화면에서 작품으로 건너가는 다리다.
*/ // ------------------------------

"use client";

import { Link } from "@/i18n/navigation";
import WorkPurchaseAction from "@/components/features/commerce/WorkPurchaseAction";
import DeveloperCommerceFallback from "@/components/features/commerce/DeveloperCommerceFallback";
import BookPurchaseInfo from "@/components/shared/BookPurchaseInfo";
import { Carousel, CelebImage, ContentImage } from "@/components/ui";
import type { SpectrumExtremeEntry } from "@/actions/home/getSpectrumExtremes";
import type {
  AxisLibraryWork,
  SpectrumAxisLibrary,
} from "@/actions/spectrum/getSpectrumAxisLibraries";
import { cn } from "@/lib/utils";
import { celebDisplayName } from "@/lib/celeb/displayName";
import AtlasStage from "@/components/shared/AtlasStage";
import { useTranslations } from "next-intl";
import { AXIS_SHORT_LABELS, getAxisSides } from "../../../spectrumAxis";

interface AxisLibraryPanelProps {
  library: SpectrumAxisLibrary | undefined;
  entry: SpectrumExtremeEntry;
  isDisposition: boolean;
  locale: string;
  color: string;
}

/** 표지를 앞세운 낱장. 옆으로 넘겨보는 줄에 들어간다 */
function WorkTile({ work, isEn }: { work: AxisLibraryWork; isEn: boolean }) {
  const title = isEn && work.title_en ? work.title_en : work.title;
  const thumbnail =
    isEn && work.thumbnail_en ? work.thumbnail_en : work.thumbnail_url;

  return (
    <article className="flex h-full min-w-0 flex-col">
    <Link
      href={`/content/${work.content_id}`}
      className="group flex flex-1 flex-col gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] p-2 hover:border-white/20 hover:bg-white/[0.05] outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      <span className="relative aspect-[2/3] w-full overflow-hidden rounded-[3px] border border-white/10 bg-black/25">
        <ContentImage
          src={thumbnail}
          alt={title}
          sizes="148px"
          className="object-cover"
        />
      </span>
      <span className="min-w-0">
        <span className="line-clamp-2 block text-[13px] font-semibold leading-snug text-text-primary group-hover:text-accent">
          {title}
        </span>
        <span className="mt-1.5 flex items-center gap-1.5">
          <span className="flex -space-x-1.5">
            {work.readers.slice(0, 3).map((reader) => (
              <span
                key={reader.id}
                className="relative block size-6 overflow-hidden rounded-full bg-bg-secondary ring-2 ring-bg-main"
                title={celebDisplayName(reader, isEn ? "en" : "ko")}
              >
                <CelebImage src={reader.avatar_url} alt="" shape="circle" fallbackSize={12} />
              </span>
            ))}
          </span>
          <span className="text-[11px] text-text-secondary">
            {isEn ? `${work.readerCount} figures` : `${work.readerCount}명`}
          </span>
        </span>
      </span>
    </Link>
    <WorkPurchaseAction target={{ title, contentId: work.content_id, type: work.type }} />
    </article>
  );
}

function LibraryColumn({
  title,
  works,
  accent,
  isEn,
}: {
  title: string;
  works: AxisLibraryWork[];
  accent?: string;
  isEn: boolean;
}) {
  const t = useTranslations("explore.spectrum.axisLibrary");
  if (works.length === 0) return null;

  return (
    <div className="min-w-0 px-5 py-4 md:px-6 md:py-5">
      <p
        className="mb-3 border-s-2 ps-2 text-[13px] font-bold tracking-wide"
        style={{
          color: accent ?? undefined,
          borderColor: accent ?? "rgba(255,255,255,0.2)",
        }}
      >
        {title}
      </p>
      <Carousel
        labels={{
          previous: t("prevWork"),
          next: t("nextWork"),
          dot: (index, count) => t("dot", { index, count }),
        }}
        itemWidthClassName="w-[132px] sm:w-[148px]"
      >
        {works.map((work) => (
          <WorkTile key={work.content_id} work={work} isEn={isEn} />
        ))}
      </Carousel>
    </div>
  );
}

export default function AxisLibraryPanel({
  library,
  entry,
  isDisposition,
  locale,
  color,
}: AxisLibraryPanelProps) {
  const isEn = locale === "en";
  const t = useTranslations("explore.spectrum.axisLibrary");

  if (!library || (library.high.length === 0 && library.low.length === 0)) {
    return <DeveloperCommerceFallback target={{ title: entry.label.ko.replace(" vs ", " "), type: "TOPIC" }} placement="spectrum-axis" />;
  }

  const shortLabel = isEn
    ? AXIS_SHORT_LABELS[entry.axis]?.en || entry.label.en
    : AXIS_SHORT_LABELS[entry.axis]?.ko || entry.label.ko;

  // 성향축 라벨은 "양수극 vs 음수극" 형태다 — DispositionCard와 같은 해석(getAxisSides)을 쓴다
  const [positivePole, negativePole] = getAxisSides(entry.label, locale);

  const highTitle = isDisposition
    ? t("highDisposition", { pole: positivePole })
    : t("highMetric", { label: shortLabel });
  const lowTitle = isDisposition
    ? t("lowDisposition", { pole: negativePole })
    : t("lowMetric", { label: shortLabel });

  return (
    /* 무대와 같은 공용 프레임(AtlasStage) — 축색 광원은 무대가 이미 깔았으니 여기선 평범한 상자 */
    <AtlasStage>
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-white/[0.06] px-5 py-3.5 md:px-6">
        <h3 className="font-serif text-lg font-bold text-text-primary">
          {t("heading")}
        </h3>
        <p className="text-xs text-text-secondary">
          {t("sub")}
        </p>
        {/* 서가가 따르는 축 — 짧은 축 이름이 있는 축(덕목·능력)만 칩으로 단다 */}
        {AXIS_SHORT_LABELS[entry.axis] && (
          <span
            className="rounded border px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wider"
            style={{ borderColor: `${color}40`, color }}
          >
            {shortLabel}
          </span>
        )}
        {!isEn && (
          <BookPurchaseInfo className="ml-auto flex h-7 w-7 items-center justify-center self-center rounded-full border border-white/10" />
        )}
      </div>
      <div
        className={cn(
          "grid",
          library.high.length > 0 && library.low.length > 0
            ? "divide-y divide-white/[0.07] md:grid-cols-2 md:divide-x md:divide-y-0"
            : null,
        )}
      >
        <LibraryColumn
          title={highTitle}
          works={library.high}
          accent={color}
          isEn={isEn}
        />
        <LibraryColumn title={lowTitle} works={library.low} isEn={isEn} />
      </div>
    </AtlasStage>
  );
}
