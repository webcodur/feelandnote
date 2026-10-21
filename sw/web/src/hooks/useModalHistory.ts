"use client";

import { useEffect, useLayoutEffect, useRef, type RefObject } from "react";
import { registerModalHistory } from "@/lib/modalHistory";

export function useModalHistory(
  isOpen: boolean,
  element: RefObject<HTMLDivElement | null>,
  onClose: () => void,
  canClose: boolean,
) {
  const latest = useRef({ onClose, canClose });
  useLayoutEffect(() => {
    latest.current = { onClose, canClose };
  });
  useEffect(() => {
    if (!isOpen || !element.current) return;
    return registerModalHistory({
      element: element.current,
      close: () => latest.current.onClose(),
      canClose: () => latest.current.canClose,
    });
  }, [isOpen, element]);
}
