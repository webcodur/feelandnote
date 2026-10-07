"use client";

import { useState, type ReactNode } from "react";
import { ZoomIn } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import ImageViewerModal from "@/components/ui/ImageViewerModal";
import InteractiveMediaCover from "@/components/ui/media-objects/InteractiveMediaCover";
import { MEDIA_KINDS } from "@/components/ui/media-objects/MediaObject";
import type { ContentType } from "@/types/database";
import { cn } from "@/lib/utils";

/** 표지 전체는 상세로 연결하고, 별도 확대 버튼은 원본 이미지를 보여 준다. */
export default function ContentCoverLink({
  href,
  title,
  imageSrc,
  contentType = "BOOK",
  children,
  className = "",
}: {
  href: string;
  title: string;
  imageSrc?: string | null;
  contentType?: ContentType;
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
        className="absolute inset-0 block h-full w-full cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent"
      >
      {imageSrc && children ? <InteractiveMediaCover kind={MEDIA_KINDS[contentType]} image={imageSrc} title={title} /> : children}
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
        closeOnImageClick
        onClose={() => setExpandedImage(null)}
      />
    )}
    </>
  );
}
