/*
  파일명: /components/features/scriptures/Scriptures/sections/TodaySageSection.tsx
  기능: 오늘의 인물 섹션
  책임: lazy load로 오늘의 인물과 그의 서가를 보여준다.
*/ // ------------------------------
"use client";

import { useState } from "react";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { User } from "lucide-react";
import ContentGrid from "@/components/ui/ContentGrid";
import { ContentCard } from "@/components/ui/cards";
import { getCategoryByDbType } from "@/constants/categories";
import type { ContentType } from "@/types/database";
import { useTranslations } from "next-intl";
import { getTodayFigure, type TodayFigureResult } from "@/actions/scriptures";
import { useIntersectionObserver } from "../hooks";
import { SectionSkeleton, ScriptureSectionHeader } from "../shared";

const SAGE_MAX_DISPLAY = 11;

export default function TodaySageSection() {
  const [data, setData] = useState<TodayFigureResult | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const t = useTranslations("scriptures.page");
  const tp = useTranslations("profession");

  const ref = useIntersectionObserver(async () => {
    const result = await getTodayFigure();
    setData(result);
    setIsLoaded(true);
  });

  const figure = data?.figure;
  const allContents = data?.contents || [];
  const displayContents = allContents.slice(0, SAGE_MAX_DISPLAY);
  const remainingCount = allContents.length - SAGE_MAX_DISPLAY;

  return (
    <section id="sage-section" ref={ref} className="py-12 md:py-16">
      <ScriptureSectionHeader sectionKey="sage" icon={User} />

      {!isLoaded ? (
        <SectionSkeleton />
      ) : figure ? (
        <>
          <Link
            href={`/${figure.id}`}
            className="flex items-start gap-4 p-4 mb-6 bg-bg-card/50 rounded-xl border border-border/30 hover:border-accent/30"
          >
            {figure.avatar_url ? (
              <Image
                src={figure.avatar_url}
                alt={figure.nickname}
                width={64}
                height={64}
                className="rounded-full object-cover shrink-0"
                unoptimized
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center text-xl text-accent font-bold shrink-0">
                {figure.nickname[0]}
              </div>
            )}
            <div className="min-w-0">
              <h3 className="text-base font-semibold text-text-primary mb-1">{figure.nickname}</h3>
              {figure.profession && (
                <p className="text-xs text-accent mb-2">
                  {tp(figure.profession)}
                </p>
              )}
              {figure.bio && <p className="text-sm text-text-secondary line-clamp-2">{figure.bio}</p>}
              <p className="text-xs text-text-tertiary mt-2">
                {t("reviewCount", { count: figure.contentCount })}
                {data?.source?.type === 'news' && (
                  <span className="ml-2 text-blue-400">· {t("newsMention", { count: data.source.newsCount })}</span>
                )}
              </p>
            </div>
          </Link>

          {displayContents.length > 0 ? (
            <ContentGrid>
              {displayContents.map((content) => (
                <ContentCard
                  key={content.id}
                  contentId={content.id}
                  contentType={content.type as ContentType}
                  title={content.title}
                  creator={content.creator}
                  thumbnail={content.thumbnail_url}
                  rating={content.avg_rating ?? undefined}
                  href={`/content/${content.id}?category=${getCategoryByDbType(content.type)?.id || "book"}`}
                  titleKo={content.title_ko}
                  titleEn={content.title_en}
                  creatorEn={content.creator_en}
                  thumbnailEn={content.thumbnail_en}
                  mobileLayout="review"
                />
              ))}
              {/* 더보기 카드 */}
              <Link
                href={`/${figure.id}`}
                className="group flex flex-col items-center justify-center aspect-[2/3] bg-bg-card/50 border border-border/30 rounded-xl hover:border-accent/50 hover:bg-accent/5"
              >
                <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center mb-3 group-hover:bg-accent/20">
                  <span className="text-2xl text-accent">→</span>
                </div>
                <span className="text-sm font-medium text-text-primary mb-1">{t("viewFullLibrary")}</span>
                {remainingCount > 0 && (
                  <span className="text-xs text-text-tertiary">{t("moreCount", { count: remainingCount })}</span>
                )}
              </Link>
            </ContentGrid>
          ) : (
            <div className="flex items-center justify-center h-40 bg-bg-card rounded-xl border border-border/30">
              <p className="text-text-tertiary text-sm">{t("empty.noRecords")}</p>
            </div>
          )}
        </>
      ) : (
        <div className="flex items-center justify-center h-40 bg-bg-card rounded-xl border border-border/30">
          <p className="text-text-tertiary text-sm">{t("empty.noFigure")}</p>
        </div>
      )}
    </section>
  );
}
