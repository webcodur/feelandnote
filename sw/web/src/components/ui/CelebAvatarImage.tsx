"use client";

import { useState, type CSSProperties, type ImgHTMLAttributes } from "react";
import { useCelebAvatarSrc } from "@/hooks/useCelebAvatarSrc";
import { CELEB_AVATAR_SMALL, CELEB_AVATAR_MEDIUM, CELEB_AVATAR_ORIGINAL, celebAvatarSmallUrl, celebAvatarMediumUrl } from "@feelandnote/shared/constants/celeb-avatar-small";

interface CelebAvatarImageProps extends Pick<ImgHTMLAttributes<HTMLImageElement>, 'width' | 'height' | 'style' | 'loading' | 'fetchPriority' | 'draggable' | 'onLoad' | 'onError'> {
  src: string;
  alt: string;
  // 실제 배치 크기. 생략하면 부모 칸을 채운다. 소스 해상도는 DOM에서 측정한다.
  boxPx?: number;
  className?: string;
  blurDataURL?: string;
  sizes?: string;
}

const fillStyle: CSSProperties = { position: "absolute", inset: 0, width: "100%", height: "100%" };

export default function CelebAvatarImage({ src, alt, boxPx, width, height, style, loading = "lazy", fetchPriority, draggable, onLoad, onError, className = "object-cover", blurDataURL, sizes }: CelebAvatarImageProps) {
  const { ref, src: shownSrc, onError: fallback } = useCelebAvatarSrc(src);
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const displayedSrc = sizes ? src : shownSrc;
  const srcSet = sizes && failedSource !== src && celebAvatarSmallUrl(src) !== src
    ? `${celebAvatarSmallUrl(src)} ${CELEB_AVATAR_SMALL.sizePx}w, ${celebAvatarMediumUrl(src)} ${CELEB_AVATAR_MEDIUM.sizePx}w, ${src} ${CELEB_AVATAR_ORIGINAL.sizePx}w`
    : undefined;
  const [loadedSource, setLoadedSource] = useState<string | undefined>(undefined);
  const placeholder = blurDataURL && (!displayedSrc || loadedSource !== displayedSrc)
    ? { backgroundImage: 'url("' + blurDataURL + '")', backgroundSize: "cover", backgroundPosition: "center" }
    : undefined;

  // 상세 대표 아바타는 초기 주소와 srcSet을 주고, 목록 아바타는 측정 뒤 주소를 고른다.
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={sizes ? undefined : ref}
      src={displayedSrc}
      srcSet={srcSet}
      sizes={srcSet ? sizes : undefined}
      alt={alt}
      width={boxPx ?? width}
      height={boxPx ?? height}
      className={className}
      style={{ ...(!boxPx && !width && !height ? fillStyle : undefined), ...placeholder, ...style }}
      loading={loading}
      fetchPriority={fetchPriority}
      draggable={draggable}
      decoding="async"
      onLoad={(event) => { setLoadedSource(displayedSrc); onLoad?.(event); }}
      onError={(event) => {
        if (sizes) {
          if (srcSet && event.currentTarget.currentSrc !== src) setFailedSource(src);
          else onError?.(event);
          return;
        }
        if (!fallback(event)) onError?.(event);
      }}
    />
  );
}
