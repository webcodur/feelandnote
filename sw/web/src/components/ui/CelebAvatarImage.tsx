"use client";

import { useState, type CSSProperties, type ImgHTMLAttributes } from "react";
import { useCelebAvatarSrc } from "@/hooks/useCelebAvatarSrc";

interface CelebAvatarImageProps extends Pick<ImgHTMLAttributes<HTMLImageElement>, 'width' | 'height' | 'style' | 'loading' | 'fetchPriority' | 'draggable' | 'onLoad' | 'onError'> {
  src: string;
  alt: string;
  // 실제 배치 크기. 생략하면 부모 칸을 채운다. 소스 해상도는 DOM에서 측정한다.
  boxPx?: number;
  className?: string;
  blurDataURL?: string;
}

const fillStyle: CSSProperties = { position: "absolute", inset: 0, width: "100%", height: "100%" };

export default function CelebAvatarImage({ src, alt, boxPx, width, height, style, loading = "lazy", fetchPriority, draggable, onLoad, onError, className = "object-cover", blurDataURL }: CelebAvatarImageProps) {
  const { ref, src: shownSrc, onError: fallback } = useCelebAvatarSrc(src);
  const [loadedSource, setLoadedSource] = useState<string | undefined>(undefined);
  const placeholder = blurDataURL && (!shownSrc || loadedSource !== shownSrc)
    ? { backgroundImage: 'url("' + blurDataURL + '")', backgroundSize: "cover", backgroundPosition: "center" }
    : undefined;

  // Next Image는 측정 전 src 생략을 허용하지 않으므로 여기서는 img를 직접 쓴다.
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={ref}
      src={shownSrc}
      alt={alt}
      width={boxPx ?? width}
      height={boxPx ?? height}
      className={className}
      style={{ ...(!boxPx && !width && !height ? fillStyle : undefined), ...placeholder, ...style }}
      loading={loading}
      fetchPriority={fetchPriority}
      draggable={draggable}
      decoding="async"
      onLoad={(event) => { setLoadedSource(shownSrc); onLoad?.(event); }}
      onError={(event) => { if (!fallback(event)) onError?.(event); }}
    />
  );
}
