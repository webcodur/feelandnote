"use client";

import { useTranslations } from "next-intl";
import type { Locale } from "@/types/locale";
import { Lock, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FeaturedTag } from "@/actions/home";
import { PROFESSION_ICONS } from "@/constants/professionIcons";
import Avatar from "@/components/ui/Avatar";
import { Link } from "@/i18n/navigation";

interface SpotlightIntroViewProps {
  tags: FeaturedTag[];
  onSelect: (idx: number) => void;
  locale: Locale;
}

export default function SpotlightIntroView({
  tags,
  onSelect,
  locale,
}: SpotlightIntroViewProps) {
  const tLine = useTranslations("landing");
  const t = useTranslations("explore.spotlight.intro");

  return (
    <div className="w-full relative min-h-[80vh] flex flex-col items-center pt-16 md:pt-24 pb-20 px-4 md:px-8">
      {/* Intro Hero Section */}
      <div className="max-w-3xl mx-auto flex flex-col items-center justify-center text-center relative mb-16">
        {/* Subtle background glow effect */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[150px] bg-accent/10 rounded-[100%] blur-[80px] pointer-events-none" />

        <div className="flex items-center gap-3 mb-6 opacity-80">
          <span className="w-8 md:w-16 h-[1px] bg-gradient-to-r from-transparent to-accent/50" />
          <span className="text-[12px] md:text-[13px] font-cinzel text-accent tracking-[0.25em] uppercase font-bold">
            Spotlight Collection
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

        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-5">
          {tags.map((tag, idx) => {
            const isUpcoming = !tag.is_featured;
            const tagName = locale === "en" ? tag.name_en ?? tag.name : tag.name;
            const tagDesc =
              locale === "en"
                ? tag.description_en ?? tag.description
                : tag.description;
            const celebCount = tag.celebs?.length ?? 0;
            const displayCelebs = tag.celebs?.slice(0, 3) ?? [];
            const professions = !isUpcoming
              ? [
                  ...new Set(
                    tag.celebs
                      ?.map((c) => c.profession)
                      .filter((p): p is string => Boolean(p)) ?? []
                  ),
                ]
              : [];
            const cardClassName = cn(
              "relative flex flex-col items-start justify-between min-h-[160px] md:min-h-[170px] p-6 rounded-2xl border text-left overflow-hidden group transition-all duration-500 will-change-transform",
              isUpcoming
                ? "bg-black/40 border-white/5 opacity-50 cursor-not-allowed"
                : "backdrop-blur-md border-white/10 hover:border-transparent hover:shadow-[0_8px_40px_rgba(0,0,0,0.2)] hover:-translate-y-1.5"
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
                    className="absolute inset-0 rounded-2xl border border-[color:var(--tag-color)] opacity-0 group-hover:opacity-40 transition-opacity duration-500 pointer-events-none z-20"
                    style={{
                      boxShadow: 'inset 0 0 20px color-mix(in srgb, var(--tag-color) 20%, transparent)'
                    }}
                  />
                )}

                {/* Immediate Background Hover Overlay */}
                {!isUpcoming && (
                  <div 
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 pointer-events-none z-0 transition-opacity duration-500"
                    style={{
                      background: `linear-gradient(135deg, color-mix(in srgb, var(--tag-color) 25%, transparent) 0%, color-mix(in srgb, var(--tag-color) 5%, transparent) 100%)`
                    }}
                  />
                )}

                {/* Ambient Glow Effects (Delayed) */}
                {!isUpcoming && (
                  <div
                    className="absolute -top-12 -right-12 w-48 h-48 rounded-[100%] blur-[60px] opacity-20 pointer-events-none transition-all duration-700 delay-100 group-hover:opacity-70 group-hover:scale-[1.8] z-0"
                    style={{ backgroundColor: 'var(--tag-color)' }}
                  />
                )}

                <div className="flex flex-col items-start w-full relative z-10 gap-2 mb-4 md:mb-6">
                  <div className="flex justify-between items-start w-full gap-4">
                    <span
                      className={cn(
                        "font-sans font-bold tracking-wide text-lg md:text-xl line-clamp-2 drop-shadow-sm transition-colors duration-300",
                        isUpcoming ? "text-white/70" : "text-[color:var(--text-base)] group-hover:text-[color:var(--text-hover)]"
                      )}
                    >
                      {tagName}
                      {/* 모바일: 제목에 인원수 병기 */}
                      {!isUpcoming && celebCount > 0 && (
                        <span className="md:hidden text-white/40 font-normal text-base">({celebCount})</span>
                      )}
                    </span>
                    {isUpcoming ? (
                      <Lock size={16} className="text-text-tertiary/60 flex-shrink-0 mt-1" />
                    ) : (
                      /* 데스크탑만 우측 상단 아바타 */
                      <div className="hidden md:flex -space-x-3 transition-transform duration-500 group-hover:scale-110 group-hover:-translate-y-1">
                        {displayCelebs.map((celeb, i) => (
                          <div
                            key={celeb.id}
                            className="relative z-10 transition-transform duration-500"
                            style={{
                                zIndex: 10 - i,
                                transform: `translateY(${i * 2}px)`
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
                        <div
                          key={celeb.id}
                          className="relative"
                          style={{ zIndex: 10 - i }}
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

                  {!isUpcoming && tagDesc && (
                    <p className="text-[13px] md:text-sm line-clamp-2 mt-1 transition-colors duration-300 font-medium text-white/50 group-hover:text-[color:var(--text-base)]">
                      {tagDesc}
                    </p>
                  )}
                </div>

                <div className="flex items-end justify-between w-full relative z-10 mt-auto">
                  <div className="flex items-center gap-2 opacity-50 group-hover:opacity-100 transition-all duration-300 group-hover:translate-x-1">
                    {professions.slice(0, 4).map((p) => {
                      const Icon =
                        PROFESSION_ICONS[p as keyof typeof PROFESSION_ICONS];
                      if (!Icon) return null;
                      return <Icon key={p} size={16} className="text-[color:var(--text-hover)] drop-shadow-md transition-colors" />;
                    })}
                  </div>
                  {isUpcoming ? (
                    <span className="text-xs uppercase font-sans tracking-wider font-semibold text-text-tertiary/70">
                      Soon
                    </span>
                  ) : (
                    /* 데스크탑만 Figures 표시 */
                    <span className="hidden md:inline text-sm font-semibold text-white/40 group-hover:text-[color:var(--tag-color)] transition-colors duration-300">
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
                <div key={tag.id} className={cardClassName} style={cardStyle} aria-disabled="true">
                  {cardInner}
                </div>
              );
            }

            // 공개 테마: 카드 자체를 해당 스포트라이트 주소의 링크로 만든다.
            // 좌클릭은 기존처럼 같은 화면에서 테마를 전환하고(빠른 전환),
            // 가운데 클릭·Ctrl/⌘ 클릭은 브라우저 기본 동작으로 새 탭에서 연다.
            const detailHref = tag.slug
              ? `/explore/spotlight/${tag.slug}`
              : `/explore/spotlight?tag=${tag.id}`;
            const externalHref = (locale === "en" ? "/en" : "") + detailHref;
            return (
              <Link
                key={tag.id}
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
                  className="absolute top-2.5 right-2.5 z-30 flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-black/50 text-white/70 backdrop-blur-md transition-all opacity-70 hover:border-[color:var(--tag-color)] hover:text-[color:var(--text-hover)] md:opacity-0 md:group-hover:opacity-100"
                >
                  <ExternalLink size={13} />
                </button>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
