/* ─────────────────────────────────────────────
 * [celeb 상세] 공통 — 구획 제목(이동 화살표 포함)
 * - 목차 위치: 공통 (각 구획 머리)
 * - 데이터: ServiceItem/previousItem/nextItem props
 * - 함께 보기: celebServiceItems.ts, detail/CelebRecordSections.tsx
 * ───────────────────────────────────────────── */
"use client";

import { useRef } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";

import type { ServiceItem, ServiceTarget } from "./celebServiceItems";
import styles from "./CelebSectionHeading.module.css";

interface CelebSectionHeadingProps {
  item: ServiceItem;
  previousItem?: ServiceItem;
  nextItem?: ServiceItem;
  onNavigate: (target: ServiceTarget) => void;
  /** 이 페이지 구획명 중 가장 긴 것. 제목 자리 폭을 여기에 맞춰 고정한다 */
  widestLabel?: string;
  /** 머리말처럼 기둥 밖에 서는 제목의 폭 제한 등 */
  className?: string;
  /** 양 끝에서 3초 안에 다시 누르면 이동할 반대편 끝. 없으면 맛보기만 한다 */
  loopTarget?: ServiceTarget;
}

export default function CelebSectionHeading({
  item,
  previousItem,
  nextItem,
  onNavigate,
  widestLabel,
  className,
  loopTarget,
}: CelebSectionHeadingProps) {
  const t = useTranslations("celebPage");
  // 마지막 맛보기 시각·방향. 3초 안에 같은 쪽을 다시 누르면 반대편 끝으로 간다.
  const teaseRef = useRef<{ time: number; side: "prev" | "next" } | null>(null);

  // 양 끝에서 누르면 화살표 아이콘 근처만 glow 펄스로 확실하게 뛴다. 영역 전체가 아니다.
  // 3초 안에 또 누르면 이동한다.
  const pressEnd = (button: HTMLButtonElement, side: "prev" | "next") => {
    const now = Date.now();
    const tease = teaseRef.current;
    if (loopTarget && tease && tease.side === side && now - tease.time < 3000) {
      teaseRef.current = null;
      onNavigate(loopTarget);
      return;
    }
    teaseRef.current = { time: now, side };
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const icon = button.querySelector("svg") ?? button;
    icon.animate(
      [
        { filter: "drop-shadow(0 0 0 transparent)", transform: "scale(1)" },
        { filter: "drop-shadow(0 0 12px currentColor)", transform: "scale(1.45)" },
        { filter: "drop-shadow(0 0 0 transparent)", transform: "scale(1)" },
      ],
      { duration: 600, easing: "ease-out" },
    );
  };

  return (
    <header className={`${styles.heading} ${className ?? ""}`}>
      <button
        type="button"
        onClick={(event) => previousItem ? onNavigate(previousItem.target) : pressEnd(event.currentTarget, "prev")}
        aria-disabled={!previousItem || undefined}
        aria-label={
          previousItem
            ? t("previousSection", { name: previousItem.label })
            : t("noPreviousSection")
        }
        className={styles.navButton}
      >
        <ArrowLeft size={22} strokeWidth={1.7} aria-hidden />
      </button>

      <div className={styles.identity}>
        <h2 className={styles.title}>
          {/* 제목 자리는 가장 긴 구획명 폭으로 고정한다 — 구획을 오가도 화살표가 흔들리지 않는다.
              누르면 이 구획이 화면 맨 위(고정 헤더 바로 아래)에 오도록 다시 맞춘다 */}
          <button
            type="button"
            onClick={() => onNavigate(item.target)}
            className="group relative inline-grid cursor-pointer place-items-center focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
          >
            <span aria-hidden className="invisible flex items-center gap-2.5 whitespace-nowrap">
              <span className={styles.label}>{widestLabel ?? item.label}</span>
            </span>
            <span className="absolute inset-0 flex items-center justify-center gap-2.5 whitespace-nowrap">
              <span className={`${styles.label} group-hover:text-accent`}>{item.label}</span>
            </span>
          </button>
        </h2>
      </div>

      <button
        type="button"
        onClick={(event) => nextItem ? onNavigate(nextItem.target) : pressEnd(event.currentTarget, "next")}
        aria-disabled={!nextItem || undefined}
        aria-label={
          nextItem
            ? t("nextSection", { name: nextItem.label })
            : t("noNextSection")
        }
        className={styles.navButton}
      >
        <ArrowRight size={22} strokeWidth={1.7} aria-hidden />
      </button>
    </header>
  );
}
