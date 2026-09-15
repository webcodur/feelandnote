/*
  레이아웃이 내주는 빈 자리 하나를 담는 저장소.
  자리를 가진 쪽은 ref로 요소를 올리고, 채우는 쪽은 훅으로 그 요소를 받아 포털로 들어간다.
  고정 틀을 두 벌 세워 좌표로 맞붙이지 않고, 같은 틀 안에 들어가 한 몸으로 움직이게 하려고 쓴다.
*/
import { useSyncExternalStore } from "react";

export function createLayoutSlot() {
  let element: HTMLElement | null = null;
  const listeners = new Set<() => void>();

  const subscribe = (listener: () => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  };

  const setElement = (next: HTMLElement | null) => {
    if (element === next) return;
    element = next;
    listeners.forEach((listener) => listener());
  };

  // 자리가 서 있으면 그 요소, 없으면 null. 서버에서는 자리가 없다.
  const useElement = () => useSyncExternalStore(subscribe, () => element, () => null);

  return { setElement, useElement };
}
