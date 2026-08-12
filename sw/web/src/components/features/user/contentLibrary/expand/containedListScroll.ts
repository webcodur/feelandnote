interface VerticalBounds {
  top: number;
  bottom: number;
}

/** 선택 항목을 목록 안에만 보이게 만드는 최소 세로 이동량. */
export function getContainedListScrollDelta(container: VerticalBounds, item: VerticalBounds) {
  if (item.top < container.top) return item.top - container.top;
  if (item.bottom > container.bottom) return item.bottom - container.bottom;
  return 0;
}
