"use client";

import { useTranslations } from "next-intl";
import { Film } from "lucide-react";

export interface CelebVideoItem {
  videoId: string;
  title?: string | null;
}

interface VideosSectionProps {
  longform?: CelebVideoItem[];
  shorts?: CelebVideoItem[];
}

const ROMAN = ["Ⅰ", "Ⅱ", "Ⅲ", "Ⅳ", "Ⅴ", "Ⅵ", "Ⅶ", "Ⅷ", "Ⅸ", "Ⅹ"];
const romanOf = (i: number) => ROMAN[i] ?? String(i + 1);

export default function VideosSection({
  longform = [],
  shorts = [],
}: VideosSectionProps) {
  const t = useTranslations("celebPage");
  const hasAny = longform.length > 0 || shorts.length > 0;

  if (!hasAny) {
    return (
      <p className="text-center text-xs italic py-6">
        {t("videosEmpty")}
      </p>
    );
  }

  return (
    <div className="relative space-y-9">
      {/* ── 본편 ── */}
      {longform.length > 0 && (
        <div className="space-y-4">
          <Marquee
            ordinal="I"
            title={t("videosLongform")}
            aside={t("videosLongformAside")}
          />
          <div
            className={
              longform.length > 1
                ? "grid gap-5 sm:grid-cols-2 px-3 pt-3"
                : "max-w-xl mx-auto px-3 pt-3"
            }
          >
            {longform.map((v, i) => (
              <FeatureCard
                key={v.videoId}
                index={i}
                videoId={v.videoId}
                title={v.title}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── 릴 디바이더 ── */}
      {longform.length > 0 && shorts.length > 0 && <ReelDivider />}

      {/* ── 단편 ── */}
      {shorts.length > 0 && (
        <div className="space-y-4">
          <Marquee
            ordinal="II"
            title={t("videosShorts")}
            aside={t("videosShortsAside")}
          />
          <div className="flex gap-3 overflow-x-auto pb-3 px-1 snap-x snap-mandatory videos-scroll">
            {shorts.map((v, i) => (
              <VignetteCard
                key={v.videoId}
                index={i}
                videoId={v.videoId}
                title={v.title}
              />
            ))}
          </div>
        </div>
      )}

      <style jsx>{`
        .videos-scroll {
          scrollbar-width: thin;
          scrollbar-color: rgba(var(--color-accent-rgb, 180, 150, 90), 0.3)
            transparent;
        }
        .videos-scroll::-webkit-scrollbar {
          height: 4px;
        }
        .videos-scroll::-webkit-scrollbar-thumb {
          background: rgba(var(--color-accent-rgb, 180, 150, 90), 0.3);
          border-radius: 2px;
        }
      `}</style>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
 * 섹션 헤더 — "마르퀴(marquee)": 고전 극장 프로그램판 톤
 * ─────────────────────────────────────────────────────── */
function Marquee({
  ordinal,
  title,
  aside,
}: {
  ordinal: string;
  title: string;
  aside: string;
}) {
  return (
    <div className="flex items-baseline gap-3 pl-1 select-none">
      <span className="font-serif italic text-[13px] text-accent/80 tracking-[0.1em] tabular-nums">
        № {ordinal}
      </span>
      <span className="w-px h-3.5 bg-accent-dim/40" />
      <h3 className="font-serif text-[15px] text-text-primary tracking-wide">
        {title}
      </h3>
      <span className="h-px flex-1 bg-gradient-to-r from-accent-dim/30 via-accent-dim/15 to-transparent" />
      <span className="text-[9px] font-mono tracking-[0.25em] uppercase">
        {aside}
      </span>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
 * 본편 카드 — 로만 번호 원형 인장 + 모서리 브래킷
 * ─────────────────────────────────────────────────────── */
function FeatureCard({
  index,
  videoId,
  title,
}: {
  index: number;
  videoId: string;
  title?: string | null;
}) {
  return (
    <div className="group relative">
      {/* 좌상단 로만 인장 */}
      <div className="absolute -top-2.5 -left-2.5 z-20 w-9 h-9 rounded-full bg-bg-main border border-accent/50 flex items-center justify-center font-serif text-sm text-accent shadow-[0_2px_12px_rgba(0,0,0,0.4)] group-hover:border-accent group-hover:shadow-[0_2px_16px_rgba(180,150,90,0.25)] transition-all duration-500">
        {romanOf(index)}
      </div>

      {/* 모서리 브래킷 */}
      <CornerBracket pos="tr" />
      <CornerBracket pos="bl" />

      {/* 영상 프레임 */}
      <div className="relative aspect-video rounded-[2px] overflow-hidden bg-bg-secondary ring-1 ring-accent/10 group-hover:ring-accent/50 transition-all duration-500 shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
        {/* 필름 노이즈 오버레이 (미묘) */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.04] mix-blend-overlay z-10"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='1.2' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='0.9'/></svg>\")",
          }}
        />
        <iframe
          src={`https://www.youtube.com/embed/${videoId}`}
          title={title ?? "YouTube video"}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="w-full h-full relative"
        />
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
 * 단편 카드 — 세로 필름 스트립, 상단 번호 라벨
 * ─────────────────────────────────────────────────────── */
function VignetteCard({
  index,
  videoId,
  title,
}: {
  index: number;
  videoId: string;
  title?: string | null;
}) {
  return (
    <div className="group relative flex-shrink-0 w-[140px] sm:w-[168px] snap-start">
      {/* 상단 번호 라벨 */}
      <div className="absolute top-2 left-2 z-20 flex items-center gap-1 px-1.5 py-0.5 rounded-sm bg-bg-main/80 backdrop-blur-sm border border-accent/30">
        <span className="font-serif italic text-[11px] text-accent/90 leading-none">
          {romanOf(index)}
        </span>
      </div>

      {/* 필름 스프로킷 라인 (측면 장식) */}
      <div className="absolute -left-1 top-3 bottom-3 w-0.5 flex flex-col justify-around pointer-events-none opacity-0 group-hover:opacity-60 transition-opacity duration-500">
        {[0, 1, 2, 3, 4].map((i) => (
          <span key={i} className="h-0.5 w-0.5 bg-accent rounded-full" />
        ))}
      </div>

      {/* 영상 프레임 */}
      <div className="aspect-[9/16] rounded-[2px] overflow-hidden bg-bg-secondary ring-1 ring-accent/10 group-hover:ring-accent/60 transition-all duration-500 shadow-[0_3px_14px_rgba(0,0,0,0.35)] group-hover:shadow-[0_6px_20px_rgba(0,0,0,0.5)]">
        <iframe
          src={`https://www.youtube.com/embed/${videoId}`}
          title={title ?? "YouTube Shorts"}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="w-full h-full"
        />
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
 * 모서리 브래킷 — L자 장식
 * ─────────────────────────────────────────────────────── */
function CornerBracket({ pos }: { pos: "tl" | "tr" | "bl" | "br" }) {
  const map = {
    tl: "-top-1 -left-1 border-t border-l",
    tr: "-top-1 -right-1 border-t border-r",
    bl: "-bottom-1 -left-1 border-b border-l",
    br: "-bottom-1 -right-1 border-b border-r",
  };
  return (
    <span
      className={`absolute ${map[pos]} w-4 h-4 border-accent/40 pointer-events-none transition-colors duration-500 group-hover:border-accent/80`}
      aria-hidden
    />
  );
}

/* ─────────────────────────────────────────────────────────
 * 본편 ↔ 단편 디바이더 — 필름 릴 아이콘 중앙
 * ─────────────────────────────────────────────────────── */
function ReelDivider() {
  return (
    <div className="flex items-center gap-4 opacity-50 py-1">
      <span className="h-px flex-1 bg-gradient-to-r from-transparent via-accent/30 to-accent/10" />
      <Film size={14} className="text-accent/70" strokeWidth={1.25} />
      <span className="h-px flex-1 bg-gradient-to-l from-transparent via-accent/30 to-accent/10" />
    </div>
  );
}
