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
          data-no-drag
          aria-haspopup="dialog"
          aria-label={tArchive("expandCover")}
          title={tArchive("expandCover")}
          onClick={(event) => {
            event.stopPropagation();
            setExpandedImage({ src: imageSrc, title });
          }}
          className="group/zoom absolute end-0 top-0 z-10 size-18 cursor-zoom-in bg-bg-main/80 text-accent [clip-path:polygon(0_0,100%_0,100%_100%)] hover:bg-accent/25 active:bg-accent/35 focus-visible:bg-accent/25 focus-visible:outline-none"
        >
          <span className="pointer-events-none absolute end-1 top-1 flex size-8 items-center justify-center rounded-full border border-accent/50 bg-bg-card text-accent group-hover/zoom:border-accent group-hover/zoom:bg-accent group-hover/zoom:text-bg-main group-active/zoom:bg-accent-hover group-focus-visible/zoom:ring-2 group-focus-visible/zoom:ring-accent">
            <ZoomIn size={18} aria-hidden />
          </span>
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
