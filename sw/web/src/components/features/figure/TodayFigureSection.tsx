

"use client";

import { useState } from "react";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useLocale } from "next-intl";
import { Avatar, BlurDissolve } from "@/components/ui";
import { ContentCard } from "@/components/ui/cards";
import { ContentTypeSummary } from "@/components/ui/ContentTypeSummary";
import { Calendar, BookOpen, Newspaper, Cake } from "lucide-react";
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
    /** 홈 HubSection 안에 들어갈 때 true — 제목·부제는 밖이 쥐므로 날짜 뱃지만 남긴다 */
    embedded?: boolean;
}

export default function TodayFigureSection({ figure, contents, source, embedded = false }: TodayFigureSectionProps) {
    const t = useTranslations("todayFigure");
    const tProfession = useTranslations("profession");
    const locale = useLocale();
    const [categoryFilter, setCategoryFilter] = useState<string | null>(null);

    // figure 부재의 이른 반환은 모든 훅(useMemo) 뒤에서 한다 — react-hooks/rules-of-hooks
    const displayName = (locale === "en" && figure?.nickname_en ? figure.nickname_en : figure?.nickname) ?? "";
    const displayBio = locale === "en" && figure?.bio_en ? figure.bio_en : figure?.bio;
    const professionLabel = figure?.profession ? tProfession(figure.profession) : "";

    const filteredContents = categoryFilter
        ? contents.filter(c => c.type === categoryFilter)
        : contents;

    // 날짜 포맷
    const today = new Date();
    const dateStr = t("dateLabel", { month: today.getMonth() + 1, day: today.getDate() });

    // 제목은 칩만 둔다. 종류별 개수는 분류 칩이 이미 말하므로 문구로 되풀이하지 않는다

    if (!figure) return null;

    return (
        <div className="w-full">
            {/* 섹션 헤더 */}
            <div className="text-center mb-6 md:mb-10">
                {/* 날짜 알약은 자기 줄을 차지해야 한다 — 블록 래퍼를 빼면 아래 인물 카드(inline-flex)와
                    한 줄에 붙어 인물이 오른쪽으로 밀린다(부제를 감추는 embedded에서 드러났다) */}
                <div className="mb-2">
                    {/* 선정 사유 마크가 알약 오른쪽 위에 걸리므로 기준점을 알약에 둔다 */}
                    <div className="relative inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 text-accent text-xs font-medium">
                        <Calendar size={12} />
                        <span>{dateStr}</span>
                        {source?.type === 'birthday' && (
                            <span
                                title={t("birthdayChip")}
                                className="absolute -right-1.5 -top-1.5 flex size-4 items-center justify-center rounded-full border border-[#121212] bg-amber-500/90 text-black"
                            >
                                <Cake size={9} strokeWidth={2.5} />
                                <span className="sr-only">{t("birthdayChip")}</span>
                            </span>
                        )}
                        {source?.type === 'news' && (
                            <span
                                title={t("newsChip", { count: source.newsCount })}
                                className="absolute -right-1.5 -top-1.5 flex size-4 items-center justify-center rounded-full border border-[#121212] bg-blue-500/90 text-white"
                            >
                                <Newspaper size={9} strokeWidth={2.5} />
                                <span className="sr-only">{t("newsChip", { count: source.newsCount })}</span>
                            </span>
                        )}
                    </div>
                </div>
                {!embedded && (
                    <p className="text-sm mb-4">
                        {t("subtitle")}
                    </p>
                )}

                {/* 인물 프로필 */}
                <Link
                    href={`/celeb/${figure.slug || figure.id}`}
                    className="group relative inline-flex w-full min-w-0 max-w-full flex-col items-center gap-4 px-4 py-6 sm:gap-5 sm:px-10 hover:bg-gradient-to-b hover:from-white/5 hover:to-transparent rounded-2xl mb-0"
                >
                    <div className="relative">
                        <BlurDissolve className="inline-block">
                            <Avatar
                                url={figure.avatar_url}
                                name={displayName}
                                size="2xl"
                                className="ring-2 ring-white/10 group-hover:ring-accent/50 group-hover:shadow-[0_0_30px_rgba(212,175,55,0.2)]"
                            />
                        </BlurDissolve>
                        {/* 콘텐츠 개수 뱃지 */}
                        <div className="absolute -top-1 -right-1 z-20 min-w-[24px] h-[24px] px-1.5 flex items-center justify-center bg-accent text-black text-[10px] font-bold rounded-full border-2 border-[#121212] shadow-lg">
                            {contents.length}
                        </div>
                        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-black/80 border border-white/10 rounded-full">
                            <span className="text-[10px] font-bold text-accent tracking-wider uppercase">Today</span>
                        </div>
                    </div>

                    <div className="text-center space-y-2 min-w-0 max-w-full">
                        <h2 className="text-[1.65rem] sm:text-3xl md:text-4xl leading-tight font-serif font-bold text-text-primary break-keep group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-accent group-hover:via-amber-200 group-hover:to-accent">
                            {displayName}
                        </h2>
                        <div className="flex items-center justify-center gap-3">
                            <span className="text-sm text-text-secondary font-medium px-2 py-0.5 rounded bg-white/5 border border-white/5">
                                {professionLabel}
                            </span>
                        </div>
                    </div>
                </Link>

                {/* 간단한 소개글 — 잘라내지 않고 전문을 보인다. 영역은 가운데, 글은 왼쪽 정렬이다 */}
                {displayBio && (
                    <p className="text-left text-sm text-text-secondary max-w-xl mx-auto mb-4 mt-2 px-4 break-keep">
                        {displayBio}
                    </p>
                )}
            </div>

            <div className="min-h-[200px]">
                {/* 칩은 상자 없이 바로 둔다 — 종류별 박스가 따로 노는 느낌을 없앤다 */}
                <div className="mb-6 flex justify-center">
                    <ContentTypeSummary
                        items={contents}
                        value={categoryFilter}
                        onChange={(type) => setCategoryFilter(type)}
                        size="md"
                    />
                </div>

                {filteredContents.length > 0 ? (
                    <div className={cn(
                        "grid gap-3 md:gap-4",
                        "grid-cols-1 md:grid-cols-2"
                    )}>
                        {/* 홈은 티저다 — 두 행까지만 세우고 나머지는 상세(전체 보기)로 보낸다 */}
                        {filteredContents.slice(0, 4).map((content) => (
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
                                recommendable={true}
                                userContentId={content.user_content_id}
                                className="shadow-lg"
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
                            href={`/celeb/${figure.slug || figure.id}`}
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
