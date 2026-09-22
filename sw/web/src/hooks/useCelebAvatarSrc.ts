"use client";

import { useCallback, useRef, useState, type SyntheticEvent } from "react";
import { celebAvatarSmallUrl, celebAvatarMediumUrl, type CelebAvatarTier } from "@feelandnote/shared/constants/celeb-avatar-small";
import { observeAvatarSize } from "@/lib/celeb/avatar-size-observer";

// CSS로 정해진 실제 이미지 칸과 화면 배율만 보고 소스를 고른다.
// 측정 전에는 src를 비워 원본과 작은 판을 연달아 받는 일을 막는다.
export function useCelebAvatarSrc(src: string | null | undefined) {
  const smallSrc = celebAvatarSmallUrl(src);
  const mediumSrc = celebAvatarMediumUrl(src);
  const hasSmall = Boolean(src && smallSrc !== src);
  const [selection, setSelection] = useState<{ source: string; tier: CelebAvatarTier } | null>(null);
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const cleanup = useRef<(() => void) | undefined>(undefined);

  const ref = useCallback((image: HTMLImageElement | null) => {
    cleanup.current?.();
    cleanup.current = undefined;
    if (!image || !src || !hasSmall) return;
    cleanup.current = observeAvatarSize(image, (tier) => {
      setSelection((previous) => previous?.source === src && previous.tier === tier
        ? previous
        : { source: src, tier });
    });
  }, [src, hasSmall]);

  const onError = useCallback((event: SyntheticEvent<HTMLImageElement>) => {
    // 파생 이미지가 없으면 원본으로 한 번 복귀한다. 원본 실패는 반복하지 않는다.
    const failed = event.currentTarget.getAttribute("src");
    if (hasSmall && (failed === smallSrc || failed === mediumSrc)) {
      setFailedSource(src ?? null);
      return true;
    }
    return false;
  }, [src, smallSrc, mediumSrc, hasSmall]);

  let shownSrc = src ?? undefined;
  if (hasSmall) {
    shownSrc = selection && selection.source === src
      ? (failedSource === src || selection.tier === 'original'
        ? src ?? undefined
        : (selection.tier === 'small' ? smallSrc : mediumSrc) ?? undefined)
      : undefined;
  }
  return { ref, src: shownSrc, onError };
}
