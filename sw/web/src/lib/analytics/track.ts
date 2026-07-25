"use client";

import { useEffect, type RefObject } from "react";
import { sendGAEvent } from "@next/third-parties/google";

/* ── 서비스 내 행동 기록 ──
   화면 열림·스크롤은 GA가 자동으로 잡지만 "무엇을 눌렀나"는 잡지 않는다.
   개선 전후를 숫자로 대조하려면 그 부분을 직접 보내야 한다.
   계측 실패가 화면 동작을 막아서는 안 되므로 모든 전송은 예외를 삼킨다. */

export type TrackEventName =
  /** 인물 화면의 각 칸이 눈에 들어왔다 — 어디까지 내려보는지 판별 */
  | "celeb_section_view"
  /** 맨 위 안내판의 칸을 눌렀다 — 무엇에 관심이 있는지 판별 */
  | "celeb_guide_click"
  /** 다른 인물 겹창을 열었다 — 어느 칸이 인물 탐색으로 이어지는지 판별 */
  | "celeb_person_open"
  /** 겹창에서 그 인물 화면으로 넘어갔다 — 실제 화면 이동 전환 */
  | "celeb_person_go"
  /** 인물 음성을 재생했다 */
  | "celeb_voice_play";

type EventParams = Record<string, string | number | boolean>;

export function trackEvent(name: TrackEventName, params: EventParams = {}) {
  if (typeof window === "undefined") return;

  try {
    sendGAEvent("event", name, params);
  } catch (error) {
    // 개발 중에는 원인을 알려주고, 실서비스에서는 조용히 넘긴다.
    if (process.env.NODE_ENV === "development") {
      console.warn("[analytics] 이벤트 전송 실패", name, error);
    }
  }
}

/**
 * 화면 안의 각 칸이 시야에 들어온 사실을 칸마다 한 번씩 기록한다.
 * 문턱을 1%로 잡은 이유 — 서가처럼 화면보다 큰 칸은 40% 같은 값을 영원히 채우지 못한다.
 */
export function useSectionViewTracking(containerRef: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const container = containerRef.current;
    if (!container || typeof IntersectionObserver === "undefined") return;

    const sections = container.querySelectorAll<HTMLElement>("section[id]");
    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          trackEvent("celeb_section_view", { section: entry.target.id });
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.01 },
    );

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [containerRef]);
}
