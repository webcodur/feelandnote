"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";
import ClassicalBox from "@/components/ui/ClassicalBox";
import { DecorativeLabel } from "@/components/ui";
import { SacredFlameIcon } from "@/components/ui/icons/neo-pantheon";

import type { ServiceItem, ServiceTarget } from "./celebServiceItems";
import styles from "./CelebAtlasRails.module.css";

interface SharedProps {
  items: ServiceItem[];
  activeSectionId: string;
}

interface NavigationProps extends SharedProps {
  onNavigate: (target: ServiceTarget) => void;
  avatarUrl: string | null;
  nickname: string;
  title: string | null;
  professionLabel: string | null;
}

const NAV_ITEM_HEIGHT = 54;
/** 목록 밖에 있는 맨 위 초상 자리. 목록 항목은 0부터 센다. */
const PROFILE_SPOT = -1;
const NAV_GROUP_START_KEYS = new Set([
  "connections",
  "analysis",
  "media",
  "guestbook",
]);

export function CelebAtlasNavigation({
  items,
  activeSectionId,
  onNavigate,
  avatarUrl,
  nickname,
  title,
  professionLabel,
}: NavigationProps) {
  const t = useTranslations("celebPage");
  const navigationItems = items.filter((item) => item.key !== "introduction");
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const railRef = useRef<HTMLDivElement>(null);
  const activeItemRef = useRef<HTMLButtonElement>(null);
  const scopeRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const introductionTarget = items.find(
    (item) => item.target.sectionId === "introduction",
  )?.target;

  /* 포커스 박스는 마우스를 우선 따르고, 손을 떼면 지금 보고 있는 장으로 돌아온다.
     맨 위 초상도 같은 자리 취급이라 박스가 초상 칸까지 흘러간다. */
  const activeIndex = activeSectionId === "introduction"
    ? PROFILE_SPOT
    : navigationItems.findIndex(
        (item) => item.target.sectionId === activeSectionId,
      );
  const spotIndex = hoveredIndex ?? activeIndex;
  const [spotRect, setSpotRect] = useState<{ top: number; height: number } | null>(null);

  /* 초상 칸은 이름 줄 수에 따라 높이가 달라져 값으로 못 박을 수 없다. 실제 크기를 재되
     ResizeObserver가 관찰 직후 스스로 한 번 불러 주므로 첫 측정도 그 콜백에서 이뤄진다. */
  useEffect(() => {
    const scope = scopeRef.current;
    if (!scope) return;

    const measure = () => {
      const target = spotIndex === PROFILE_SPOT
        ? profileRef.current
        : itemRefs.current[spotIndex] ?? null;
      setSpotRect(
        target ? { top: target.offsetTop, height: target.offsetHeight } : null,
      );
    };

    const observer = new ResizeObserver(measure);
    observer.observe(scope);
    return () => observer.disconnect();
  }, [spotIndex, navigationItems.length]);

  // 짧은 화면에서도 현재 장이 사이드바의 내부 스크롤 아래에 숨지 않게 맞춘다.
  useEffect(() => {
    const rail = railRef.current;
    const activeItem = activeItemRef.current;
    if (!rail || !activeItem || rail.scrollHeight <= rail.clientHeight) return;

    const railRect = rail.getBoundingClientRect();
    const itemRect = activeItem.getBoundingClientRect();
    const safeInset = 12;

    if (itemRect.bottom > railRect.bottom - safeInset) {
      rail.scrollTop += itemRect.bottom - railRect.bottom + safeInset;
    } else if (itemRect.top < railRect.top + safeInset) {
      rail.scrollTop -= railRect.top - itemRect.top + safeInset;
    }
  }, [activeSectionId]);

  return (
    <aside className="hidden xl:sticky xl:top-28 xl:block min-w-0 self-start">
      <div ref={railRef} className={styles.profileRail}>
        <ClassicalBox
          hover={false}
          className={cn(styles.profileCard, "flex flex-col items-center")}
        >
          <DecorativeLabel
            label={t("atlasProfile")}
            className={styles.profileEyebrow}
          />

          <div ref={scopeRef} className={styles.focusScope}>
            {spotRect && (
              <span
                aria-hidden
                className={styles.profileNavSpot}
                style={{
                  height: spotRect.height,
                  transform: `translateY(${spotRect.top}px)`,
                }}
              />
            )}

          <button
            ref={profileRef}
            type="button"
            onClick={() => introductionTarget && onNavigate(introductionTarget)}
            onMouseEnter={() => setHoveredIndex(PROFILE_SPOT)}
            onMouseLeave={() => setHoveredIndex(null)}
            onFocus={() => setHoveredIndex(PROFILE_SPOT)}
            onBlur={() => setHoveredIndex(null)}
            aria-current={activeIndex === PROFILE_SPOT ? "location" : undefined}
            className={cn(
              styles.profileButton,
              spotIndex === PROFILE_SPOT && styles.profileButtonActive,
            )}
          >
            <span className={styles.portraitStage}>
              <span className={styles.portraitHalo} aria-hidden />
              <span className={styles.portraitFrame}>
                <span className={styles.portraitImage}>
                  {avatarUrl ? (
                    <Image
                      src={avatarUrl}
                      alt={nickname}
                      width={112}
                      height={112}
                      className="h-full w-full object-cover"
                      unoptimized
                    />
                  ) : (
                    <span className={styles.portraitFallback}>
                      {nickname.charAt(0)}
                    </span>
                  )}
                </span>
              </span>
              <span className={styles.celebSeal} aria-hidden>
                <SacredFlameIcon size={16} />
              </span>
            </span>

            <span className={styles.profileCopy}>
              <span className={styles.profileName}>{nickname}</span>
              {title && <span className={styles.profileTitle}>{title}</span>}
              {professionLabel && (
                <span className={styles.profileProfession}>{professionLabel}</span>
              )}
            </span>
          </button>

          <div className={styles.profileDivider} />

          <nav
            aria-label={t("serviceGuideTitle")}
            className={styles.profileNav}
            onMouseLeave={() => setHoveredIndex(null)}
          >
            <div className={styles.profileNavList}>
              {navigationItems.map((item, index) => {
                const Icon = item.icon;
                const isActive = item.target.sectionId === activeSectionId;
                const isReady = item.ready;
                const startsGroup = NAV_GROUP_START_KEYS.has(item.key);

                return (
                  <button
                    key={item.key}
                    ref={(el) => {
                      itemRefs.current[index] = el;
                      if (isActive) activeItemRef.current = el;
                    }}
                    type="button"
                    onClick={() => onNavigate(item.target)}
                    onMouseEnter={() => setHoveredIndex(index)}
                    onFocus={() => setHoveredIndex(index)}
                    onBlur={() => setHoveredIndex(null)}
                    aria-current={isActive ? "location" : undefined}
                    aria-label={
                      isReady
                        ? item.label
                        : `${item.label}, ${t("atlasUnavailable")}. ${t("atlasGuideOpenAction")}`
                    }
                    className={cn(
                      styles.profileNavItem,
                      startsGroup && styles.profileNavItemGroupStart,
                      isActive && styles.profileNavItemActive,
                      !isReady && styles.profileNavItemPending,
                    )}
                    style={{ height: NAV_ITEM_HEIGHT }}
                  >
                    <Icon size={24} strokeWidth={1.8} aria-hidden />
                    <span className={styles.profileNavLabel}>{item.label}</span>
                    {isReady ? (
                      <span className={styles.profileNavChapter} aria-hidden>
                        {item.chapter}
                      </span>
                    ) : (
                      <span className={styles.profileNavState}>
                        <span className={styles.profileNavStateLocked}>
                          {t("atlasUnavailableShort")}
                        </span>
                        <span className={styles.profileNavStatePreparing}>
                          {t("atlasGuideOpenShort")}
                        </span>
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </nav>
          </div>
        </ClassicalBox>
      </div>
    </aside>
  );
}
