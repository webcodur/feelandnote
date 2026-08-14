/*
  파일명: /components/features/user/explore/sections/SpectrumFullSection/sections/AxisLibraryPanel.tsx
  기능: 기질의 서재
  책임: 현재 축의 상·하위 극단 집단이 공통으로 감상한 작품을 두 칼럼으로 보여준다.
        인물 극단 화면에서 작품으로 건너가는 다리다.
*/ // ------------------------------

"use client";

import { Link } from "@/i18n/navigation";
import { Avatar, Carousel, ContentImage } from "@/components/ui";
import type { SpectrumExtremeEntry } from "@/actions/home/getSpectrumExtremes";
import type {
  AxisLibraryWork,
  SpectrumAxisLibrary,
} from "@/actions/spectrum/getSpectrumAxisLibraries";
import { cn } from "@/lib/utils";
import { AXIS_SHORT_LABELS } from "../../../spectrumAxis";

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
    <Link
      href={`/content/${work.content_id}`}
      className="group flex h-full flex-col gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] p-2 hover:border-white/20 hover:bg-white/[0.05]"
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
                className="rounded-full ring-2 ring-bg-main"
                title={isEn && reader.nickname_en ? reader.nickname_en : reader.nickname}
              >
                <Avatar url={reader.avatar_url} name={reader.nickname} size="sm" />
              </span>
            ))}
          </span>
          <span className="text-[11px] text-text-secondary">
            {isEn ? `${work.readerCount} figures` : `${work.readerCount}명`}
          </span>
        </span>
      </span>
    </Link>
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
          previous: isEn ? "Previous work" : "이전 작품",
          next: isEn ? "Next work" : "다음 작품",
          dot: (index, count) =>
            isEn ? `Item ${index} of ${count}` : `${index}번째 / 전체 ${count}개`,
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

  if (!library || (library.high.length === 0 && library.low.length === 0)) {
    return null;
  }

  const shortLabel = isEn
    ? AXIS_SHORT_LABELS[entry.axis]?.en || entry.label.en
    : AXIS_SHORT_LABELS[entry.axis]?.ko || entry.label.ko;

  // 성향축 라벨은 "양수극 vs 음수극" 형태다 — DispositionCard와 같은 해석을 쓴다
  const [positivePole, negativePole] = (isEn ? entry.label.en : entry.label.ko).split(" vs ");

  const highTitle = isDisposition
    ? isEn
      ? `What ${positivePole}-leaning figures shared`
      : `${positivePole} 쪽 기록가들의 공통 감상작`
    : isEn
      ? `What top-${shortLabel} figures shared`
      : `${shortLabel} 상위 기록가들의 공통 감상작`;
  const lowTitle = isDisposition
    ? isEn
      ? `What ${negativePole}-leaning figures shared`
      : `${negativePole} 쪽 기록가들의 공통 감상작`
    : isEn
      ? `What low-${shortLabel} figures shared`
      : `${shortLabel} 하위 기록가들의 공통 감상작`;

  return (
    <div className="overflow-hidden rounded-2xl border border-white/[0.07] bg-bg-card/40">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-white/[0.07] bg-white/[0.02] px-5 py-3.5 md:px-6">
        <h3 className="font-serif text-lg font-bold text-text-primary">
          {isEn ? "Library of Temperament" : "기질의 서재"}
        </h3>
        <p className="text-xs text-text-secondary">
          {isEn
            ? "Works shared by figures at the extremes of this axis"
            : "이 축의 극단에 선 인물들이 함께 감상한 작품"}
        </p>
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
    </div>
  );
}
