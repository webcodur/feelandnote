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
  fallbackSize?: number;
  className?: string;
}

export default function CelebImage({
  src,
  alt,
  shape = "square",
  sizes = "120px",
  fallbackSize = 32,
  className = "",
}: CelebImageProps) {
  const shapeClass = shape === "circle" ? "rounded-full" : "rounded-lg";

  return src ? (
    <Image
      src={src}
      alt={alt}
      fill
      className={`object-cover ${shapeClass} ${className}`}
      sizes={sizes}
    />
  ) : (
    <div className={`w-full h-full flex items-center justify-center bg-bg-secondary ${shapeClass}`}>
      <User size={fallbackSize} className="text-text-tertiary" />
    </div>
  );
}
