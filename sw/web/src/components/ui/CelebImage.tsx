/*
  파일명: /components/ui/CelebImage.tsx
  기능: 셀럽 이미지 공통 컴포넌트
  책임: 셀럽 프로필 이미지를 표시하고 이미지가 없을 때 fallback을 제공한다.
*/ // ------------------------------

import Image from "next/image";
import { User } from "lucide-react";

interface CelebImageProps {
  src?: string | null;
  alt: string;
  shape?: "square" | "circle";
  sizes?: string;
  /** 원본 이미지 최대 크기(px). 이 값 이상으로 렌더링되지 않도록 제한한다. */
  maxPx?: number;
  fallbackSize?: number;
  className?: string;
}

export default function CelebImage({
  src,
  alt,
  shape = "square",
  sizes = "120px",
  maxPx,
  fallbackSize = 32,
  className = "",
}: CelebImageProps) {
  const shapeClass = shape === "circle" ? "rounded-full" : "rounded-lg";
  const maxStyle = maxPx
    ? { maxWidth: `${maxPx}px`, maxHeight: `${maxPx}px` }
    : undefined;

  return src ? (
    <div className="relative w-full h-full" style={maxStyle}>
      <Image
        src={src}
        alt={alt}
        fill
        className={`object-cover ${shapeClass} ${className}`}
        sizes={sizes}
        unoptimized
        loading="lazy"
      />
    </div>
  ) : (
    <div className={`w-full h-full flex items-center justify-center bg-bg-secondary ${shapeClass}`}>
      <User size={fallbackSize} className="" />
    </div>
  );
}
