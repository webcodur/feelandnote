"use client";

import { Link } from "@/i18n/navigation";

import CardCover from "./CardCover";
import CardHeader from "./CardHeader";
import CardModals from "./CardModals";
import CornerAccents from "./CornerAccents";
import type { ContentCardProps } from "../types";
import type { ContentCardState } from "../useContentCardState";

interface DefaultLayoutProps {
  props: ContentCardProps;
  state: ContentCardState;
}

export default function DefaultLayout({ props, state }: DefaultLayoutProps) {
  const {
    title,
    creator,
    href,
    selectable,
    onClick,
    className,
  } = props;

  const {
    aspectClass,
    showInfo,
    displayTitle,
    displayCreator,
    handleClick,
    editionUnavailable,
    isBadgeHovered,
    selectableClass,
  } = state;

  const cardContent = (
    <>
      {props.showHeader !== false && <CardHeader props={props} state={state} />}
      <div className={`relative ${aspectClass} overflow-hidden bg-bg-secondary`}>
        <CardCover props={props} state={state} />
      </div>

      {showInfo && (
        <div className="bg-black/20 border-t border-white/[0.04] text-center">
          <div className="p-2 md:p-2.5 pb-1.5 flex items-center justify-center min-h-[44px] md:min-h-[52px]">
            <h3 className={`text-xs md:text-sm font-semibold text-text-primary line-clamp-2 leading-tight text-center ${!isBadgeHovered ? "group-hover:text-accent" : ""}`}>
              {editionUnavailable ? title : displayTitle}
            </h3>
          </div>
          <div className="h-px bg-white/10" />
          <div className="p-1.5 md:p-2 pt-1.5">
            <p className="text-xs text-text-secondary line-clamp-1 text-center">
              {editionUnavailable ? (creator ? creator.replace(/\^/g, ", ") : "\u00A0") : (displayCreator ? displayCreator.replace(/\^/g, ", ") : "\u00A0")}
            </p>
          </div>
        </div>
      )}
    </>
  );

  const containerClass = `group relative flex flex-col bg-bg-card border border-white/[0.06] rounded-xl overflow-hidden cursor-pointer ${selectableClass} ${className || ""}`;

  if (href && !selectable) {
    return (
      <div className="relative">
        {/* 모서리 장식은 카드 본체에만 단다 — 아래 덧붙은 모듈(구매 값표 등)까지
            group/card가 덮으면 아랫단에 올려도 카드가 함께 빛나 한 덩어리가 된다 */}
        <div className="relative group/card">
          <CornerAccents />
          <Link href={href} className={containerClass} onClick={handleClick}>
            {cardContent}
          </Link>
        </div>
        {/* 구매 단추 영역은 끌기 판정에서 뺀다 — 단추 위의 클릭이 끌기로 삼켜지지 않게 */}
        {props.posterFooterNode && <div className="mt-2" data-no-drag>{props.posterFooterNode}</div>}
        {props.effectsEnabled !== false && <CardModals props={props} state={state} />}
      </div>
    );
  }

  // 모서리 장식은 group/card에 반응한다 — href 분기와 같은 이름을 써야 onClick 카드에도 hover 장식이 선다
  return (
    <div className="relative">
      <div className="relative group/card">
        <CornerAccents />
        <div
          className={containerClass}
          onClick={handleClick}
          role={onClick ? "button" : undefined}
          tabIndex={onClick ? 0 : undefined}
          onKeyDown={onClick ? (e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onClick();
            }
          } : undefined}
        >
          {cardContent}
        </div>
      </div>
      {props.posterFooterNode && <div className="mt-2" data-no-drag>{props.posterFooterNode}</div>}
      {props.effectsEnabled !== false && <CardModals props={props} state={state} />}
    </div>
  );
}
