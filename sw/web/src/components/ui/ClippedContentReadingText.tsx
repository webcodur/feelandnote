"use client";

import type { ComponentProps } from "react";
import { useClippedText } from "@/hooks/useClippedText";
import ContentReadingText from "./ContentReadingText";

type Props = Omit<ComponentProps<typeof ContentReadingText>, "ref">;

/** 본문이 실제로 잘릴 때만 공통 끝 흐림을 적용하는 미리보기. */
export default function ClippedContentReadingText({ text, className = "", ...props }: Props) {
  const { ref, isClipped } = useClippedText<HTMLDivElement>(text);

  return (
    <ContentReadingText
      {...props}
      ref={ref}
      text={text}
      className={`${className} ${isClipped ? "clip-fade-end" : ""}`}
    />
  );
}
