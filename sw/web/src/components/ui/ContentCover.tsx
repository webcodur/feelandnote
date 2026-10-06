"use client";

import { useState, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import ContentImage, { type ContentImageProps } from "./ContentImage";
import ContentCoverFallback from "./ContentCoverFallback";

interface ContentCoverProps extends ContentImageProps {
  fallback?: ReactNode;
  fallbackTitle?: string;
  ContentIcon?: LucideIcon;
  iconSize?: number;
  label?: string;
}

/** 표지의 부재·로드 실패를 같은 대체 화면으로 처리한다. 크기와 링크는 호출 화면이 맡는다. */
export default function ContentCover({
  src, alt, fallback, fallbackTitle = alt, ContentIcon, iconSize = 28, label, onError, ...imageProps
}: ContentCoverProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  if (!src || src === failedSrc) {
    return fallback !== undefined ? fallback : <ContentCoverFallback title={fallbackTitle} ContentIcon={ContentIcon} iconSize={iconSize} label={label} />;
  }
  return <ContentImage {...imageProps} src={src} alt={alt} onError={() => {
    setFailedSrc(src);
    onError?.();
  }} />;
}
