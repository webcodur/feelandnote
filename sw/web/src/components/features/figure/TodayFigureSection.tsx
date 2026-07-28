

"use client";

import { useState, useMemo } from "react";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useLocale } from "next-intl";
import { Avatar } from "@/components/ui";
import SectionHeader from "@/components/shared/SectionHeader";
import { ContentCard } from "@/components/ui/cards";
import { ContentTypeSummary } from "@/components/ui/ContentTypeSummary";
import { CELEB_PROFESSIONS, getCelebProfessionLabel } from "@/constants/celebProfessions";
import { Calendar, ArrowRight, BookOpen, Newspaper, Cake } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ContentType } from "@/types/database";
import { getLocalizedContent } from "@/lib/utils/editions";

interface Figure {
    id: string;
    slug?: string | null;
    nickname: string;
    nickname_en: string | null;
    avatar_url: string | null;
    profession: string | null;
    bio: string | null;
    bio_en: string | null;
    contentCount?: number;
}

interface Content {
    id: string;
    type: string;
    title: string;
    creator: string | null;
    thumbnail_url: string | null;
    avg_rating?: number | null;
    review?: string | null;
    review_en?: string | null;
    is_spoiler?: boolean;
    source_url?: string | null;
    user_content_id?: string;
    title_ko?: string | null;
    title_en?: string | null;
    creator_en?: string | null;
    isbn_en?: string | null;
    thumbnail_en?: string | null;
    has_en_edition?: boolean | null;
}

interface TodayFigureSource {
    type: 'news' | 'seed' | 'birthday';
    newsCount: number;
}

interface TodayFigureSectionProps {
    figure: Figure;
    contents: Content[];
    source?: TodayFigureSource;
}

/** 마지막 글자의 받침 유무로 '이/가' 반환 (Korean only) */
function subjectParticle(name: string): string {
  const last = name.charCodeAt(name.length - 1);
  if (last < 0xac00 || last > 0xd7a3) return "이";
  return (last - 0xac00) % 28 === 0 ? "가" : "이";
}

export default function TodayFigureSection({ figure, contents, source }: TodayFigureSectionProps) {
    const t = useTranslations("todayFigure");
    const tProfession = useTranslations("profession");
    const locale = useLocale();
    const [categoryFilter, setCategoryFilter] = useState<string | null>(null);

    if (!figure) return null;

    const displayName = locale === "en" && figure.nickname_en ? figure.nickname_en : figure.nickname;
    const displayBio = locale === "en" && figure.bio_en ? figure.bio_en : figure.bio;
    const professionLabel = figure.profession ? tProfession(figure.profession) : "";

    const filteredContents = categoryFilter
        ? contents.filter(c => c.type === categoryFilter)
        : contents;

    // 날짜 포맷
    const today = new Date();
    const dateStr = t("dateLabel", { month: today.getMonth() + 1, day: today.getDate() });

    // 라이브러리 라벨 빌드
    const libraryLabel = useMemo(() => {
        const counts = { BOOK: 0, VIDEO: 0, MUSIC: 0, GAME: 0 };
        for (const c of contents) {
            if (c.type in counts) counts[c.type as keyof typeof counts]++;
        }
        const parts: string[] = [];
        if (counts.BOOK > 0) parts.push(t("bookCount", { count: counts.BOOK }));
        if (counts.VIDEO > 0) parts.push(t("videoCount", { count: counts.VIDEO }));
        if (counts.MUSIC > 0) parts.push(t("musicCount", { count: counts.MUSIC }));
        if (counts.GAME > 0) parts.push(t("gameCount", { count: counts.GAME }));

        if (parts.length === 0) {
            return t("libraryLabelEmpty", { profession: professionLabel, nickname: displayName });
        }
        const particle = locale === "ko" ? subjectParticle(displayName) : "";
        return t.rich("libraryLabelFull", { 
            profession: professionLabel, 
            nickname: displayName, 
            particle, 
            items: parts.join(", "),
            colored: (chunks) => <span className="text-[#E6D5A7] font-medium text-[19px] sm:text-[22px] tracking-wide inline-block pt-2 pb-1">{chunks}</span>
        });
    }, [contents, displayName, professionLabel, locale, t]);

    return (
        <div className="w-full">
            {/* 섹션 헤더 */}
            <div className="text-center mb-6 md:mb-10">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 text-accent text-xs font-medium mb-2">
                    <Calendar size={12} />
                    <span>{dateStr}</span>
                </div>
                <p className="text-sm mb-4">
                    {t("subtitle")}
                </p>

                {/* 인물 프로필 */}
                <Link
                    href={`/${figure.id}`}
                    className="group relative inline-flex flex-col items-center gap-5 mb-0 py-6 px-10 rounded-2xl transition-all duration-500 hover:bg-gradient-to-b hover:from-white/5 hover:to-transparent"
                >
                    <div className="relative">
                        <Avatar
                            url={figure.avatar_url}
                            name={displayName}
                            size="2xl"
                            className="ring-2 ring-white/10 group-hover:ring-accent/50 group-hover:shadow-[0_0_30px_rgba(212,175,55,0.2)] transition-all duration-500"
                        />
                        {/* 콘텐츠 개수 뱃지 */}
                        <div className="absolute -top-1 -right-1 z-20 min-w-[24px] h-[24px] px-1.5 flex items-center justify-center bg-accent text-black text-[10px] font-bold rounded-full border-2 border-[#121212] shadow-lg">
                            {contents.length}
                        </div>
                        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-black/80 border border-white/10 rounded-full">
                            <span className="text-[10px] font-bold text-accent tracking-wider uppercase">Today</span>
                        </div>
                    </div>

                    <div className="text-center space-y-2">
                        <h2 className="text-3xl md:text-4xl font-serif font-bold text-text-primary group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-accent group-hover:via-amber-200 group-hover:to-accent transition-all duration-500">
                            {displayName}
                        </h2>
                        <div className="flex items-center justify-center gap-3">
                            <span className="text-sm text-text-secondary font-medium px-2 py-0.5 rounded bg-white/5 border border-white/5">
                                {professionLabel}
                            </span>
                        </div>
                    </div>
                </Link>

                {/* 선정 과정 안내 */}
                {source?.type === 'birthday' && (
                    <div className="max-w-md mx-auto mt-2 mb-2">
                        <div className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
                            <Cake size={14} className="text-amber-400 shrink-0" />
                            <p className="text-xs text-amber-300/90">
                                {t("birthdaySelected")}
                            </p>
                        </div>
                    </div>
                )}
                {source?.type === 'news' && (
                    <div className="max-w-md mx-auto mt-2 mb-2">
                        <div className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20">
                            <Newspaper size={14} className="text-blue-400 shrink-0" />
                            <p className="text-xs text-blue-300/90">
                                {t("newsSelected", { count: source.newsCount })}
                            </p>
                        </div>
                    </div>
                )}

                {/* 간단한 소개글 */}
                {displayBio && (
                    <p className="text-center text-sm text-text-secondary max-w-xl mx-auto mb-4 line-clamp-2 mt-2 px-4 break-keep">
                        {displayBio}
                    </p>
                )}
            </div>

            {/* 콘텐츠 리스트 (Grid) */}
            <div className="space-y-4 min-h-[200px]">
                <SectionHeader
                    title={libraryLabel}
                    label="LEGACY"
                    description={
                        <Link
                            href={`/celeb/${figure.slug || figure.id}`}
                            className="inline-flex items-center gap-1.5 px-4 py-2 mt-2 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 hover:border-accent/30 hover:text-accent transition-all group"
                        >
                            <span>{t("guestbookCta")}</span>
                            <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                        </Link>
                    }
                />

                {/* 타입별 필터 (ContentTypeSummary) */}
                <ContentTypeSummary
                    items={contents}
                    value={categoryFilter}
                    onChange={(type) => setCategoryFilter(type)}
                    size="md"
                    className="mb-8"
                />

                {filteredContents.length > 0 ? (
                    <div className={cn(
                        "grid gap-3 md:gap-4",
                        "grid-cols-1 md:grid-cols-2"
                    )}>
                        {filteredContents.slice(0, 8).map((content) => (
                            <ContentCard
                                key={content.id}
                                contentId={content.id}
                                contentType={content.type as ContentType}
                                title={getLocalizedContent(content, locale).title}
                                creator={getLocalizedContent(content, locale).creator ?? undefined}
                                thumbnail={content.thumbnail_url}
                                rating={content.avg_rating ?? undefined}
                                review={(locale === 'en' && content.review_en) ? content.review_en : (content.review ?? "")}
                                isSpoiler={content.is_spoiler}
                                sourceUrl={content.source_url ?? undefined}
                                ownerNickname={displayName}
                                heightClass="h-[280px]"
                                mobileLayout="review"
                                recommendable={true}
                                userContentId={content.user_content_id}
                                className="shadow-lg transition-all"
                                titleKo={content.title_ko}
                                titleEn={content.title_en}
                                creatorEn={content.creator_en}
                                thumbnailEn={content.thumbnail_en}
                                hasEnEdition={content.has_en_edition}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="w-full py-16 text-center flex flex-col items-center justify-center gap-4 min-w-[300px] border border-dashed border-white/5 rounded-2xl bg-white/[0.02]">
                        <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-2">
                            <BookOpen size={24} className="opacity-30" />
                        </div>
                        <div className="space-y-1">
                            <p className="text-text-secondary font-medium">
                                {t("emptyCategory")}
                            </p>
                        </div>
                    </div>
                )}

                {/* 전체 보기 링크 - 콘텐츠가 있을 때만 */}
                {filteredContents.length > 0 && (
                    <div className="flex justify-end mt-4">
                         <Link
                            href={`/${figure.id}`}
                            className="text-xs text-accent/80 hover:text-accent shrink-0"
                        >
                            {t("viewAll")} →
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
}
