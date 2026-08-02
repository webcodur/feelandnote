"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";

import { WORLD_SERIF_FONT, type WorldNumerals, type WorldTitleFont } from "@/lib/celeb/worldStyle";

import type { ServiceItem, ServiceTarget } from "./celebServiceItems";
import styles from "./CelebSectionHeading.module.css";

/* 사이트 서체가 전부 고딕 계열이라(--font-serif도 실제로는 Pretendard) 한자 장 번호가 밋밋하다.
   시스템 명조로 떨어뜨려 옛 맛을 살린다 */
const HANJA_FONT = WORLD_SERIF_FONT;

interface CelebSectionHeadingProps {
  item: ServiceItem;
  previousItem?: ServiceItem;
  nextItem?: ServiceItem;
  onNavigate: (target: ServiceTarget) => void;
  /** 세계 표기로 바꾼 장 번호(예: 三·III·03). 없으면 번호를 그리지 않는다 */
  chapterLabel?: string;
  /** 장 번호 표기 종류. 한자는 세리프로 그려야 옛 맛이 산다 */
  numerals?: WorldNumerals;
  /** 이 페이지 구획명 중 가장 긴 것. 제목 자리 폭을 여기에 맞춰 고정한다 */
  widestLabel?: string;
  /** 세계의 서체 결. 전근대면 구획명을 명조로 그린다 */
  titleFont?: WorldTitleFont;
}

export default function CelebSectionHeading({
  item,
  previousItem,
  nextItem,
  onNavigate,
  chapterLabel,
  numerals = "arabic",
  widestLabel,
  titleFont = "sans",
}: CelebSectionHeadingProps) {
  const t = useTranslations("celebPage");

  const numeralClass = `${
    numerals === "hanja"
      ? "text-[21px] font-black md:text-[25px]"
      : "font-mono text-[16px] font-bold md:text-[18px]"
  } leading-none text-accent/85`;
  const numeralStyle = numerals === "hanja" ? { fontFamily: HANJA_FONT } : undefined;
  const labelStyle = titleFont === "serif" ? { fontFamily: WORLD_SERIF_FONT } : undefined;

  return (
    <header className={styles.heading}>
      <button
        type="button"
        onClick={() => previousItem && onNavigate(previousItem.target)}
        disabled={!previousItem}
        aria-label={
          previousItem
            ? t("previousSection", { name: previousItem.label })
            : t("noPreviousSection")
        }
        className={styles.navButton}
      >
        <ChevronLeft size={22} strokeWidth={1.7} aria-hidden />
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
              {chapterLabel && (
                <span className={numeralClass} style={numeralStyle}>
                  {chapterLabel}
                </span>
              )}
              <span className={styles.label} style={labelStyle}>{widestLabel ?? item.label}</span>
            </span>
            <span className="absolute inset-0 flex items-center justify-center gap-2.5 whitespace-nowrap">
              {chapterLabel && (
                <span aria-hidden className={numeralClass} style={numeralStyle}>
                  {chapterLabel}
                </span>
              )}
              <span className={`${styles.label} group-hover:text-accent`} style={labelStyle}>{item.label}</span>
            </span>
          </button>
        </h2>
      </div>

      <button
        type="button"
        onClick={() => nextItem && onNavigate(nextItem.target)}
        disabled={!nextItem}
        aria-label={
          nextItem
            ? t("nextSection", { name: nextItem.label })
            : t("noNextSection")
        }
        className={styles.navButton}
      >
        <ChevronRight size={22} strokeWidth={1.7} aria-hidden />
      </button>
    </header>
  );
}
