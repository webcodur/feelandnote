"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useTranslations, useLocale } from "next-intl";

/* 모달은 칩을 눌렀을 때만 필요하다 — 정적으로 임포트하면 카드·명부가 쓰는 모든 자리의
   초기 번들에 ClassicalBox 등 모달 체인이 실린다. 사용 시점에 나눠 불러온다. */
const Modal = dynamic(() => import("@/components/ui/Modal"));
import {
  TREND_CHIP_BASE, TREND_CHIP_DIRECT, TREND_CHIP_PLAIN, TREND_CHIP_GOLD, TREND_CHIP_FLAME_BG,
  trendEdgeDelay,
} from "@/components/shared/CelebCard.styles";
import { TREND_PERIOD_HOURS } from "@/constants/trendCountries";
import { useNationalityLabel } from "@/hooks/useFilterLabels";
import type { CelebTrendMatch } from "@/types/home";

interface TrendMatchChipProps {
  match: CelebTrendMatch;
  /** 모달 머리에 세울 인물 이름 */
  name: string;
  /** 칩 모양 — auto: 화염 애니메이션(설명대 범례) / plain: 카드 테두리가 이미 표지인 자리 / gold: 금박 테두리(홈) */
  variant?: "auto" | "plain" | "gold";
  className?: string;
}

/* top X 칩 — 누르면 이 인물이 트렌드에 오른 근거(급상승 검색어·순위·연관 경위)를 모달로 보여준다.
   카드·명부 링크 안에 놓이므로 클릭이 링크 이동으로 번지지 않게 막는다(모달은 포털이라 링크 밖). */
export default function TrendMatchChip({ match, name, variant = "auto", className }: TrendMatchChipProps) {
  const t = useTranslations("shared.celeb");
  const locale = useLocale();
  const getNationality = useNationalityLabel();
  const [open, setOpen] = useState(false);
  /* 렌더 중 Date.now()는 불순이라 열린 시각을 누를 때 잡아 둔다 — 「몇 시간 전」의 기준점 */
  const [openedAt, setOpenedAt] = useState(0);
  const chipVariant = variant === "plain" ? TREND_CHIP_PLAIN
    : variant === "gold" ? TREND_CHIP_GOLD
      : TREND_CHIP_DIRECT;
  const chipHover = "hover:border-white/50 hover:text-text-primary";
  const volumeText = new Intl.NumberFormat(locale, { notation: "compact", maximumFractionDigits: 0 }).format(match.volume);
  const hoursAgo = Math.max(1, Math.round((openedAt - match.started) / 3_600_000));
  const agoText = new Intl.RelativeTimeFormat(locale, { numeric: "always" })
    .format(hoursAgo < 48 ? -hoursAgo : -Math.round(hoursAgo / 24), hoursAgo < 48 ? "hour" : "day");
  return (
    <>
      <button
        type="button"
        aria-label={`${t("trendChipRank", { rank: match.rank })} · ${t("trendInfoOpen")}`}
        className={`${TREND_CHIP_BASE} ${chipVariant} ${chipHover} cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-accent ${className ?? ""}`}
        style={variant === "auto"
          ? { background: TREND_CHIP_FLAME_BG, animationDelay: trendEdgeDelay(name) }
          : undefined}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpenedAt(Date.now());
          setOpen(true);
        }}
      >
        {t("trendChipRank", { rank: match.rank })}
      </button>
      {open && (
        <Modal
          isOpen
          onClose={() => setOpen(false)}
          title={t("trendChipDirect", { rank: match.rank })}
          size="sm"
          animateHeight={false}
        >
          <div className="space-y-3 break-keep p-6 text-sm leading-relaxed">
            <p className="font-semibold text-text-primary">{name}</p>
            <p className="text-text-secondary">{t("trendModalQuery", { title: match.title, rank: match.rank })}</p>
            <p className="text-text-primary">{t("trendModalStats", { volume: volumeText, ago: agoText })}</p>
            <p className="text-text-secondary">
              {t("trendModalBodyDirect", { country: getNationality(match.country) })}
            </p>
            <a
              href={`https://trends.google.com/trending?geo=${match.country}&hours=${TREND_PERIOD_HOURS}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center rounded text-xs text-text-secondary underline decoration-white/20 underline-offset-4 hover:text-accent hover:decoration-accent outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              {t("trendModalSource")} · {t("trendModalPeriod", { days: TREND_PERIOD_HOURS / 24 })}
            </a>
          </div>
        </Modal>
      )}
    </>
  );
}
