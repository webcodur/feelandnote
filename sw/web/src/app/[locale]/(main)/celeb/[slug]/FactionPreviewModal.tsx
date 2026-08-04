"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { ArrowLeft, ArrowRight, Images, LoaderCircle, Users, X } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { FactionTagPreview } from "@/actions/home/getFeaturedTags";
import { toTeamImages } from "@feelandnote/shared/lib/faction-team-image";
import type { FactionTagItem } from "@/actions/user/getCelebBySlug";
import FactionMediaLinks from "@/components/features/faction/FactionMediaLinks";
import BlurDissolve from "@/components/ui/BlurDissolve";
import { Z_INDEX } from "@/constants/zIndex";
import typography from "./CelebDetailTypography.module.css";

interface FactionPreviewModalProps {
  tag: FactionTagItem;
  preview?: FactionTagPreview;
  currentCelebId: string;
  loadingMemberId: string | null;
  onMemberSelect: (memberId: string) => void;
  onClose: () => void;
}

export default function FactionPreviewModal({
  tag,
  preview,
  currentCelebId,
  loadingMemberId,
  onMemberSelect,
  onClose,
}: FactionPreviewModalProps) {
  const locale = useLocale();
  const t = useTranslations("celebPage");
  const isEn = locale === "en";
  const [activeTeamImage, setActiveTeamImage] = useState(0);
  /* 인물을 한 번 누르면 이 창 안에서 짚기만 하고, 같은 인물을 다시 눌러야 그 사람 카드로 넘어간다. */
  const [focusedId, setFocusedId] = useState<string | null>(currentCelebId);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    const focusFrame = requestAnimationFrame(() => closeButtonRef.current?.focus());

    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      cancelAnimationFrame(focusFrame);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  const resolve = (en: string | null, ko: string | null) => (isEn && en ? en : ko);
  const name = isEn && tag.name_en ? tag.name_en : tag.name;
  const description = resolve(tag.description_en, tag.description);
  const roleShort = resolve(tag.roleShortEn, tag.roleShort);
  const roleLong = resolve(tag.roleLongEn, tag.roleLong);
  // 화면 저장분에 옛 형태(주소만)가 남아 있어도 읽히게 한 번 더 정규화한다
  const teamImages = toTeamImages(preview?.teamImages ?? []);
  const members = preview?.members ?? [];
  const teamImage = teamImages[activeTeamImage] ?? teamImages[0] ?? null;
  const teamImageSrc = teamImage?.url ?? null;
  // 사진마다 「어느 무리를 찍었는지」가 함께 온다. 없던 시절 사진은 비어 있다
  const teamImageLabel = teamImage ? resolve(teamImage.labelEn ?? null, teamImage.label ?? null) : null;

  const focusedMember = members.find((member) => member.id === focusedId) ?? null;
  const focusedIsCurrent = !focusedMember || focusedMember.id === currentCelebId;
  const focusedName = focusedMember
    ? (isEn && focusedMember.nicknameEn ? focusedMember.nicknameEn : focusedMember.nickname)
    : null;
  const focusedRole = focusedMember
    ? resolve(focusedMember.roleShortEn, focusedMember.roleShort)
    : null;

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center overflow-hidden bg-black/80 p-3 backdrop-blur-sm animate-fade-in sm:p-5"
      style={{ zIndex: Z_INDEX.modal }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="faction-preview-title"
        className={`${typography.detailTypography} relative max-h-[calc(100dvh-1.5rem)] w-full max-w-3xl overscroll-contain overflow-y-auto rounded-[3px] border border-white/15 bg-bg-main shadow-[0_28px_100px_rgba(0,0,0,0.85)] animate-modal-content sm:max-h-[calc(100dvh-2.5rem)]`}
      >
        <div
          className="sticky top-0 z-20 h-[2px] w-full"
          style={{ backgroundColor: tag.color }}
          aria-hidden
        />

        <button
          ref={closeButtonRef}
          type="button"
          onClick={onClose}
          className="absolute right-3 top-4 z-30 flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-black/50 hover:border-white/25 hover:bg-white/10 hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          aria-label={t("factionClose")}
        >
          <X size={18} />
        </button>

        <header className="border-b border-white/10 px-5 pb-5 pt-6 pr-16 sm:px-7 sm:pr-16">
          <p
            className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em]"
            style={{ color: tag.color }}
          >
            {t("factionPreview")}
          </p>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h2
              id="faction-preview-title"
              className="font-serif text-3xl font-bold leading-tight text-text-primary sm:text-4xl"
            >
              {name}
            </h2>
            <div className="flex flex-wrap gap-2">
              {members.length > 0 && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[11px] text-text-secondary">
                  <Users size={12} aria-hidden />
                  {t("factionMemberCount", { count: members.length })}
                </span>
              )}
              {teamImages.length > 0 && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[11px] text-text-secondary">
                  <Images size={12} aria-hidden />
                  {t("factionPhotoCount", { count: teamImages.length })}
                </span>
              )}
            </div>
          </div>
        </header>

        {teamImageSrc && (
          <section className="space-y-3 p-5 pb-0 sm:p-7 sm:pb-0">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.16em]">
              {t("factionGroupShots")}
            </h3>
            <div className="relative aspect-[16/9] overflow-hidden rounded-[2px] bg-[#090909] ring-1 ring-white/10">
              <BlurDissolve className="absolute inset-0">
                <Image
                  key={`blur-${teamImageSrc}`}
                  src={teamImageSrc}
                  alt=""
                  fill
                  unoptimized
                  aria-hidden
                  className="object-cover scale-110 blur-3xl opacity-45"
                />
                <div className="absolute inset-0 bg-black/25" />
                <Image
                  key={teamImageSrc}
                  src={teamImageSrc}
                  alt={`${name} ${t("factionGroupShots")}`}
                  fill
                  unoptimized
                  sizes="(max-width: 768px) 100vw, 850px"
                  className="object-contain animate-fade-in"
                />
              </BlurDissolve>

              {teamImages.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() => setActiveTeamImage((activeTeamImage - 1 + teamImages.length) % teamImages.length)}
                    className="absolute left-2 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black/65 text-white/80 hover:border-white/30 hover:bg-black/90 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent sm:left-3"
                    aria-label={t("factionPreviousPortrait")}
                  >
                    <ArrowLeft size={19} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTeamImage((activeTeamImage + 1) % teamImages.length)}
                    className="absolute right-2 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black/65 text-white/80 hover:border-white/30 hover:bg-black/90 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent sm:right-3"
                    aria-label={t("factionNextPortrait")}
                  >
                    <ArrowRight size={19} />
                  </button>
                </>
              )}
            </div>

            {teamImageLabel && (
              <p className="text-center text-[13px] text-text-secondary">{teamImageLabel}</p>
            )}

            {teamImages.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {teamImages.map((image, index) => (
                  <button
                    key={image.url}
                    type="button"
                    onClick={() => setActiveTeamImage(index)}
                    className={`relative h-12 w-[72px] flex-shrink-0 overflow-hidden rounded-[2px] border bg-black ${
                      index === activeTeamImage
                        ? "border-accent"
                        : "border-white/10 opacity-60 hover:border-white/30 hover:opacity-100"
                    }`}
                    aria-label={`${t("factionGroupShots")} ${index + 1}`}
                    aria-pressed={index === activeTeamImage}
                  >
                    <Image src={image.url} alt="" fill unoptimized aria-hidden sizes="72px" className="object-cover" />
                  </button>
                ))}
              </div>
            )}
          </section>
        )}

        <div className="grid gap-8 p-5 sm:p-7">
          <div className="space-y-7">
            {/* 이 테마를 다룬 세력도감 영상·배경음악 — 창을 떠나지 않고 그 자리에서 본다. 없으면 안 뜬다 */}
            <FactionMediaLinks videos={tag.videos} music={tag.music} title={name} />

            {description && (
              <section>
                <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em]">
                  {t("factionThemeIntro")}
                </h3>
                <p className="whitespace-pre-line text-sm leading-7 text-text-secondary">
                  {description}
                </p>
              </section>
            )}

            {(focusedIsCurrent ? roleShort || roleLong : focusedMember) && (
              <section className="border-l-2 pl-4" style={{ borderColor: tag.color }}>
                <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em]">
                  {t("factionRole")}
                </h3>

                {focusedIsCurrent ? (
                  <>
                    {roleShort && (
                      <p className="font-serif text-xl font-bold leading-snug text-text-primary sm:text-2xl">
                        {roleShort}
                      </p>
                    )}
                    {roleLong && (
                      <p className="mt-3 whitespace-pre-line text-sm leading-7 text-text-secondary">
                        {roleLong}
                      </p>
                    )}
                  </>
                ) : focusedMember ? (
                  <>
                    <p className="font-serif text-xl font-bold leading-snug text-text-primary sm:text-2xl">
                      {focusedName}
                    </p>
                    {focusedRole && (
                      <p className="mt-2 text-sm leading-7 text-text-secondary">
                        {focusedRole}
                      </p>
                    )}
                    <button
                      type="button"
                      onClick={() => onMemberSelect(focusedMember.id)}
                      disabled={focusedMember.id === loadingMemberId}
                      className="mt-3 inline-flex items-center gap-1.5 rounded-[2px] border border-accent/50 px-4 py-2 text-sm font-bold text-accent hover:bg-accent hover:text-bg-main focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-wait"
                    >
                      {t("factionOpenMember")}
                      <ArrowRight size={15} />
                    </button>
                  </>
                ) : null}
              </section>
            )}
          </div>

          {members.length > 0 && (
            <section>
              <div className="mb-3 flex items-center justify-between gap-3">
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.16em]">
                  {t("factionMembers")}
                </h3>
                <span className="font-mono text-[11px]">
                  {t("factionMemberCount", { count: members.length })}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {members.map((member) => {
                  const memberName = isEn && member.nicknameEn ? member.nicknameEn : member.nickname;
                  const memberRole = isEn && member.roleShortEn ? member.roleShortEn : member.roleShort;
                  const isCurrent = member.id === currentCelebId;
                  const isLoading = member.id === loadingMemberId;

                  const memberContent = (
                    <>
                      {isCurrent && (
                        <span
                          className="absolute right-1.5 top-1.5 rounded-full px-1.5 py-0.5 text-[8px] font-bold"
                          style={{ color: tag.color, backgroundColor: `${tag.color}18` }}
                        >
                          {t("factionCurrentMember")}
                        </span>
                      )}
                      <div className="relative mb-3 h-16 w-16 overflow-hidden sm:h-20 sm:w-20 rounded-full bg-bg-secondary ring-1 ring-white/10 group-hover:ring-accent/45">
                        {isLoading ? (
                          <span className="flex h-full w-full items-center justify-center text-accent">
                            <LoaderCircle size={19} className="animate-spin" aria-hidden />
                          </span>
                        ) : member.avatarUrl ? (
                          <BlurDissolve className="absolute inset-0">
                            <Image
                              src={member.avatarUrl}
                              alt={memberName}
                              fill
                              unoptimized
                              sizes="80px"
                              className="object-cover transition-transform duration-300 group-hover:scale-105"
                            />
                          </BlurDissolve>
                        ) : (
                          <span className="flex h-full w-full items-center justify-center font-serif text-sm">
                            {memberName.charAt(0)}
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-bold leading-tight text-text-primary group-hover:text-accent">
                        {memberName}
                      </p>
                      {memberRole && (
                        <p className="mt-1 line-clamp-2 text-[10px] leading-snug">
                          {memberRole}
                        </p>
                      )}
                    </>
                  );

                  const isFocused = member.id === focusedId;

                  return (
                    <button
                      key={member.id}
                      type="button"
                      onClick={() => {
                        // 짚지 않은 인물이면 짚기만 하고, 이미 짚어 둔 인물이면 그 사람 카드를 연다.
                        if (!isFocused) {
                          setFocusedId(member.id);
                          return;
                        }
                        if (!isCurrent) onMemberSelect(member.id);
                      }}
                      disabled={isLoading}
                      aria-busy={isLoading}
                      aria-pressed={isFocused}
                      className={`group relative flex min-h-[168px] cursor-pointer flex-col items-center rounded-[2px] border px-3 py-4 text-center transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-wait ${
                        isFocused
                          ? "border-accent bg-white/[0.055]"
                          : "border-white/10 bg-white/[0.018] hover:border-accent/40 hover:bg-white/[0.045]"
                      }`}
                      style={isCurrent && !isFocused ? { borderColor: tag.color } : undefined}
                    >
                      {memberContent}
                    </button>
                  );
                })}
              </div>
            </section>
          )}
        </div>

        <footer className="sticky bottom-0 z-20 flex flex-col-reverse gap-2 border-t border-white/10 bg-bg-main/95 p-4 backdrop-blur-md sm:flex-row sm:justify-end sm:px-7">
          <button
            type="button"
            onClick={onClose}
            className="rounded-[2px] border border-white/10 px-5 py-2.5 text-sm font-medium text-text-secondary hover:border-white/25 hover:bg-white/5 hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            {t("factionClose")}
          </button>
          <Link
            href={`/explore/faction/${tag.slug}`}
            className="inline-flex items-center justify-center gap-1.5 rounded-[2px] border border-accent/60 bg-accent/10 px-5 py-2.5 text-sm font-bold text-accent hover:bg-accent hover:text-bg-main focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            {t("factionOpen")}
            <ArrowRight size={15} />
          </Link>
        </footer>
      </div>
    </div>,
    document.body,
  );
}
