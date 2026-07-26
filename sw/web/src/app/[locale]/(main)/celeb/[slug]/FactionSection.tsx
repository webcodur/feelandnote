"use client";

import { useCallback, useMemo, useRef, useState, type CSSProperties } from "react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { ArrowRight } from "lucide-react";
import type { FactionTagPreview } from "@/actions/home/getFeaturedTags";
import type { FactionTagItem } from "@/actions/user/getCelebBySlug";
import CelebDetailModal from "@/components/features/celeb/modals/CelebDetailModal";
import FactionMediaLinks from "@/components/features/faction/FactionMediaLinks";
import FactionPreviewModal from "./FactionPreviewModal";
import { useCelebPreview } from "./useCelebPreview";

interface FactionSectionProps {
  tags: FactionTagItem[];
  previews: FactionTagPreview[];
  currentCelebId: string;
}

export default function FactionSection({
  tags,
  previews,
  currentCelebId,
}: FactionSectionProps) {
  const locale = useLocale();
  const t = useTranslations("celebPage");
  const isEn = locale === "en";
  const [selectedTag, setSelectedTag] = useState<FactionTagItem | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const {
    celeb: previewCeleb,
    loadingId: loadingMemberId,
    openCelebPreview,
    closeCelebPreview,
  } = useCelebPreview("faction");
  const previewByTag = useMemo(
    () => new Map(previews.map((preview) => [preview.tagId, preview])),
    [previews],
  );

  const resolveName = (tag: FactionTagItem) =>
    isEn && tag.name_en ? tag.name_en : tag.name;
  const resolve = (en: string | null, ko: string | null) => (isEn && en ? en : ko);

  const closePreview = useCallback(() => {
    closeCelebPreview();
    setSelectedTag(null);
    requestAnimationFrame(() => triggerRef.current?.focus());
  }, [closeCelebPreview]);

  const handleMemberSelect = useCallback(async (memberId: string) => {
    const member = await openCelebPreview(memberId);
    if (member) setSelectedTag(null);
  }, [openCelebPreview]);

  const closeMemberPreview = useCallback(() => {
    closeCelebPreview();
    requestAnimationFrame(() => triggerRef.current?.focus());
  }, [closeCelebPreview]);

  return (
    <>
      <div className="space-y-4">
        {tags.map((tag) => {
          const name = resolveName(tag);
          const description = resolve(tag.description_en, tag.description);
          const roleShort = resolve(tag.roleShortEn, tag.roleShort);
          const roleLong = resolve(tag.roleLongEn, tag.roleLong);
          const preview = previewByTag.get(tag.id);

          return (
            // 영상·음악 단추는 카드(단추) 안에 넣을 수 없어(단추 겹침) 카드 아래 형제로 둔다
            <div key={tag.id} className="space-y-2">
            <button
              type="button"
              onClick={(event) => {
                triggerRef.current = event.currentTarget;
                setSelectedTag(tag);
              }}
              style={{ "--tag-color": tag.color } as CSSProperties}
              className="group flex w-full flex-col gap-4 rounded-[2px] border border-white/10 p-4 text-left hover:border-[color:var(--tag-color)] hover:bg-white/[0.025] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--tag-color)] sm:flex-row"
              aria-label={t("factionPreviewAria", { name })}
            >
              {tag.factionImageUrl && (
                <div className="relative aspect-[3/4] w-full flex-shrink-0 overflow-hidden rounded-[2px] bg-bg-secondary ring-1 ring-accent/10 sm:w-[168px]">
                  <Image
                    src={tag.factionImageUrl}
                    alt=""
                    fill
                    unoptimized
                    aria-hidden
                    className="object-cover scale-110 blur-xl opacity-40"
                  />
                  <div className="absolute inset-0 bg-black/20" />
                  <Image
                    src={tag.factionImageUrl}
                    alt={name}
                    fill
                    unoptimized
                    sizes="168px"
                    className="object-contain transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
              )}

              <div className="flex min-w-0 flex-1 flex-col space-y-1.5">
                <div className="inline-flex items-center gap-1.5 text-text-primary group-hover:text-[color:var(--tag-color)]">
                  <span
                    className="h-2 w-2 flex-shrink-0 rounded-full"
                    style={{ backgroundColor: tag.color }}
                    aria-hidden
                  />
                  <span className="font-serif text-sm font-bold sm:text-base">{name}</span>
                </div>

                {description && (
                  <p className="line-clamp-2 text-xs text-text-secondary">{description}</p>
                )}
                {roleShort && (
                  <p className="pt-1 font-serif text-sm font-medium text-text-primary sm:text-base">
                    {roleShort}
                  </p>
                )}
                {roleLong && (
                  <p className="text-xs leading-relaxed text-text-secondary sm:text-sm">
                    {roleLong}
                  </p>
                )}

                {preview && (preview.members.length > 0 || preview.teamImages.length > 0) && (
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-white/10 pt-3">
                    {preview.members.length > 0 && (
                      <div className="flex -space-x-2" aria-hidden>
                        {preview.members.slice(0, 5).map((member) => (
                          <div
                            key={member.id}
                            className="relative h-7 w-7 overflow-hidden rounded-full border-2 border-bg-main bg-bg-secondary"
                          >
                            {member.avatarUrl ? (
                              <Image
                                src={member.avatarUrl}
                                alt=""
                                fill
                                unoptimized
                                sizes="28px"
                                className="object-cover"
                              />
                            ) : (
                              <span className="flex h-full w-full items-center justify-center font-serif text-[9px] text-text-tertiary">
                                {(isEn && member.nicknameEn ? member.nicknameEn : member.nickname).charAt(0)}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    <span className="inline-flex items-center gap-1.5 text-[11px] text-text-tertiary">
                      {preview.members.length > 0 && t("factionMemberCount", { count: preview.members.length })}
                      {preview.members.length > 0 && preview.teamImages.length > 0 && <span aria-hidden>·</span>}
                      {preview.teamImages.length > 0 && t("factionPhotoCount", { count: preview.teamImages.length })}
                    </span>
                  </div>
                )}

                <span className="mt-auto inline-flex items-center gap-1 self-start pt-2 text-xs font-medium text-text-tertiary group-hover:text-[color:var(--tag-color)]">
                  {t("factionPreview")}
                  <ArrowRight size={13} className="transition-transform duration-200 group-hover:translate-x-0.5" />
                </span>
              </div>
            </button>

            {/* 이 테마를 다룬 세력도 영상과 배경음악. 없으면 아무것도 뜨지 않는다 */}
            <FactionMediaLinks videos={tag.videos} music={tag.music} title={name} />
            </div>
          );
        })}
      </div>

      {selectedTag && (
        <FactionPreviewModal
          tag={selectedTag}
          preview={previewByTag.get(selectedTag.id)}
          currentCelebId={currentCelebId}
          loadingMemberId={loadingMemberId}
          onMemberSelect={(memberId) => void handleMemberSelect(memberId)}
          onClose={closePreview}
        />
      )}

      {previewCeleb && (
        <CelebDetailModal
          celeb={previewCeleb}
          isOpen
          onClose={closeMemberPreview}
        />
      )}
    </>
  );
}
