"use client";

import { useCallback, useRef, useState, type SyntheticEvent } from "react";
import { celebAvatarSmallUrl } from "@feelandnote/shared/constants/celeb-avatar-small";
import { observeAvatarSize } from "@/lib/celeb/avatar-size-observer";

// CSS로 정해진 실제 이미지 칸과 화면 배율만 보고 소스를 고른다.
// 측정 전에는 src를 비워 원본과 작은 판을 연달아 받는 일을 막는다.
export function useCelebAvatarSrc(src: string | null | undefined) {
  const smallSrc = celebAvatarSmallUrl(src);
  const hasSmall = Boolean(src && smallSrc !== src);
  const [selection, setSelection] = useState<{ source: string; small: boolean } | null>(null);
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const cleanup = useRef<(() => void) | undefined>(undefined);

  const ref = useCallback((image: HTMLImageElement | null) => {
    cleanup.current?.();
    cleanup.current = undefined;
    if (!image || !src || !hasSmall) return;
    cleanup.current = observeAvatarSize(image, (small) => {
      setSelection((previous) => previous?.source === src && previous.small === small
        ? previous
        : { source: src, small });
    });
  }, [src, hasSmall]);

  const onError = useCallback((event: SyntheticEvent<HTMLImageElement>) => {
    // 작은 판이 없는 인물만 원본으로 한 번 되돌린다. 원본 실패는 반복하지 않는다.
    if (hasSmall && event.currentTarget.getAttribute("src") === smallSrc) {
      setFailedSource(src ?? null);
    }
  }, [src, smallSrc, hasSmall]);

  let shownSrc = src ?? undefined;
  if (hasSmall) {
    shownSrc = selection && selection.source === src
      ? (selection.small && failedSource !== src ? smallSrc ?? undefined : src ?? undefined)
      : undefined;
  }
  return { ref, src: shownSrc, onError };
}
