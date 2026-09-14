/*
  파일명: /components/layout/header/HeaderRecentProfiles.tsx
  기능: 모바일 헤더 최근 방문 버튼 — 광장 아이콘 왼쪽
  책임: localStorage 최근 방문(최대 5)을 읽어 모달 목록으로 보여준다.
        기록이 없으면 자리를 차지하지 않도록 버튼 자체를 그리지 않는다.
        데스크톱은 좌측 중앙 RecentProfilesSection이 쥐므로 md 이상에서는 숨긴다.
*/ // ------------------------------

"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ChevronRight, Clock, User } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { useRecentProfiles } from "@/hooks/useRecentProfiles";
import { useCelebAvatarSrc } from "@/hooks/useCelebAvatarSrc";
import { getCelebProfileUrl } from "@/lib/url";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";

const ICON_BUTTON_CLASS = "w-9 h-9 flex items-center justify-center rounded-lg hover:bg-white/5";
const ICON_SIZE = 20;

/** 행 높이에 위아래로 꽉 차고 원본 비율대로 나가는 썸네일 */
function RecentThumb({ src, alt }: { src: string; alt: string }) {
  const { ref, src: shownSrc, onError } = useCelebAvatarSrc(src);
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={ref}
      src={shownSrc}
      alt={alt}
      onError={onError}
      loading="lazy"
      decoding="async"
      className="h-full w-auto shrink-0 object-cover"
    />
  );
}

export default function HeaderRecentProfiles() {
  const t = useTranslations("profileSection");
  const locale = useLocale();
  const isEn = locale === "en";
  const { recentItems } = useRecentProfiles();
  const [isOpen, setIsOpen] = useState(false);

  // 기록이 없으면 헤더 자리를 차지하지 않는다
  if (recentItems.length === 0) return null;

  return (
    <>
      <div className="relative md:hidden">
        <Button
          unstyled
          onClick={() => setIsOpen(true)}
          aria-label={t("expandRecent")}
          title={t("expandRecent")}
          aria-expanded={isOpen}
          className={ICON_BUTTON_CLASS}
        >
          <Clock size={ICON_SIZE} className="text-text-secondary hover:text-text-primary" />
        </Button>
      </div>

      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title={t("recentTitle")}
        size="sm"
        maxHeightClassName="max-h-[calc(100dvh-5rem)]"
      >
        <div className="space-y-2 px-1 py-1">
          {recentItems.map((item) => (
            <Link
              key={item.id}
              href={item.profileType === "CELEB" ? getCelebProfileUrl(item) : `/${item.id}`}
              onClick={() => setIsOpen(false)}
              className="flex h-20 items-stretch gap-3 overflow-hidden rounded-lg border border-white/10 bg-white/[0.025] pe-3 hover:border-white/20 hover:bg-white/[0.05] no-underline"
            >
              {item.avatarUrl ? (
                <RecentThumb src={item.avatarUrl} alt={item.nickname} />
              ) : (
                <div className="flex aspect-square h-full items-center justify-center bg-white/5">
                  <User size={20} />
                </div>
              )}
              <div className="flex min-w-0 flex-1 flex-col justify-center py-2">
                <p className="truncate text-sm font-medium text-text-primary">
                  {isEn && item.nickname_en ? item.nickname_en : item.nickname_ko || item.nickname}
                </p>
                {item.title && (
                  <p className="mt-0.5 truncate text-xs text-text-secondary">
                    {isEn && item.title_en ? item.title_en : item.title_ko || item.title}
                  </p>
                )}
              </div>
              <ChevronRight size={16} className="shrink-0 self-center text-text-secondary/50" />
            </Link>
          ))}
        </div>
      </Modal>
    </>
  );
}
