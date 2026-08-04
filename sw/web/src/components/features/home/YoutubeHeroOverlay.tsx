/*
  파일명: /components/features/home/YoutubeHeroOverlay.tsx
  기능: 홈 영상관 히어로 조작 계층
  책임: 중앙 통로의 재생 버튼으로 유튜브 채널을 열고, 좌우 시리즈 이름표로 소개 모달과 재생목록을 연결한다.
*/

"use client";

import { useState } from "react";
import { ArrowRight, ExternalLink, Play } from "lucide-react";
import { Link } from "@/i18n/navigation";
import Modal from "@/components/ui/Modal";

export interface HeroSeries {
  key: "library" | "faction";
  index: string;
  title: string;
  tagline: string;
  description: string;
  fullPlaylistUrl: string;
  shortsPlaylistUrl: string;
  siteHref: string;
  siteLabel: string;
  languageNote?: string;
}

interface YoutubeHeroOverlayProps {
  channelUrl: string;
  playLabel: string;
  openSeriesLabel: string;
  fullPlaylistLabel: string;
  shortsPlaylistLabel: string;
  library: HeroSeries;
  faction: HeroSeries;
}

export default function YoutubeHeroOverlay({
  channelUrl,
  playLabel,
  openSeriesLabel,
  fullPlaylistLabel,
  shortsPlaylistLabel,
  library,
  faction,
}: YoutubeHeroOverlayProps) {
  const [openKey, setOpenKey] = useState<"library" | "faction" | null>(null);
  const active = openKey === "library" ? library : openKey === "faction" ? faction : null;

  return (
    <>
      {/* 좌측 절반 — 서재 탐방 */}
      <SeriesZone
        series={library}
        openSeriesLabel={openSeriesLabel}
        onOpen={() => setOpenKey("library")}
        side="left"
      />

      {/* 우측 절반 — 세력도감 */}
      <SeriesZone
        series={faction}
        openSeriesLabel={openSeriesLabel}
        onOpen={() => setOpenKey("faction")}
        side="right"
      />

      {/* 중앙 통로 재생 버튼 — 두 영역 위에 얹는다 */}
      <a
        href={channelUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={playLabel}
        className="group absolute left-1/2 top-[46%] flex size-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-accent/70 bg-black/45 text-accent backdrop-blur-[1px] hover:border-accent hover:bg-accent hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg-main sm:size-14 md:size-16"
      >
        {/* 버튼 테두리에서 시간차로 번져 나가는 두 겹의 파문 — 투명하게 시작해 서서히 떠오른다 */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-full opacity-0 ring-1 ring-accent/70 group-hover:animate-[heroPlayRipple_1.4s_ease-out]"
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-full opacity-0 ring-1 ring-accent/55 group-hover:animate-[heroPlayRipple_1.4s_ease-out_0.4s]"
        />
        <Play
          className="ml-[2px] size-4 sm:size-5 md:size-6"
          fill="currentColor"
          aria-hidden="true"
        />
      </a>

      <Modal
        isOpen={active !== null}
        onClose={() => setOpenKey(null)}
        title={active?.title}
        size="lg"
      >
        {active ? (
          <div className="space-y-4 p-5 sm:p-6">

            <p className="font-serif text-lg leading-snug text-text-primary">
              {active.tagline}
            </p>
            <p className="text-sm leading-7 text-text-primary/90">
              {active.description}
            </p>

            {active.languageNote ? (
              <p className="w-fit border-l-2 border-accent pl-3 text-xs text-text-primary/80">
                {active.languageNote}
              </p>
            ) : null}

            <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:flex-wrap">
              <a
                href={active.fullPlaylistUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex w-full items-center justify-between gap-2 rounded-full border border-white/40 bg-bg-main px-4 py-2.5 text-sm font-semibold text-text-primary hover:border-accent hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent sm:w-auto sm:justify-start"
              >
                <span className="flex size-6 items-center justify-center rounded-full bg-accent text-bg-main">
                  <Play size={11} fill="currentColor" aria-hidden="true" />
                </span>
                {fullPlaylistLabel}
                <ExternalLink size={12} aria-hidden="true" />
              </a>
              <a
                href={active.shortsPlaylistUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex w-full items-center justify-between gap-2 rounded-full border border-white/30 bg-bg-main px-4 py-2.5 text-sm text-text-primary hover:border-accent hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent sm:w-auto sm:justify-start"
              >
                {shortsPlaylistLabel}
                <ExternalLink size={12} aria-hidden="true" />
              </a>
            </div>

            <Link
              href={active.siteHref}
              onClick={() => setOpenKey(null)}
              className="flex w-fit items-center gap-2 pt-2 text-sm font-semibold text-text-primary hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              {active.siteLabel}
              <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </div>
        ) : null}
      </Modal>
    </>
  );
}

interface SeriesZoneProps {
  series: HeroSeries;
  openSeriesLabel: string;
  onOpen: () => void;
  side: "left" | "right";
}

/** 이미지 좌·우 넓은 면 전체가 시리즈 소개를 여는 조작 면이다. 가운데 통로는 재생 버튼 몫으로 비워 둔다. */
function SeriesZone({ series, openSeriesLabel, onOpen, side }: SeriesZoneProps) {
  const isLeft = side === "left";

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`${series.title} — ${openSeriesLabel}`}
      className={`group absolute inset-y-0 w-2/5 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-accent ${
        isLeft ? "left-0" : "right-0"
      }`}
    >
      {/* 이 면이 하나의 문임을 알리는 금빛 테두리 — 배너 모서리 장식과 같은 선상에서 천천히 뻗는다.
          바깥 세로선이 한가운데에서 위아래로 자라고, 뒤이어 위·아래 선이 안쪽으로 나아간다. */}
      <span
        aria-hidden="true"
        className={`absolute inset-y-5 w-px origin-center scale-y-0 bg-accent/80 drop-shadow-[0_0_6px_rgba(0,0,0,0.9)] transition-transform duration-500 ease-out group-hover:scale-y-100 md:inset-y-7 ${
          isLeft ? "left-5 md:left-7" : "right-5 md:right-7"
        }`}
      />
      <span
        aria-hidden="true"
        className={`absolute top-5 h-px scale-x-0 bg-accent/80 drop-shadow-[0_0_6px_rgba(0,0,0,0.9)] transition-transform delay-200 duration-500 ease-out group-hover:scale-x-100 md:top-7 ${
          isLeft
            ? "left-5 right-3 origin-left md:left-7 md:right-5"
            : "left-3 right-5 origin-right md:left-5 md:right-7"
        }`}
      />
      <span
        aria-hidden="true"
        className={`absolute bottom-5 h-px scale-x-0 bg-accent/80 drop-shadow-[0_0_6px_rgba(0,0,0,0.9)] transition-transform delay-200 duration-500 ease-out group-hover:scale-x-100 md:bottom-7 ${
          isLeft
            ? "left-5 right-3 origin-left md:left-7 md:right-5"
            : "left-3 right-5 origin-right md:left-5 md:right-7"
        }`}
      />

      {/* 면 한가운데 — 재생 버튼과 같은 높이에 나란히 선다 */}
      <span className="absolute left-1/2 top-[46%] flex -translate-x-1/2 -translate-y-1/2 flex-col items-center text-center drop-shadow-[0_2px_8px_rgba(0,0,0,1)]">

        <span className="mt-1 font-serif text-base font-semibold text-white group-hover:text-accent sm:text-xl">
          {series.title}
        </span>
        <span
          aria-hidden="true"
          className="mt-1 block h-px w-0 bg-accent transition-[width] duration-300 group-hover:w-full"
        />
        <span className="mt-2 flex items-center gap-1 text-[10px] text-accent opacity-0 transition-opacity duration-300 group-hover:opacity-100 sm:text-xs">
          {openSeriesLabel}
          <ArrowRight size={11} aria-hidden="true" />
        </span>
      </span>
    </button>
  );
}
