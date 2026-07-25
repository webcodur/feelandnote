"use client";

import { useState, useEffect } from "react";
import { ChevronDown, Lock, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FeaturedTag } from "@/actions/home";
import { useTranslations } from "next-intl";
import type { Locale } from "@/types/locale";
import { PROFESSION_ICONS } from "@/constants/professionIcons";
import { topLevelTags, childTags, groupCelebCount } from "./factionGrouping";

interface FactionTagSheetMobileProps {
  tags: FeaturedTag[];
  activeIndex: number;
  onChange: (idx: number) => void;
  locale: Locale;
}

export default function FactionTagSheetMobile({
  tags,
  activeIndex,
  onChange,
  locale,
}: FactionTagSheetMobileProps) {
  const t = useTranslations("landing");
  const [isOpen, setIsOpen] = useState(false);
  const activeTag = tags[activeIndex];
  // 현재 선택된 태그가 그룹 자식이면 그 그룹을 펼친 채로 시작한다.
  const [expandedGroup, setExpandedGroup] = useState<string | null>(activeTag?.parentSlug ?? null);

  // Prevent body scroll when sheet is open
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

  // When selection changes, close the sheet
  useEffect(() => {
    setIsOpen(false);
  }, [activeIndex]);

  const activeTagName = locale === "en" ? activeTag?.name_en ?? activeTag?.name : activeTag?.name;

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
    <div className="w-full relative px-4 pb-4 border-b border-white/5 mb-4">
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-white/5 border border-white/10 active:bg-white/10 transition-colors"
      >
        <div className="flex items-center">
          <span className="text-[15px] font-sans font-bold text-white">{activeTagName}</span>
        </div>
        <ChevronDown size={18} className="text-text-tertiary" />
      </button>

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm transition-opacity duration-300"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Bottom Sheet */}
      <div
        className={cn(
          "fixed inset-x-0 bottom-0 z-[101] bg-[#111111] rounded-t-3xl border-t border-white/10 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] transition-transform duration-300 ease-out flex flex-col max-h-[85vh]",
          isOpen ? "translate-y-0" : "translate-y-full"
        )}
      >
        {/* Handle Bar */}
        <div className="w-full flex justify-center pt-3 pb-1" onClick={() => setIsOpen(false)}>
          <div className="w-12 h-1.5 rounded-full bg-white/20" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
          <h3 className="text-[17px] font-sans font-bold text-white tracking-wide">
            {t("selectTheme") || "Select Theme"}
          </h3>
          <button
            onClick={() => setIsOpen(false)}
            className="p-2 -mr-2 text-text-tertiary hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable List */}
        <div className="overflow-y-auto px-4 py-4 pb-10 overscroll-contain flex flex-col gap-2">
          {renderItems.map((item) =>
            item.kind === "group" ? (
              <SheetGroupRow
                key={item.tag.id}
                tag={item.tag}
                tags={tags}
                expanded={expandedGroup === item.tag.slug}
                onToggle={() =>
                  setExpandedGroup((prev) => (prev === item.tag.slug ? null : item.tag.slug ?? null))
                }
                locale={locale}
              />
            ) : (
              <SheetTagRow
                key={item.tag.id}
                tag={item.tag}
                idx={item.idx}
                isActive={activeIndex === item.idx}
                isChild={item.isChild}
                onChange={onChange}
                locale={locale}
              />
            )
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── 그룹 헤더 행 (자식 펼침 토글) ─── */
function SheetGroupRow({
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
  const tagName = locale === "en" ? tag.name_en ?? tag.name : tag.name;
  const themeCount = childTags(tags, tag.slug ?? "").length;
  const totalCelebs = groupCelebCount(tags, tag.slug ?? "");
  return (
    <button
      onClick={onToggle}
      aria-expanded={expanded}
      className="w-full flex items-center gap-2.5 py-2 mt-1 group text-left"
      style={{ "--tag-color": tag.color } as React.CSSProperties}
    >
      <span
        className="w-2 h-2 rounded-sm rotate-45 flex-shrink-0"
        style={{ backgroundColor: "var(--tag-color)" }}
      />
      <h4 className="font-serif font-bold text-[15px] tracking-wide flex-shrink-0 text-white">
        {tagName}
      </h4>
      <span className="text-[11px] text-white/40 flex-shrink-0">
        {locale === "en" ? `${themeCount} themes · ${totalCelebs}` : `${themeCount}개 테마 · ${totalCelebs}명`}
      </span>
      <span className="flex-1 h-px bg-gradient-to-r from-white/15 to-transparent" />
      <ChevronDown
        size={16}
        className={cn("flex-shrink-0 text-white/40 transition-transform duration-300", expanded && "rotate-180")}
      />
    </button>
  );
}

/* ─── 개별 테마 행 ─── */
function SheetTagRow({
  tag,
  idx,
  isActive,
  isChild,
  onChange,
  locale,
}: {
  tag: FeaturedTag;
  idx: number;
  isActive: boolean;
  isChild?: boolean;
  onChange: (idx: number) => void;
  locale: Locale;
}) {
  const isUpcoming = !tag.is_featured;
  const tagName = locale === "en" ? tag.name_en ?? tag.name : tag.name;
  const professions = !isUpcoming
    ? [...new Set(tag.celebs?.map((c) => c.profession).filter((p): p is string => Boolean(p)) ?? [])]
    : [];
  return (
    <button
      onClick={() => !isUpcoming && onChange(idx)}
      disabled={isUpcoming}
      className={cn(
        "flex items-center justify-between w-full px-4 py-3.5 rounded-2xl transition-all duration-200 text-left",
        isChild && "ml-3",
        isActive
          ? "bg-accent/10 border border-accent/30 shadow-inner"
          : isUpcoming
            ? "bg-black/20 opacity-40 cursor-not-allowed border border-transparent"
            : "border border-white/5 active:bg-white/10"
      )}
      style={{
        backgroundColor: isActive ? undefined : isUpcoming ? undefined : `${tag.color}10`,
      }}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <span
          className={cn(
            "font-sans font-semibold text-[15px] tracking-wide truncate",
            isActive ? "text-accent" : "text-white/90"
          )}
        >
          {tagName}
        </span>
      </div>
      {professions.length > 0 && (
        <div className="flex items-center gap-1 ml-auto pl-2 flex-shrink-0">
          {professions.slice(0, 4).map((p) => {
            const Icon = PROFESSION_ICONS[p as keyof typeof PROFESSION_ICONS];
            if (!Icon) return null;
            return <Icon key={p} size={13} className="text-text-tertiary/60" />;
          })}
        </div>
      )}

      {isUpcoming && (
        <div className="flex items-center gap-1.5 text-text-tertiary flex-shrink-0">
          <span className="text-[10px] uppercase font-sans tracking-wider font-semibold">Soon</span>
          <Lock size={12} />
        </div>
      )}
    </button>
  );
}
