

"use client";

import { getCelebProfileUrl } from "@/lib/url";
import { useEffect, useRef, useState } from "react";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useLocale } from "next-intl";
import { Avatar, BlurDissolve } from "@/components/ui";
import { ContentCard } from "@/components/ui/cards";
import { ContentTypeSummary } from "@/components/ui/ContentTypeSummary";
import { Calendar, BookOpen, Newspaper, Cake } from "lucide-react";
import { cn } from "@/lib/utils";
import DeveloperCollectionJourney from "@/components/features/commerce/DeveloperCollectionJourney";
import ContentPurchaseAction from "@/components/features/commerce/ContentPurchaseAction";
import type { ContentType } from "@/types/database";
import type { TitleBadge } from "@/lib/utils/content-locale";
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
    title_badge?: TitleBadge | null;
    affiliate_url?: unknown;
}

interface TodayFigureSource {
    type: 'news' | 'seed' | 'birthday';
    newsCount: number;
}

interface TodayFigureSectionProps {
    figure: Figure;
    contents: Content[];
    date: string;
    source?: TodayFigureSource;
    /** 홈 HubSection 안에 들어갈 때 true — 제목·부제는 밖이 쥐므로 날짜 뱃지만 남긴다 */
    embedded?: boolean;
}

export default function TodayFigureSection({ figure, contents, date, source, embedded = false }: TodayFigureSectionProps) {
    const t = useTranslations("todayFigure");
    const tProfession = useTranslations("profession");
    const locale = useLocale();
    const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
    // 선정 사유 마크 — 터치는 호버 툴팁이 없으므로 눌러 여는 말풍선을 둔다
    const [reasonOpen, setReasonOpen] = useState(false);
    const reasonMarkRef = useRef<HTMLSpanElement>(null);

    useEffect(() => {
        if (!reasonOpen) return;
        const close = (e: PointerEvent) => {
            if (!reasonMarkRef.current?.contains(e.target as Node)) setReasonOpen(false);
        };
        document.addEventListener("pointerdown", close);
        return () => document.removeEventListener("pointerdown", close);
    }, [reasonOpen]);

    // figure 부재의 이른 반환은 모든 훅(useMemo) 뒤에서 한다 — react-hooks/rules-of-hooks
    const displayName = (locale === "en" && figure?.nickname_en ? figure.nickname_en : figure?.nickname) ?? "";
    const displayBio = locale === "en" && figure?.bio_en ? figure.bio_en : figure?.bio;
    const professionLabel = figure?.profession ? tProfession(figure.profession) : "";

    const filteredContents = categoryFilter
        ? contents.filter(c => c.type === categoryFilter)
        : contents;
    // 홈은 티저다 — 두 행까지만 세우고 나머지는 상세(전체 보기)로 보낸다
    const visibleContents = filteredContents.slice(0, 4);
    /* 수수료 안내 — 카드의 판매 단추 안에 묻지 않고 분류 칩 줄 끝에 둔다(인물 서재 조작대와 같은 규칙) */

    // 서버가 인물을 고를 때 사용한 날짜를 그대로 쓴다. 방문자 시간대나 자정 경계에 흔들리지 않는다.
    const [, month, day] = date.split("-").map(Number);
    const dateStr = t("dateLabel", { month, day });

    // 제목은 칩만 둔다. 종류별 개수는 분류 칩이 이미 말하므로 문구로 되풀이하지 않는다

    if (!figure) return null;

    // 선정 사유 마크 — 알약 오른쪽 위에 걸리는 표시 하나에 문구·아이콘·색을 묶는다
    const reasonMark = source?.type === "birthday"
        ? { label: t("birthdayChip"), icon: <Cake size={9} strokeWidth={2.5} />, className: "bg-amber-500/90 text-black" }
        : source?.type === "news"
            ? { label: t("newsChip", { count: source.newsCount }), icon: <Newspaper size={9} strokeWidth={2.5} />, className: "bg-blue-500/90 text-white" }
            : null;

    return (
        <div className="w-full">
            {/* 인물 머리 — 가운데 정렬(platform-02-code-rules.md 「정렬」). 날짜 → 얼굴 → 이름 → 직업 → 소개 순으로 쌓는다.
                예전 배지(작품 수·TODAY 알약)는 날짜 줄이 같은 말을 하므로 두지 않는다 */}
            <div className="mb-6 flex flex-col items-center text-center md:mb-8">
                {/* 날짜 줄 — 선정 사유 마크는 날짜 바로 뒤에 붙는다(눌러 여는 말풍선의 기준점) */}
                <div className="mb-4 flex items-center justify-center gap-1.5 text-[13px] font-semibold text-accent">
                        <Calendar size={13} aria-hidden />
                        <span>{dateStr}</span>
                        {reasonMark && (
                            <span ref={reasonMarkRef} className="relative ms-0.5">
                                <button
                                    type="button"
                                    title={reasonMark.label}
                                    aria-label={reasonMark.label}
                                    aria-expanded={reasonOpen}
                                    onClick={() => setReasonOpen((v) => !v)}
                                    className={`relative flex size-4 items-center justify-center rounded-full border border-bg-main before:absolute before:-inset-2 before:content-[''] ${reasonMark.className}`}
                                >
                                    {reasonMark.icon}
                                </button>
                                {reasonOpen && (
                                    <span className="absolute right-0 top-full z-20 mt-1.5 whitespace-nowrap rounded-full border border-line-strong bg-bg-card px-2.5 py-1 text-xs font-medium text-text-primary shadow-lg">
                                        {reasonMark.label}
                                    </span>
                                )}
                            </span>
                        )}
                </div>

                {/* 얼굴과 이름을 한 링크로 묶는다. hover는 얼굴 테두리·이름 글자색이 즉시 금색으로 바뀐다 */}
                <Link
                    href={getCelebProfileUrl(figure)}
                    className="group flex min-w-0 max-w-full flex-col items-center gap-3 rounded-card px-4 md:gap-4"
                >
                    <BlurDissolve className="inline-block">
                        <Avatar
                            url={figure.avatar_url}
                            name={displayName}
                            size="4xl"
                            // Avatar 4xl의 기본 폭(160px)을 폭별 변형으로 덮는다 — 변형 없는 같은 속성끼리는 생성 순서로 져서 먹지 않는다
                            className="group-hover:ring-accent/60 max-md:h-[104px] max-md:w-[104px] md:h-[120px] md:w-[120px]"
                        />
                    </BlurDissolve>
                    {/* 구획 제목(h2) 아래라 h3 */}
                    <h3 className="break-keep text-[1.75rem] font-bold leading-tight tracking-tight text-text-primary group-hover:text-accent md:text-4xl">
                        {displayName}
                    </h3>
                </Link>
                {professionLabel && (
                    <p className="mt-1.5 text-sm text-text-secondary md:text-base">{professionLabel}</p>
                )}
                {!embedded && <p className="mt-2 text-sm text-text-secondary">{t("subtitle")}</p>}

                {/* 소개글 — 잘라내지 않고 전문을 보인다. 영역은 가운데, 여러 줄 글은 왼쪽 정렬이다 */}
                {displayBio && (
                    <p className="mx-auto mt-4 max-w-xl break-keep text-left text-[15px] leading-relaxed text-text-secondary">
                        {displayBio}
                    </p>
                )}
            </div>

            <div className="mx-auto min-h-[200px] w-full max-w-4xl">
                {/* 칩은 상자 없이 바로 둔다 — 종류별 박스가 따로 노는 느낌을 없앤다 */}
                <div className="mb-4 flex items-center justify-center gap-2 md:mb-5">
                    <ContentTypeSummary
                        items={contents}
                        value={categoryFilter}
                        onChange={(type) => setCategoryFilter(type)}
                        size="md"
                    />
                </div>

                {filteredContents.length > 0 ? (
                  <>
                    <div className={cn(
                        "grid gap-3 md:gap-4",
                        "grid-cols-1 md:grid-cols-2"
                    )}>
                        {visibleContents.map((content) => {
                          const localized = getLocalizedContent(content, locale);
                          return (
                            <ContentCard
                                key={content.id}
                                contentId={content.id}
                                contentType={content.type as ContentType}
                                title={localized.title}
                                creator={localized.creator ?? undefined}
                                thumbnail={content.thumbnail_url}
                                rating={content.avg_rating ?? undefined}
                                review={(locale === 'en' && content.review_en) ? content.review_en : (content.review ?? "")}
                                isSpoiler={content.is_spoiler}
                                sourceUrl={content.source_url ?? undefined}
                                ownerNickname={displayName}
                                reviewLayout="stacked"
                                recommendable={true}
                                userContentId={content.user_content_id}
                                titleBadge={content.title_badge}
                                titleKo={content.title_ko}
                                titleEn={content.title_en}
                                creatorEn={content.creator_en}
                                thumbnailEn={content.thumbnail_en}
                                hasEnEdition={content.has_en_edition}
                                posterFooterNode={
                                    <ContentPurchaseAction
                                        contentId={content.id}
                                        type={content.type}
                                        placement="home-today-figure"
                                        title={localized.title}
                                        creator={localized.creator}
                                        thumbnail={content.thumbnail_url}
                                        affiliateUrl={content.affiliate_url}
                                    />
                                }
                            />
                          );
                        })}
                    </div>
                    {visibleContents.map((content) => (
                      <DeveloperCollectionJourney
                        key={content.id}
                        target={{ title: content.title, creator: content.creator, type: content.type, contentId: content.id }}
                        placement="home-today-figure"
                        context="방금 소개한 작품을 직접 감상하고 싶다면"
                      />
                    ))}
                  </>
                ) : (
                    <div className="flex w-full flex-col items-center justify-center gap-3 rounded-card border border-dashed border-line py-14 text-center">
                        <BookOpen size={24} className="text-text-tertiary" aria-hidden />
                        <p className="font-medium text-text-secondary">{t("emptyCategory")}</p>
                    </div>
                )}

                {/* 전체 보기 링크 - 콘텐츠가 있을 때만. 누르는 칸 44px */}
                {filteredContents.length > 0 && (
                    <div className="mt-2 flex justify-end">
                        <Link
                            href={getCelebProfileUrl(figure)}
                            className="inline-flex min-h-11 shrink-0 items-center rounded-md px-2 text-sm font-medium text-text-secondary hover:bg-accent/5 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                        >
                            {t("viewAll")} →
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
}
