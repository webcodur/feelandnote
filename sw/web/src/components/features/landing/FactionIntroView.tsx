"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { Locale } from "@/types/locale";
import { Lock, ExternalLink, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FeaturedTag } from "@/actions/home";
import { toTeamImages } from "@feelandnote/shared/lib/faction-team-image";
import { PROFESSION_ICONS } from "@/constants/professionIcons";
import Avatar from "@/components/ui/Avatar";
import { Link } from "@/i18n/navigation";
import { splitByFiction, childTags, groupCelebCount } from "./factionGrouping";

interface FactionIntroViewProps {
  tags: FeaturedTag[];
  onSelect: (idx: number) => void;
  locale: Locale;
}

export default function FactionIntroView({
  tags,
  onSelect,
  locale,
}: FactionIntroViewProps) {
  const tLine = useTranslations("landing");
  const t = useTranslations("explore.faction.intro");

  // 펼쳐진 그룹 slug 집합. 섹션 헤더형은 여러 그룹을 동시에 펼칠 수 있다. AI는 기본 펼침.
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(["ai"]));
  const toggle = (slug: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });

  /*
    실존 인물 쪽과 이야기 속 인물 쪽을 가른다. 신화·서사시 인물은 실존 인물 목록에서는 빠지지만
    도감에서는 테마별 진열이라 함께 둬도 맥락이 분명하다. 다만 뒤섞이지 않게 가로선을 긋고
    아래에 따로 모은다.
  */
  const { real, fiction } = splitByFiction(tags);
  const groupSections = real.filter(({ tag }) => tag.isGroup);
  const loners = real.filter(({ tag }) => !tag.isGroup);
  const fictionSections = fiction.filter(({ tag }) => tag.isGroup);
  const fictionLoners = fiction.filter(({ tag }) => !tag.isGroup);

  return (
    <div className="w-full relative min-h-[80vh] flex flex-col items-center pt-16 md:pt-24 pb-20 px-4 md:px-8">
      {/* Intro Hero Section */}
      <div className="max-w-3xl mx-auto flex flex-col items-center justify-center text-center relative mb-16">
        {/* Subtle background glow effect */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[150px] bg-accent/10 rounded-[100%] blur-[80px] pointer-events-none" />

        <div className="flex items-center gap-3 mb-6 opacity-80">
          <span className="w-8 md:w-16 h-[1px] bg-gradient-to-r from-transparent to-accent/50" />
          <span className="text-[12px] md:text-[13px] font-cinzel text-accent tracking-[0.25em] uppercase font-bold">
            {tLine("factionCollection")}
          </span>
          <span className="w-8 md:w-16 h-[1px] bg-gradient-to-l from-transparent to-accent/50" />
        </div>

        <h1 className="text-4xl md:text-5xl font-serif font-bold text-white mb-6 tracking-wide relative z-10 drop-shadow-md leading-tight">
          {t("title") || "시대를 거쳐온 감상의 궤적"}
        </h1>

        <p className="text-text-secondary text-base md:text-lg max-w-2xl leading-[1.8] opacity-90 text-pretty relative z-10 whitespace-pre-line">
          {t("description") ||
            "시대와 분야를 넘어 하나의 주제로 엮인 인물들의 서재를 탐색해보세요.\n선명하게 빛나는 그들의 기록이 당신의 새로운 감상을 안내합니다."}
        </p>
      </div>

      {/* Grid of Tags */}
      <div className="w-full max-w-6xl mx-auto relative z-10">
        <div className="flex items-center gap-4 mb-8">
          <h2 className="text-xl md:text-2xl font-serif font-bold text-white tracking-wide">
            {t("select") || "테마 선택"}
          </h2>
          <div className="h-[1px] flex-1 bg-gradient-to-r from-white/10 to-transparent" />
        </div>

        <div className="flex flex-col gap-7 md:gap-9">
          {groupSections.map(({ tag }) => (
            <GroupSection
              key={tag.id}
              tag={tag}
              tags={tags}
              expanded={expanded.has(tag.slug ?? "")}
              onToggle={() => toggle(tag.slug ?? "")}
              onSelect={onSelect}
              locale={locale}
              t={t}
              tLine={tLine}
            />
          ))}

          {/* 무소속 테마(그룹에 속하지 않은 단독 테마) */}
          {loners.length > 0 && (
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-5">
              {loners.map(({ tag, idx }) => (
                <TagCard
                  key={tag.id}
                  tag={tag}
                  idx={idx}
                  onSelect={onSelect}
                  locale={locale}
                  t={t}
                  tLine={tLine}
                />
              ))}
            </div>
          )}
        </div>

        {/* 이야기 속 인물 — 가로선 아래 따로. 실존 인물과 섞이지 않게 경계를 분명히 둔다 */}
        {(fictionSections.length > 0 || fictionLoners.length > 0) && (
          <section className="mt-16 md:mt-20">
            <div className="mb-3 h-[1px] w-full bg-gradient-to-r from-transparent via-white/20 to-transparent" />
            <div className="mb-8 flex flex-col gap-2">
              <h2 className="text-xl md:text-2xl font-serif font-bold text-white/90 tracking-wide">
                {tLine("fictionTitle")}
              </h2>
              <p className="max-w-3xl text-sm md:text-[15px] leading-relaxed text-text-secondary break-keep">
                {tLine("fictionNote")}
              </p>
            </div>

            <div className="flex flex-col gap-7 md:gap-9">
              {fictionSections.map(({ tag }) => (
                <GroupSection
                  key={tag.id}
                  tag={tag}
                  tags={tags}
                  expanded={expanded.has(tag.slug ?? "")}
                  onToggle={() => toggle(tag.slug ?? "")}
                  onSelect={onSelect}
                  locale={locale}
                  t={t}
                  tLine={tLine}
                />
              ))}

              {fictionLoners.length > 0 && (
                <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-5">
                  {fictionLoners.map(({ tag, idx }) => (
                    <TagCard
                      key={tag.id}
                      tag={tag}
                      idx={idx}
                      onSelect={onSelect}
                      locale={locale}
                      t={t}
                      tLine={tLine}
                    />
                  ))}
                </div>
              )}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

/* ─── 그룹 섹션: 전체폭 구분 헤더 + 펼치면 자식 카드 그리드 ─── */
function GroupSection({
  tag,
  tags,
  expanded,
  onToggle,
  onSelect,
  locale,
  t,
  tLine,
}: {
  tag: FeaturedTag;
  tags: FeaturedTag[];
  expanded: boolean;
  onToggle: () => void;
  onSelect: (idx: number) => void;
  locale: Locale;
  t: ReturnType<typeof useTranslations>;
  tLine: ReturnType<typeof useTranslations>;
}) {
  const tagName = locale === "en" ? tag.name_en ?? tag.name : tag.name;
  const tagDesc = locale === "en" ? tag.description_en ?? tag.description : tag.description;
  const children = childTags(tags, tag.slug ?? "");
  const themeCount = children.length;
  const totalCelebs = groupCelebCount(tags, tag.slug ?? "");

  return (
    <section style={{ "--tag-color": tag.color } as React.CSSProperties}>
      {/* 구분 헤더 */}
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="w-full flex items-center gap-3 md:gap-4 py-2 group text-left"
      >
        <span className="flex items-center gap-2.5 flex-shrink-0">
          <span
            className="w-2.5 h-2.5 rounded-sm rotate-45"
            style={{ backgroundColor: "var(--tag-color)" }}
          />
          <h3 className="text-lg md:text-2xl font-serif font-bold text-white group-hover:text-[color:var(--tag-color)] tracking-wide">
            {tagName}
          </h3>
        </span>
        <span className="text-[11px] md:text-sm text-white/40 font-medium flex-shrink-0">
          {locale === "en" ? `${themeCount} themes · ${totalCelebs}` : `${themeCount}개 테마 · ${totalCelebs}명`}
        </span>
        <span className="flex-1 h-px bg-gradient-to-r from-white/15 to-transparent" />
        <ChevronDown
          size={20}
          className={cn(
            "flex-shrink-0 text-white/40 group-hover:text-[color:var(--tag-color)] transition-all duration-300",
            expanded && "rotate-180"
          )}
        />
      </button>

      {/* 컨텍스트 유지를 위해 카테고리 설명글을 항상 표시합니다. */}
      {tagDesc && (
        <p className="text-sm md:text-[15px] text-white/70 mt-2 ml-6 line-clamp-2 leading-relaxed tracking-wide">
          {tagDesc}
        </p>
      )}

      {/* 펼침: 자식 테마 카드 그리드 */}
      {expanded && (
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-5 mt-4 md:mt-5 animate-in fade-in slide-in-from-top-2 duration-300">
          {children.map(({ tag: childTag, idx }) => (
            <TagCard
              key={childTag.id}
              tag={childTag}
              idx={idx}
              onSelect={onSelect}
              locale={locale}
              t={t}
              tLine={tLine}
            />
          ))}
        </div>
      )}
    </section>
  );
}

/* ─── 개별 테마 카드 ─── */
function TagCard({
  tag,
  idx,
  isChild,
  onSelect,
  locale,
  t,
  tLine,
}: {
  tag: FeaturedTag;
  idx: number;
  isChild?: boolean;
  onSelect: (idx: number) => void;
  locale: Locale;
  t: ReturnType<typeof useTranslations>;
  tLine: ReturnType<typeof useTranslations>;
}) {
  const isUpcoming = !tag.is_featured;
  const tagName = locale === "en" ? tag.name_en ?? tag.name : tag.name;
  const tagDesc = locale === "en" ? tag.description_en ?? tag.description : tag.description;
  const celebCount = tag.celebs?.length ?? 0;
  const displayCelebs = tag.celebs?.slice(0, 3) ?? [];
  const professions = !isUpcoming
    ? [
        ...new Set(
          tag.celebs?.map((c) => c.profession).filter((p): p is string => Boolean(p)) ?? []
        ),
      ]
    : [];
  const cardClassName = cn(
    "relative flex flex-col items-start justify-between min-h-[160px] md:min-h-[170px] p-6 rounded-2xl border text-left overflow-hidden group",
    isChild && "ring-1 ring-[color:var(--tag-color)]/25",
    isUpcoming
      ? "bg-black/40 border-white/5 opacity-50 cursor-not-allowed"
      : "backdrop-blur-md border-white/10 hover:border-transparent hover:shadow-[0_8px_40px_rgba(0,0,0,0.2)]"
  );
  const cardStyle = {
    ...(!isUpcoming && {
      "--tag-color": tag.color,
      "--text-base": `color-mix(in srgb, ${tag.color} 20%, white)`,
      "--text-hover": `color-mix(in srgb, ${tag.color} 70%, white)`,
    }),
    background: isUpcoming
      ? undefined
      : `linear-gradient(135deg, color-mix(in srgb, var(--tag-color) 12%, rgba(255,255,255,0.03)) 0%, color-mix(in srgb, var(--tag-color) 3%, rgba(255,255,255,0.01)) 100%)`,
  } as React.CSSProperties;

  const cardInner = (
    <>
      {/* Border Glow Layer */}
      {!isUpcoming && (
        <div
          className="absolute inset-0 rounded-2xl border border-[color:var(--tag-color)] opacity-0 group-hover:opacity-40 pointer-events-none z-20"
          style={{
            boxShadow: "inset 0 0 20px color-mix(in srgb, var(--tag-color) 20%, transparent)",
          }}
        />
      )}

      {/* Immediate Background Hover Overlay */}
      {!isUpcoming && (
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 pointer-events-none z-0"
          style={{
            background: `linear-gradient(135deg, color-mix(in srgb, var(--tag-color) 25%, transparent) 0%, color-mix(in srgb, var(--tag-color) 5%, transparent) 100%)`,
          }}
        />
      )}

      {/* Ambient Glow Effects (Delayed) */}
      {!isUpcoming && (
        <div
          className="absolute -top-12 -right-12 w-48 h-48 rounded-[100%] blur-[60px] opacity-20 pointer-events-none group-hover:opacity-70 z-0 transition-opacity duration-500"
          style={{ backgroundColor: "var(--tag-color)" }}
        />
      )}

      {/* Group Shot (단체 화보) — 화면 저장분에 옛 형태가 남아 있어도 읽히게 정규화해 쓴다 */}
      {!isUpcoming && toTeamImages(tag.team_images).length > 0 && (
        <div 
          className="absolute inset-y-0 right-0 w-2/3 pointer-events-none z-0 opacity-30 group-hover:opacity-50 transition-opacity duration-300"
          style={{
            maskImage: "linear-gradient(to right, transparent, black 80%)",
            WebkitMaskImage: "linear-gradient(to right, transparent, black 80%)",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img 
            src={toTeamImages(tag.team_images)[0].url}
            alt="Group Shot" 
            className="w-full h-full object-cover object-right mix-blend-luminosity grayscale group-hover:grayscale-0 transition-all duration-300" 
          />
        </div>
      )}

      <div className="flex flex-col items-start w-full relative z-10 gap-2 mb-4 md:mb-6">
        <div className="flex justify-between items-start w-full gap-4">
          <span
            className={cn(
              "font-sans font-bold tracking-wide text-lg md:text-xl line-clamp-2 drop-shadow-sm",
              isUpcoming
                ? "text-white/70"
                : "text-[color:var(--text-base)] group-hover:text-[color:var(--text-hover)]"
            )}
          >
            {tagName}
            {/* 모바일: 제목에 인원수 병기 */}
            {!isUpcoming && celebCount > 0 && (
              <span className="md:hidden text-white/40 font-normal text-base">({celebCount})</span>
            )}
          </span>
          {isUpcoming ? (
            <Lock size={16} className="flex-shrink-0 mt-1" />
          ) : (
            /* 데스크탑만 우측 상단 아바타 */
            <div className="hidden md:flex -space-x-3">
              {displayCelebs.map((celeb, i) => (
                <div
                  key={celeb.id}
                  className="relative z-10"
                  style={{
                    zIndex: 10 - i,
                    transform: `translateY(${i * 2}px)`,
                  }}
                >
                  <Avatar
                    url={celeb.avatar_url}
                    name={celeb.nickname}
                    size="sm"
                    className="bg-[#0a0a0a] ring-2 ring-black/80 shadow-[0_4px_10px_rgba(0,0,0,0.5)]"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 모바일: 설명 대신 아바타 나열 */}
        {!isUpcoming && displayCelebs.length > 0 && (
          <div className="flex -space-x-2 md:hidden mt-1">
            {(tag.celebs ?? []).slice(0, 7).map((celeb, i) => (
              <div key={celeb.id} className="relative" style={{ zIndex: 10 - i }}>
                <Avatar
                  url={celeb.avatar_url}
                  name={celeb.nickname}
                  size="sm"
                  className="bg-[#0a0a0a] ring-2 ring-black/80 shadow-[0_4px_10px_rgba(0,0,0,0.5)]"
                />
              </div>
            ))}
          </div>
        )}

        {!isUpcoming && tagDesc && (
          <p className="text-sm md:text-[15px] line-clamp-2 mt-2 font-medium text-white/70 leading-relaxed group-hover:text-[color:var(--text-base)]">
            {tagDesc}
          </p>
        )}
      </div>

      <div className="flex items-end justify-between w-full relative z-10 mt-auto">
        <div className="flex items-center gap-2 opacity-50 group-hover:opacity-100">
          {professions.slice(0, 4).map((p) => {
            const Icon = PROFESSION_ICONS[p as keyof typeof PROFESSION_ICONS];
            if (!Icon) return null;
            return (
              <Icon
                key={p}
                size={16}
                className="text-[color:var(--text-hover)] drop-shadow-md transition-colors"
              />
            );
          })}
        </div>
        {isUpcoming ? (
          <span className="text-xs uppercase font-sans tracking-wider font-semibold">
            Soon
          </span>
        ) : (
          /* 데스크탑만 Figures 표시 */
          <span className="hidden md:inline text-sm font-semibold text-white/40 group-hover:text-[color:var(--tag-color)]">
            {celebCount} Figures
          </span>
        )}
      </div>

      {isUpcoming && (
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity backdrop-blur-sm z-20">
          <span className="text-xs text-white/90 font-medium px-4 py-1.5 bg-black/80 rounded border border-white/10">
            {tLine("contentInPreparation") || "기대해주세요"}
          </span>
        </div>
      )}
    </>
  );

  // 공개 전 테마: 클릭 불가, 단순 박스로 표시
  if (isUpcoming) {
    return (
      <div className={cardClassName} style={cardStyle} aria-disabled="true">
        {cardInner}
      </div>
    );
  }

  // 공개 테마: 카드 자체를 해당 세력도감 주소의 링크로 만든다.
  // 좌클릭은 기존처럼 같은 화면에서 테마를 전환하고(빠른 전환),
  // 가운데 클릭·Ctrl/⌘ 클릭은 브라우저 기본 동작으로 새 탭에서 연다.
  const detailHref = tag.slug
    ? `/explore/faction/${tag.slug}`
    : `/explore/faction?tag=${tag.id}`;
  const externalHref = (locale === "en" ? "/en" : "") + detailHref;
  return (
    <Link
      href={detailHref}
      onClick={(e) => {
        // 수식 키가 눌린 경우는 브라우저에 맡겨 새 탭/새 창으로 열리게 둔다.
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        e.preventDefault();
        onSelect(idx);
      }}
      className={cardClassName}
      style={cardStyle}
    >
      {cardInner}
      {/* 새 탭에서 열기 버튼 */}
      <button
        type="button"
        aria-label={t("openInNewTab")}
        title={t("openInNewTab")}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          window.open(externalHref, "_blank", "noopener,noreferrer");
        }}
        className="absolute top-2.5 right-2.5 z-30 flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-black/50 text-white/70 backdrop-blur-md opacity-70 hover:border-[color:var(--tag-color)] hover:text-[color:var(--text-hover)] md:opacity-0 md:group-hover:opacity-100"
      >
        <ExternalLink size={13} />
      </button>
    </Link>
  );
}
