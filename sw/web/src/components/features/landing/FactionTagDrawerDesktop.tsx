"use client";

import { useState, useEffect } from "react";
import { ChevronDown, Lock, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FeaturedTag } from "@/actions/home";
import { useTranslations } from "next-intl";
import type { Locale } from "@/types/locale";
import { PROFESSION_ICONS } from "@/constants/professionIcons";
import { topLevelTags, childTags, groupCelebCount } from "./factionGrouping";

interface FactionTagDrawerDesktopProps {
  tags: FeaturedTag[];
  activeIndex: number;
  onChange: (idx: number) => void;
  isExplore: boolean;
  activeDescription: string;
  locale: Locale;
}

export default function FactionTagDrawerDesktop({
  tags,
  activeIndex,
  onChange,
  locale,
}: FactionTagDrawerDesktopProps) {
  const t = useTranslations("landing");
  const [isOpen, setIsOpen] = useState(false);
  // 현재 선택된 태그가 그룹 자식이면 그 그룹을 펼친 채로 시작한다.
  const [expandedGroup, setExpandedGroup] = useState<string | null>(
    tags[activeIndex]?.parentSlug ?? null
  );

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // 최상위(그룹 헤더 + 무소속)만 나열하고, 펼친 그룹의 자식을 뒤에 잇는다.
  const topLevel = topLevelTags(tags);
  const renderItems: Array<{ kind: "group" | "tag"; tag: FeaturedTag; idx: number; isChild?: boolean }> = [];
  for (const { tag, idx } of topLevel) {
    if (tag.isGroup) {
      renderItems.push({ kind: "group", tag, idx });
      if (expandedGroup === tag.slug) {
        for (const c of childTags(tags, tag.slug ?? "")) {
          renderItems.push({ kind: "tag", tag: c.tag, idx: c.idx, isChild: true });
        }
      }
    } else {
      renderItems.push({ kind: "tag", tag, idx });
    }
  }

  return (
    <>
      {/* Floating Button Positioned at Top-Left */}
      <div className="absolute left-6 top-2 md:left-10 md:top-3 z-[60]">
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 transition-all group backdrop-blur-md shadow-lg"
        >
          <span className="text-sm font-medium text-text-primary group-hover:text-accent font-sans drop-shadow-sm">
            {t("viewAllThemes") || "View All Themes"}
          </span>
          <ChevronDown
            size={16}
            className={cn(" transition-transform duration-300", isOpen && "rotate-180")}
          />
        </button>
      </div>

      {/* Full-screen Modal Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 md:p-12 animate-in fade-in duration-300">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setIsOpen(false)} />

          {/* Modal Content */}
          <div className="relative w-full max-w-5xl max-h-[85vh] flex flex-col bg-[#111] border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-white/10 bg-white/5">
              <h3 className="text-lg md:text-xl font-serif font-bold text-white tracking-wide">
                {t("selectTheme") || "Select Theme"}
              </h3>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 hover:text-white hover:bg-white/10 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Scrollable Grid */}
            <div className="overflow-y-auto p-5 md:p-6 hide-scrollbar">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {renderItems.map((item) =>
                  item.kind === "group" ? (
                    <DrawerGroupButton
                      key={item.tag.id}
                      tag={item.tag}
                      tags={tags}
                      expanded={expandedGroup === item.tag.slug}
                      onToggle={() =>
                        setExpandedGroup((prev) =>
                          prev === item.tag.slug ? null : item.tag.slug ?? null
                        )
                      }
                      locale={locale}
                    />
                  ) : (
                    <DrawerTagButton
                      key={item.tag.id}
                      tag={item.tag}
                      idx={item.idx}
                      isActive={activeIndex === item.idx}
                      isChild={item.isChild}
                      onChange={onChange}
                      onClose={() => setIsOpen(false)}
                      locale={locale}
                      t={t}
                    />
                  )
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ─── 그룹 헤더 버튼 (자식 펼침 토글) ─── */
function DrawerGroupButton({
  tag,
  tags,
  expanded,
  onToggle,
  locale,
}: {
  tag: FeaturedTag;
  tags: FeaturedTag[];
  expanded: boolean;
  onToggle: () => void;
  locale: Locale;
}) {
  const t = useTranslations("landing");
  const tagName = locale === "en" ? tag.name_en?.trim() || t("unnamedFaction") : tag.name;
  const themeCount = childTags(tags, tag.slug ?? "").length;
  const totalCelebs = groupCelebCount(tags, tag.slug ?? "");
  return (
    <button
      onClick={onToggle}
      aria-expanded={expanded}
      className="col-span-full w-full flex items-center gap-3 py-1.5 group text-left"
      style={{ "--tag-color": tag.color } as React.CSSProperties}
    >
      <span className="flex items-center gap-2 flex-shrink-0">
        <span
          className="w-2 h-2 rounded-sm rotate-45 transition-transform duration-300 group-hover:scale-125"
          style={{ backgroundColor: "var(--tag-color)" }}
        />
        <h4 className="font-serif font-bold tracking-wide text-[15px] text-white group-hover:text-[color:var(--tag-color)] transition-colors duration-300">
          {tagName}
        </h4>
      </span>
      <span className="text-[11px] font-medium text-white/40 flex-shrink-0">
        {locale === "en" ? `${themeCount} themes · ${totalCelebs}` : `${themeCount}개 테마 · ${totalCelebs}명`}
      </span>
      <span className="flex-1 h-px bg-gradient-to-r from-white/15 to-transparent" />
      <ChevronDown
        size={16}
        className={cn("flex-shrink-0 text-white/40 group-hover:text-[color:var(--tag-color)] transition-all duration-300", expanded && "rotate-180")}
      />
    </button>
  );
}

/* ─── 개별 테마 버튼 ─── */
function DrawerTagButton({
  tag,
  idx,
  isActive,
  isChild,
  onChange,
  onClose,
  locale,
  t,
}: {
  tag: FeaturedTag;
  idx: number;
  isActive: boolean;
  isChild?: boolean;
  onChange: (idx: number) => void;
  onClose: () => void;
  locale: Locale;
  t: ReturnType<typeof useTranslations>;
}) {
  const isUpcoming = !tag.is_featured;
  const tagName = locale === "en" ? tag.name_en?.trim() || t("unnamedFaction") : tag.name;
  const celebCount = tag.celebs?.length ?? 0;
  const professions = !isUpcoming
    ? [...new Set(tag.celebs?.map((c) => c.profession).filter((p): p is string => Boolean(p)) ?? [])]
    : [];
  return (
    <button
      onClick={() => {
        if (!isUpcoming) {
          onChange(idx);
          onClose();
        }
      }}
      disabled={isUpcoming}
      className={cn(
        "relative flex flex-col items-start justify-between min-h-[92px] p-4 md:p-5 rounded-2xl border text-left overflow-hidden group",
        isChild && "ml-2",
        isActive
          ? "border-accent/50 bg-accent/5 shadow-[0_0_15px_rgba(255,184,0,0.15)] ring-1 ring-accent/30"
          : isUpcoming
            ? "bg-black/40 border-white/5 opacity-50 cursor-not-allowed"
            : "border-white/10 hover:border-white/60 hover:shadow-lg"
      )}
      style={{
        backgroundColor: isActive ? undefined : isUpcoming ? undefined : `${tag.color}0A`,
      }}
    >
      {/* Immediate Background Hover Overlay */}
      {!isUpcoming && !isActive && (
        <div className="absolute inset-0 bg-transparent group-hover:bg-white/5 pointer-events-none z-0" />
      )}

      {/* Ambient Glow Effects (Delayed) */}
      {!isUpcoming && !isActive && (
        <div
          className="absolute -top-12 -right-12 w-40 h-40 rounded-[100%] blur-[45px] opacity-10 pointer-events-none transition-all duration-700 delay-150 group-hover:opacity-40 group-hover:scale-125 z-0"
          style={{ backgroundColor: tag.color }}
        />
      )}

      <div className="flex items-start justify-between w-full relative z-10 gap-2 mb-2">
        <span
          className={cn(
            "font-sans font-bold tracking-wide text-[14.5px] leading-snug line-clamp-2",
            isActive ? "text-accent" : "text-white/90 group-hover:text-white"
          )}
        >
          {tagName}
          {celebCount > 0 && (
            <span
              className={cn("ml-1 font-normal text-[12px]", isActive ? "text-accent/60" : "")}
            >
              ({celebCount})
            </span>
          )}
        </span>
        {isUpcoming && <Lock size={13} className="flex-shrink-0 mt-0.5" />}
      </div>

      <div className="flex items-end justify-between w-full relative z-10 mt-auto">
        <div className="flex items-center gap-1.5 opacity-60 group-hover:opacity-100">
          {professions.slice(0, 4).map((p) => {
            const Icon = PROFESSION_ICONS[p as keyof typeof PROFESSION_ICONS];
            if (!Icon) return null;
            return <Icon key={p} size={15} className="text-white" />;
          })}
        </div>
        {isUpcoming && (
          <span className="text-[10px] uppercase font-sans tracking-wider font-semibold">
            Soon
          </span>
        )}
      </div>

      {isUpcoming && (
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity backdrop-blur-sm z-20">
          <span className="text-[11px] text-white/90 font-medium px-3 py-1 bg-black/80 rounded border border-white/10">
            {t("contentInPreparation") || "기대해주세요"}
          </span>
        </div>
      )}
    </button>
  );
}
