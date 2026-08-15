import React from "react";
import { interpolate } from "remotion";
import type { Orientation } from "../types";
import { FONT, FONT_SERIF } from "../constants";
import { ENTER_FADE_SEC, f } from "../timing";
import { CaptionBackdrop } from "./CaptionBackdrop";

export const CAPTION_CENTER_NUDGE_Y = 56;

export type FactionCaptionAppearance = {
  position?: 'bottom' | 'center';
  size?: 'default' | 'large';
  font?: 'default' | 'serif';
};

/** 인물 자막형과 개별 장면 해설이 공유하는 위치·크기·글꼴 해석. */
export function resolveFactionCaptionAppearance(
  orientation: Orientation,
  appearance: FactionCaptionAppearance,
) {
  const centered = (appearance.position ?? 'bottom') === 'center';
  const fontSize = (appearance.size ?? 'default') === 'large'
    ? (orientation === 'landscape' ? 52 : 56)
    : (orientation === 'landscape' ? 44 : 48);
  const slotStyle: React.CSSProperties = centered
    ? {
        top: 0,
        bottom: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transform: `translateY(${CAPTION_CENTER_NUDGE_Y}px)`,
      }
    : {
        bottom: orientation === 'portrait' ? 200 : 80,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
      };

  return {
    centered,
    fontSize,
    fontFamily: (appearance.font ?? 'default') === 'serif' ? FONT_SERIF : FONT,
    minHeight: Math.round(fontSize * 1.35 * 2 + 28),
    slotStyle,
    landscapeBottom: centered ? '28%' : 56,
  } as const;
}

type CaptionSwapSlotProps = {
  localFrame: number;
  captionEnterSec: number;
  exitOpacity: number;
  hasCaption: boolean;
  identity: React.ReactNode;
  caption?: React.ReactNode;
  identityPadding?: number;
  captionPadding?: number;
  captionMinHeight?: number;
  captionSlotStyle?: React.CSSProperties;
};

/** 자막형 공통 슬롯 — 신원이 먼저 뜨고 사라진 같은 자리에 자막이 이어진다. */
export const CaptionSwapSlot: React.FC<CaptionSwapSlotProps> = ({
  localFrame,
  captionEnterSec,
  exitOpacity,
  hasCaption,
  identity,
  caption,
  identityPadding = 60,
  captionPadding = 48,
  captionMinHeight,
  captionSlotStyle,
}) => {
  const clamp = {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  } as const;
  const identityIn = interpolate(
    localFrame,
    [0, f(ENTER_FADE_SEC)],
    [0, 1],
    clamp,
  );
  const identityOut = hasCaption
    ? interpolate(
        localFrame,
        [f(captionEnterSec - ENTER_FADE_SEC), f(captionEnterSec)],
        [1, 0],
        clamp,
      )
    : 1;
  const captionIn = interpolate(
    localFrame,
    [f(captionEnterSec), f(captionEnterSec + ENTER_FADE_SEC)],
    [0, 1],
    clamp,
  );
  const resolvedSlotStyle = captionSlotStyle ?? {
    top: 0,
    bottom: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transform: `translateY(${CAPTION_CENTER_NUDGE_Y}px)`,
  };

  return (
    <>
      <div
        style={{
          position: "absolute",
          zIndex: 42,
          left: identityPadding,
          right: identityPadding,
          ...resolvedSlotStyle,
          pointerEvents: "none",
          opacity: exitOpacity * identityIn * identityOut,
        }}
      >
        {identity}
      </div>
      {hasCaption && caption ? (
        <div
          style={{
            position: "absolute",
            zIndex: 40,
            left: captionPadding,
            right: captionPadding,
            ...resolvedSlotStyle,
            pointerEvents: "none",
            opacity: exitOpacity * captionIn,
            minHeight: captionMinHeight,
          }}
        >
          {caption}
        </div>
      ) : null}
    </>
  );
};

/** 자막형 신원 한 줄 — 인물 이름과 장면 제목이 같은 모양을 쓴다. */
export const CaptionIdentityText: React.FC<{
  children: React.ReactNode;
  fontSize?: number;
}> = ({ children, fontSize = 48 }) => (
  <div
    style={{
      color: "#ffffff",
      fontFamily: FONT_SERIF,
      fontSize,
      fontWeight: 800,
      letterSpacing: 1,
      lineHeight: 1.15,
      textAlign: "center",
      wordBreak: "keep-all",
      textShadow: "0 2px 8px rgba(0,0,0,0.95), 0 0 16px rgba(0,0,0,0.8)",
      WebkitTextStroke: "1px rgba(0,0,0,0.85)",
      paintOrder: "stroke fill",
    }}
  >
    <CaptionBackdrop>{children}</CaptionBackdrop>
  </div>
);
