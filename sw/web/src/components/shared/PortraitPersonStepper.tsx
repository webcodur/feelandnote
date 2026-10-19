"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type RefObject } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { Z_INDEX } from "@/constants/zIndex";
import { MEDIA_BELOW_SM } from "@/constants/breakpoints";

const subscribeNone = () => () => {};
const getBody = () => document.body;
const noBody = () => null;
const PERSON_SELECTOR = "[data-portrait-person]";

interface Props {
  containerRef: RefObject<HTMLElement | null>;
  /** 목록·그룹·펼침 상태가 바뀌면 현재 DOM으로 다시 관찰한다. */
  listKey: string;
}

/** 한 열로 펼친 대표사진 목록을 스크롤한다. 카드를 선택하거나 소개창을 열지 않는다. */
export default function PortraitPersonStepper({ containerRef, listKey }: Props) {
  const t = useTranslations("home.ui");
  const body = useSyncExternalStore(subscribeNone, getBody, noBody);
  const [position, setPosition] = useState({ visible: false, index: 0, count: 0 });
  const pendingIndex = useRef<number | null>(null);
  const settleTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const refresh = useRef<() => void>(() => {});

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const mobile = window.matchMedia(MEDIA_BELOW_SM);
    let frame: number | undefined;
    const cards = () => Array.from(container.querySelectorAll<HTMLElement>(PERSON_SELECTOR));
    const headerBottom = () => {
      const height = getComputedStyle(document.documentElement).getPropertyValue("--layer-header-h");
      return (Number.parseFloat(height) || 64) + 12;
    };
    const measure = () => {
      frame = undefined;
      const items = cards();
      const top = headerBottom();
      // 하단 탭뿐 아니라 그 위 목차 띠까지 합친 실측 높이를 따른다.
      const chromeHeight = Number.parseFloat(document.documentElement.style.getPropertyValue("--layer-bottom-chrome-h")) || 64;
      const bottom = window.innerHeight - chromeHeight - 16;
      const first = items[0]?.getBoundingClientRect();
      const last = items.at(-1)?.getBoundingClientRect();
      let index = 0;
      let distance = Infinity;
      items.forEach((item, candidate) => {
        const next = Math.abs(item.getBoundingClientRect().top - top);
        if (next < distance) { distance = next; index = candidate; }
      });
      const next = {
        visible: mobile.matches && items.length > 1 && !!first && !!last && first.top < bottom - 64 && last.bottom > top + 64,
        index: pendingIndex.current ?? index,
        count: items.length,
      };
      setPosition(current => current.visible === next.visible && current.index === next.index && current.count === next.count ? current : next);
    };
    const schedule = () => {
      if (frame === undefined) frame = requestAnimationFrame(measure);
    };
    const settle = () => { pendingIndex.current = null; schedule(); };
    const onScroll = () => {
      schedule();
      clearTimeout(settleTimer.current);
      settleTimer.current = setTimeout(settle, 150);
    };
    const manualScroll = (event: Event) => {
      if (!(event.target instanceof Element) || !event.target.closest("[data-portrait-stepper]")) pendingIndex.current = null;
    };
    refresh.current = onScroll;
    pendingIndex.current = null;
    const observer = new ResizeObserver(schedule);
    observer.observe(container);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", schedule);
    window.addEventListener("touchstart", manualScroll, { passive: true });
    window.addEventListener("wheel", manualScroll, { passive: true });
    mobile.addEventListener("change", schedule);
    schedule();
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("touchstart", manualScroll);
      window.removeEventListener("wheel", manualScroll);
      mobile.removeEventListener("change", schedule);
      if (frame !== undefined) cancelAnimationFrame(frame);
      clearTimeout(settleTimer.current);
      refresh.current = () => {};
    };
  }, [containerRef, listKey]);

  const step = (direction: number) => {
    const items = Array.from(containerRef.current?.querySelectorAll<HTMLElement>(PERSON_SELECTOR) ?? []);
    const current = pendingIndex.current ?? position.index;
    const index = Math.min(Math.max(current + direction, 0), items.length - 1);
    const target = items[index];
    if (!target || current === index) return;
    pendingIndex.current = index;
    const header = Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--layer-header-h")) || 64;
    window.scrollTo({
      top: Math.max(0, window.scrollY + target.getBoundingClientRect().top - header - 12),
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
    });
    refresh.current();
  };

  if (!body || !position.visible) return null;
  const button = "grid size-11 place-items-center rounded-full text-text-primary outline-none hover:bg-accent/15 hover:text-accent active:bg-accent/25 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent disabled:cursor-default disabled:text-text-tertiary disabled:opacity-35 disabled:hover:bg-transparent";
  return createPortal(
    <div data-portrait-stepper role="group" aria-label={t("cardImage.modes.portrait")}
      className="fixed flex items-center gap-1 rounded-full border border-accent/25 bg-bg-secondary/90 p-1 shadow-[0_6px_24px_#0006] backdrop-blur-xl sm:hidden"
      style={{ zIndex: Z_INDEX.fab, bottom: "calc(var(--layer-bottom-chrome-h) + 16px)", right: "max(12px, env(safe-area-inset-right))" }}>
      <button type="button" className={button} aria-label={t("prevPerson")} disabled={position.index === 0} onClick={() => step(-1)}>
        <ChevronLeft size={23} strokeWidth={1.7} aria-hidden />
      </button>
      <span className="h-4 w-px bg-accent/15" aria-hidden />
      <button type="button" className={button} aria-label={t("nextPerson")} disabled={position.index >= position.count - 1} onClick={() => step(1)}>
        <ChevronRight size={23} strokeWidth={1.7} aria-hidden />
      </button>
    </div>, body,
  );
}
