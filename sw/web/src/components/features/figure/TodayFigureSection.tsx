

"use client";

import { getCelebProfileUrl } from "@/lib/url";
import { useEffect, useRef, useState } from "react";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useLocale } from "next-intl";
import { Avatar, BlurDissolve } from "@/components/ui";
import ReviewsSection from "@/app/[locale]/(main)/celeb/[slug]/ReviewsSection";
import type { GetUserContentsResponse } from "@/actions/contents/getUserContents";
import type { ContentBrief } from "@/actions/contents/getContentBrief";
import { Calendar, Newspaper } from "lucide-react";

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

interface TodayFigureSource {
    type: 'news' | 'seed';
    newsCount: number;
}

interface TodayFigureSectionProps {
    figure: Figure;
    initialContents: GetUserContentsResponse;
    initialContentBrief: ContentBrief | null;
    date: string;
    source?: TodayFigureSource;
    /** 홈 HubSection 안에 들어갈 때 true — 제목·부제는 밖이 쥐므로 날짜 뱃지만 남긴다 */
    embedded?: boolean;
}

export default function TodayFigureSection({ figure, initialContents, initialContentBrief, date, source, embedded = false }: TodayFigureSectionProps) {
    const t = useTranslations("todayFigure");
    const tCeleb = useTranslations("celebPage");
    const tProfession = useTranslations("profession");
    const locale = useLocale();
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

    const displayName = (locale === "en" && figure?.nickname_en ? figure.nickname_en : figure?.nickname) ?? "";
    const displayBio = locale === "en" && figure?.bio_en ? figure.bio_en : figure?.bio;
    const professionLabel = figure?.profession ? tProfession(figure.profession) : "";

    // 서버가 인물을 고를 때 사용한 날짜를 그대로 쓴다. 방문자 시간대나 자정 경계에 흔들리지 않는다.
    const [, month, day] = date.split("-").map(Number);
    const dateStr = t("dateLabel", { month, day });

    if (!figure) return null;

    // 선정 사유 마크 — 알약 오른쪽 위에 걸리는 표시 하나에 문구·아이콘·색을 묶는다
    const reasonMark = source?.type === "news"
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
                <ReviewsSection
                    key={figure.id}
                    userId={figure.id}
                    slug={figure.slug ?? ""}
                    nickname={displayName}
                    avatarUrl={figure.avatar_url}
                    emptyMessage={tCeleb("libraryEmpty")}
                    initialContents={initialContents}
                    initialContentBrief={initialContentBrief}
                />
            </div>
        </div>
    );
}
