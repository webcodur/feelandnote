const NAVIGATION_GUTTER = 80;
const DESKTOP_POINTER = "(min-width: 768px) and (hover: hover) and (pointer: fine)";

export function getModalSideNavigation(
  point: { clientX: number; clientY: number },
  bounds: Pick<DOMRect, "left" | "right" | "top" | "bottom">,
  { hasPrev, hasNext }: { hasPrev: boolean; hasNext: boolean },
): "prev" | "next" | null {
  if (!window.matchMedia(DESKTOP_POINTER).matches
    || point.clientY < bounds.top || point.clientY > bounds.bottom) return null;
  if (hasPrev && point.clientX >= bounds.left - NAVIGATION_GUTTER && point.clientX < bounds.left) return "prev";
  if (hasNext && point.clientX > bounds.right && point.clientX <= bounds.right + NAVIGATION_GUTTER) return "next";
  return null;
}
