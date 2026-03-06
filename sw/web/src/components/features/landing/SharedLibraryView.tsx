/*
  파일명: components/features/landing/SharedLibraryView.tsx
  기능: 기획전 공유 서재 뷰
  책임: 태그 내 셀럽들이 공통으로 감상한 콘텐츠를 집계·표시
*/
"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { Book, Film, Gamepad2, Music } from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import { cn } from "@/lib/utils";
import { getCategoryByDbType } from "@/constants/categories";
import {
  getTagSharedLibrary,
  type SharedContent,
} from "@/actions/home/getTagSharedLibrary";

const TYPE_ICONS: Record<string, typeof Book> = {
  BOOK: Book,
  VIDEO: Film,
  GAME: Gamepad2,
  MUSIC: Music,
};

const FILTER_TYPES = ["ALL", "BOOK", "VIDEO", "GAME", "MUSIC"] as const;

interface SharedLibraryViewProps {
  tagId: string;
}

export default function SharedLibraryView({ tagId }: SharedLibraryViewProps) {
  const t = useTranslations("explore.spotlight");
  const locale = useLocale();
  const isEn = locale === 'en';
  const [items, setItems] = useState<SharedContent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<string>("ALL");

  useEffect(() => {
    setIsLoading(true);
    getTagSharedLibrary(tagId).then((data) => {
      setItems(data);
      setIsLoading(false);
    });
  }, [tagId]);

  const filtered =
    filter === "ALL" ? items : items.filter((i) => i.type === filter);

  return (
    <div className="space-y-4">
      {/* 타입 필터 */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {FILTER_TYPES.map((type) => {
          const label =
            type === "ALL"
              ? t("shared.filterAll")
              : type === "BOOK"
                ? "Book"
                : type === "VIDEO"
                  ? "Video"
                  : type === "GAME"
                    ? "Game"
                    : "Music";
          return (
            <button
              key={type}
              onClick={() => setFilter(type)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border transition-colors",
                filter === type
                  ? "bg-accent/20 text-accent border-accent/40"
                  : "bg-white/5 text-text-secondary border-white/10 hover:bg-white/10"
              )}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* 콘텐츠 리스트 */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-16 rounded-lg bg-white/5 animate-pulse"
            />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-text-tertiary text-center py-8">
          {t("shared.empty")}
        </p>
      ) : (
        <div className="space-y-2">
          {filtered.map((item) => (
            <SharedContentRow key={item.contentId} item={item} t={t} isEn={isEn} />
          ))}
        </div>
      )}
    </div>
  );
}

function SharedContentRow({
  item,
  t,
  isEn,
}: {
  item: SharedContent;
  t: ReturnType<typeof useTranslations>;
  isEn: boolean;
}) {
  const Icon = TYPE_ICONS[item.type] ?? Book;
  const contentDetailUrl = `/content/${item.contentId}?category=${getCategoryByDbType(item.type)?.id || "book"}`;
  const displayTitle = isEn ? (item.title_en ?? item.title) : item.title;
  const displayCreator = isEn ? (item.creator_en ?? item.creator) : item.creator;

  return (
    <Link
      href={contentDetailUrl}
      className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-white/10 bg-black/20 hover:bg-white/5 transition-colors"
    >
      {/* 썸네일 */}
      <div className="relative h-12 w-9 shrink-0 rounded overflow-hidden bg-bg-secondary">
        {item.thumbnailUrl ? (
          <Image
            src={item.thumbnailUrl}
            alt={displayTitle}
            fill
            sizes="36px"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Icon size={16} className="text-text-secondary" />
          </div>
        )}
      </div>

      {/* 정보 */}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-white truncate">{displayTitle}</p>
        {displayCreator && (
          <p className="text-xs text-text-secondary truncate">
            {displayCreator.replace(/\^/g, ", ")}
          </p>
        )}
        {/* 셀럽 배지 */}
        <div className="flex items-center gap-1.5 mt-1">
          <div className="flex -space-x-1.5">
            {item.celebs.slice(0, 3).map((celeb) => {
              const celebName = isEn ? (celeb.nickname_en ?? celeb.nickname) : celeb.nickname;
              return (
                <div
                  key={celeb.id}
                  className="relative w-5 h-5 rounded-full overflow-hidden border border-bg-primary bg-bg-secondary"
                >
                  {celeb.avatar_url ? (
                    <Image
                      src={celeb.avatar_url}
                      alt={celebName}
                      fill
                      sizes="20px"
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-[8px] text-text-secondary">
                      {celebName.charAt(0)}
                    </div>
                  )}
                </div>
              );
            })}
            {item.celebs.length > 3 && (
              <div className="w-5 h-5 rounded-full bg-white/10 border border-bg-primary flex items-center justify-center text-[8px] text-text-secondary">
                +{item.celebs.length - 3}
              </div>
            )}
          </div>
          <span className="text-[10px] text-text-tertiary">
            {t("shared.celebCount", { count: item.celebCount })}
          </span>
        </div>
      </div>

      <Icon size={14} className="shrink-0 text-text-tertiary" />
    </Link>
  );
}
