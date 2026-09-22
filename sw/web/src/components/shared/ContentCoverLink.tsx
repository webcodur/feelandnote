"use client";

import { useState, type ReactNode } from "react";
import { ArrowRight, ZoomIn } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import ImageViewerModal from "@/components/ui/ImageViewerModal";
import { cn } from "@/lib/utils";

/** 표지는 상세로 연결한다. 작은 화면·터치에는 안내를 상시 표시하고, PC는 hover·키보드 포커스로 보여 준다. */
export default function ContentCoverLink({
  href,
  title,
  imageSrc,
  children,
  className = "",
}: {
  href: string;
  title: string;
  imageSrc?: string | null;
  children: ReactNode;
  className?: string;
}) {
  const t = useTranslations("celebPage");
  const label = t("sourceWorkOpen");
  const tArchive = useTranslations("archiveSearch");
  const [expandedImage, setExpandedImage] = useState<{ src: string; title: string } | null>(null);

  return (
    <>
    <div className={cn("group/cover relative block overflow-hidden", className)}>
      <Link
        href={href}
        prefetch={false}
        aria-label={`${title} — ${label}`}
        className="group/detail absolute inset-0 block h-full w-full cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent"
      >
      {children}
      <span
        data-cover-detail-hint
        aria-hidden
        className="absolute inset-x-0 bottom-0 flex items-center justify-center bg-black/85 px-2 py-1 text-[11px] font-semibold text-white opacity-0 max-sm:opacity-100 sm:min-h-12 sm:border-t sm:border-accent/50 sm:bg-black/95 sm:px-6 sm:py-3 sm:text-sm sm:font-bold sm:text-accent [@media(hover:none)]:opacity-100 [@media(hover:hover)]:group-hover/cover:opacity-100 group-focus-within/cover:opacity-100 hover:border-accent hover:bg-accent hover:text-bg-main active:bg-accent-hover group-focus-visible/detail:border-accent group-focus-visible/detail:bg-accent group-focus-visible/detail:text-bg-main"
      >
        <span className="text-center">{label}</span>
        <ArrowRight size={13} className="absolute end-1.5 top-1/2 hidden -translate-y-1/2 sm:block" />
      </span>
      </Link>
      {imageSrc && (
        <button
          type="button"
          data-cover-zoom
          aria-label={tArchive("expandCover")}
          title={tArchive("expandCover")}
          onClick={(event) => {
            event.stopPropagation();
            setExpandedImage({ src: imageSrc, title });
          }}
          className="pointer-events-none absolute end-2 top-2 z-10 hidden size-11 cursor-zoom-in items-center justify-center rounded-full border border-white/25 bg-black/80 text-white opacity-0 sm:[@media(hover:hover)]:flex group-hover/cover:pointer-events-auto group-hover/cover:opacity-100 group-focus-within/cover:pointer-events-auto group-focus-within/cover:opacity-100 hover:border-accent hover:bg-accent hover:text-bg-main active:bg-accent-hover focus-visible:border-accent focus-visible:bg-accent focus-visible:text-bg-main focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <ZoomIn size={18} aria-hidden />
        </button>
      )}
    </div>
    {expandedImage && (
      <ImageViewerModal
        src={expandedImage.src}
        alt={expandedImage.title}
        isOpen
        onClose={() => setExpandedImage(null)}
      />
    )}
    </>
  );
}
