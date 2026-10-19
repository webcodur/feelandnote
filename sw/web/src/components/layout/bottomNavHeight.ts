/** 관찰 콜백 안에서 루트 여백을 바꾸면 얕은 조상의 관찰이 같은 프레임에 다시 생긴다. */
export function observeBottomNavHeight(frame: HTMLElement, root: HTMLElement) {
  let pending: number | undefined;
  const publish = () => {
    const value = `${frame.offsetHeight}px`;
    if (root.style.getPropertyValue("--layer-bottom-chrome-h") !== value) {
      root.style.setProperty("--layer-bottom-chrome-h", value);
    }
  };
  publish();
  const observer = new ResizeObserver(() => {
    if (pending !== undefined) return;
    pending = requestAnimationFrame(() => { pending = undefined; publish(); });
  });
  observer.observe(frame);
  return () => {
    observer.disconnect();
    if (pending !== undefined) cancelAnimationFrame(pending);
    root.style.removeProperty("--layer-bottom-chrome-h");
  };
}
