"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { Play, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Z_INDEX } from "@/constants/zIndex";
import type { FactionVideo, FactionVideos } from "@/lib/faction-videos";

/*
  테마를 다룬 세력도 영상 보기.

  영상이 없으면 아무것도 그리지 않는다 — 빈 자리를 남기지 않는다.
  긴 영상·짧은 영상이 둘 다 있으면 둘 다 고를 수 있다.
  누르면 화면을 떠나지 않고 그 자리에서 재생한다.

  세력도감 화면과 인물 화면이 같은 부품을 쓴다(문구·동작이 갈라지지 않게).
*/
export default function FactionVideoLinks({
  videos,
  title,
  className,
}: {
  videos: FactionVideos | null | undefined;
  /** 재생 창 머리말에 쓸 이름(테마 이름) */
  title: string;
  className?: string;
}) {
  const t = useTranslations("factionVideo");
  const [playing, setPlaying] = useState<{ video: FactionVideo; label: string } | null>(null);

  const choices: { key: "longform" | "shorts"; video: FactionVideo; label: string }[] = [
    ...(videos?.longform ? [{ key: "longform" as const, video: videos.longform, label: t("watchLongform") }] : []),
    ...(videos?.shorts ? [{ key: "shorts" as const, video: videos.shorts, label: t("watchShorts") }] : []),
  ];

  if (choices.length === 0) return null;

  return (
    <>
      <div className={cn("flex flex-wrap items-center gap-2", className)}>
        {choices.map(({ key, video, label }) => (
          <button
            key={key}
            type="button"
            onClick={(event) => {
              // 카드 전체가 눌리는 자리(인물 화면)에 놓여도 이 단추만 반응해야 한다
              event.stopPropagation();
              setPlaying({ video, label });
            }}
            className="group/vid inline-flex cursor-pointer items-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-white/85 hover:border-accent hover:bg-accent/10 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <Play size={14} className="fill-current transition-transform duration-150 group-hover/vid:translate-x-0.5" />
            {label}
          </button>
        ))}
      </div>

      {playing && (
        <FactionVideoModal
          video={playing.video}
          title={`${title} · ${playing.label}`}
          closeLabel={t("closeVideo")}
          onClose={() => setPlaying(null)}
        />
      )}
    </>
  );
}

/*
  재생 창.
  세력도 영상은 긴 것도 짧은 것도 모두 세로(9:16)라 세로 비율로 띄운다.
  닫는 길은 셋 — 바깥 어두운 곳 누르기, 오른쪽 위 닫기 표시, Esc.
  열려 있는 동안 뒤 화면이 따라 스크롤되지 않게 잠근다.
*/
function FactionVideoModal({
  video,
  title,
  closeLabel,
  onClose,
}: {
  video: FactionVideo;
  title: string;
  closeLabel: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      style={{ zIndex: Z_INDEX.modal + 1 }}
      onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}
      className="fixed inset-0 flex items-center justify-center bg-black/85 p-3 backdrop-blur-sm animate-fade-in sm:p-6"
    >
      <div
        onClick={(event) => event.stopPropagation()}
        className="relative w-full max-w-[min(100%,calc((100dvh-7rem)*9/16))]"
      >
        <div className="flex items-center gap-3 pb-2">
          <span className="min-w-0 flex-1 truncate font-serif text-sm font-bold text-white/90">{title}</span>
          <button
            type="button"
            aria-label={closeLabel}
            title={closeLabel}
            onClick={onClose}
            className="flex h-9 w-9 flex-shrink-0 cursor-pointer items-center justify-center rounded-full border border-white/15 bg-white/10 text-white/80 hover:border-accent/60 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="relative aspect-[9/16] max-h-[calc(100dvh-7rem)] w-full overflow-hidden rounded-xl bg-black ring-1 ring-white/10">
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${video.id}?autoplay=1&rel=0&playsinline=1`}
            title={title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            className="absolute inset-0 h-full w-full border-0"
          />
        </div>
      </div>
    </div>,
    document.body,
  );
}
