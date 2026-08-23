/*
  파일명: /components/shared/content/creatorLink/CelebNameCandidates.tsx
  기능: 이름이 같은 등록 인물 후보를 띄우고, 사람이 직접 고르게 한다.
  책임: 한 명만 걸려도 자동으로 잇지 않는다 — 『무소유』의 법정과 촉한의 법정처럼
        이름만 겹치는 사람이 실제로 있어, 한 줄 정의와 생몰년을 보여 주고 판단을 넘긴다.
        제목 줄과 정보 칸은 글자를 잘라 내는 상자 안이라 본문에 그리면 잘린다. 화면 위에 띄운다.
*/ // ------------------------------
"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import Portal from "@/components/ui/Portal";
import { Z_INDEX } from "@/constants/zIndex";
import { formatCelebPeriod } from "@/lib/utils/celeb-period";
import type { CelebNameMatch } from "@/actions/celebs/findCelebsByNames";

const CARD_WIDTH = 288;
const GAP = 8;
/* 카드가 실제로 얼마나 커질지는 그려 봐야 알지만, 그때 자리를 다시 잡으면 한 번 껌뻑인다.
   목록 최대 높이(18rem)에 머리글을 더한 값으로 미리 어림잡는다. */
const CARD_HEIGHT_GUESS = 336;

/** 이름 옆에 붙여 띄우되 화면 밖으로 밀려나지 않게 가둔다. 아래가 좁으면 위로 연다. */
function placeCard(rect: DOMRect) {
  const roomBelow = window.innerHeight - rect.bottom;
  const openUpward = roomBelow < CARD_HEIGHT_GUESS && rect.top > roomBelow;

  return {
    left: Math.min(
      Math.max(GAP, rect.left),
      Math.max(GAP, window.innerWidth - CARD_WIDTH - GAP),
    ),
    // 위로 열 때는 아래끝을 고정한다 — 카드 높이를 몰라도 자리가 정해진다
    top: openUpward ? undefined : rect.bottom + GAP,
    bottom: openUpward ? window.innerHeight - rect.top + GAP : undefined,
    // 좁은 화면에서는 어느 쪽으로 열어도 자리가 모자란다. 남은 만큼만 쓰고 안에서 굴린다.
    maxHeight: (openUpward ? rect.top : roomBelow) - GAP * 2,
  };
}

interface CelebNameCandidatesProps {
  anchor: HTMLElement;
  /** 이름을 누른 순간의 자리. 화면이 움직이면 팝오버를 닫으므로 다시 재지 않는다 */
  anchorRect: DOMRect;
  matches: CelebNameMatch[];
  onClose: () => void;
}

export default function CelebNameCandidates({
  anchor,
  anchorRect,
  matches,
  onClose,
}: CelebNameCandidatesProps) {
  const t = useTranslations("shared.content");
  const cardRef = useRef<HTMLDivElement>(null);
  const spot = placeCard(anchorRect);

  // 바깥을 누르거나 Esc를 누르면 닫는다. 화면이 움직이면 자리가 어긋나므로 함께 닫는다.
  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (cardRef.current?.contains(target) || anchor.contains(target)) return;
      onClose();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("scroll", onClose, true);
    window.addEventListener("resize", onClose);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("scroll", onClose, true);
      window.removeEventListener("resize", onClose);
    };
  }, [anchor, onClose]);

  return (
    <Portal>
      <div
        ref={cardRef}
        role="dialog"
        aria-label={t("celebNameHeading")}
        style={{
          zIndex: Z_INDEX.popover,
          width: CARD_WIDTH,
          top: spot.top,
          bottom: spot.bottom,
          left: spot.left,
          maxHeight: spot.maxHeight,
        }}
        className="fixed flex flex-col overflow-hidden rounded-xl border border-white/15 bg-bg-card shadow-2xl"
      >
        <p className="shrink-0 border-b border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-text-tertiary">
          {t("celebNameNote")}
        </p>

        <ul className="max-h-72 min-h-0 overflow-y-auto py-1">
          {matches.map((match) => {
            const period = formatCelebPeriod(match.birthDate, match.deathDate);
            return (
              <li key={match.slug}>
                <Link
                  href={`/celeb/${match.slug}`}
                  onClick={onClose}
                  className="flex items-center gap-2.5 px-3 py-2 hover:bg-accent/[0.12] focus-visible:bg-accent/[0.12] focus-visible:outline-none"
                >
                  <span className="relative block h-10 w-10 shrink-0 overflow-hidden rounded-full border border-white/10 bg-bg-secondary">
                    {match.avatarUrl ? (
                      <Image
                        src={match.avatarUrl}
                        alt=""
                        width={40}
                        height={40}
                        className="h-full w-full object-cover"
                        unoptimized
                      />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center font-serif text-sm text-text-tertiary">
                        {match.nickname.charAt(0)}
                      </span>
                    )}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline gap-1.5">
                      <span className="truncate text-sm font-bold text-text-primary">
                        {match.nickname}
                      </span>
                      {period && (
                        <span className="shrink-0 font-mono text-[11px] text-text-tertiary">
                          {period}
                        </span>
                      )}
                    </span>
                    {match.headline && (
                      <span className="mt-0.5 line-clamp-2 text-xs leading-snug text-text-secondary">
                        {match.headline}
                      </span>
                    )}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </Portal>
  );
}
