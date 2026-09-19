/* ─────────────────────────────────────────────
 * [celeb 상세] faction — 세력 한 개의 도감 화면
 * - 목차 위치: connections > faction (FactionSection 자식, 선택기에서 고른 세력)
 * - 데이터: membership(이 인물의 배정)/faction(테마)/members(보일 동료 명단) props
 * - 함께 보기: ../FactionSection.tsx, explore/faction/FactionScreen.tsx
 *
 * 탐색 세력도감 페이지의 뼈대를 따른다 — 중앙 제목(인원 수는 제목 우측에 떠 있다),
 * 테마 소개, 「세력과 이 인물」 위치 패널, 동료 인물 격자.
 * 도감 이동은 제목 우측 끝의 화살표 단추가 맡는다.
 * ───────────────────────────────────────────── */
"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ArrowUpRight, ChevronDown, ChevronUp, User } from "lucide-react";
import { useTranslations } from "next-intl";

import type { FeaturedCeleb, FeaturedFaction } from "@/actions/home/getFeaturedFactions";
import type { FactionItem } from "@/actions/user/getCelebBySlug";
import { FormattedText, splitReadableParagraphs } from "@/components/ui";
import ImageViewerModal from "@/components/ui/ImageViewerModal";
import { Link } from "@/i18n/navigation";
import {
  localizedFactionDescription,
  localizedFactionName,
} from "@/lib/faction-sections";
import { cn } from "@/lib/utils";
import type { Locale } from "@/types/locale";

import CelebPersonPreviewButton from "../CelebPersonPreviewButton";

/** 처음에 세우는 동료 인물 수 — 나머지는 「더 보기」로 펼친다 */
const MEMBERS_PREVIEW = 12;

/** 한글 이름 끝글자에 받침이 있으면 「과」를 붙인다 */
const endsWithJong = (value: string) => {
  const code = value.trim().charCodeAt(value.trim().length - 1);
  return code >= 0xac00 && code <= 0xd7a3 && (code - 0xac00) % 28 !== 0;
};

interface FactionMembershipCardProps {
  /** 테마 정보와 전체 명단 */
  faction: FeaturedFaction;
  /** 이 인물의 배정 — 세력 안 역할·긴 소개·세력 화보 */
  membership: FactionItem;
  locale: Locale;
  /** 페이지 주인 — 위치 패널 머리에 이름·얼굴을 세운다 */
  ownerName: string;
  ownerAvatarUrl: string | null;
  /** 선택기에서 고른 범위의 동료 인물 — 페이지 주인은 이미 빠져 있다 */
  members: FeaturedCeleb[];
  /** 동료 인물을 누르면 부른다 */
  onOpenMember: (member: FeaturedCeleb) => void;
  /** 지금 카드를 불러오는 중인 인물 */
  pendingMemberId?: string | null;
}

/** 글줄이 잘렸는지 재서 「더 보기」를 달지 정한다 — [측정 대상 ref, 잘림 여부]를 돌려준다 */
function useClipped(expanded: boolean, deps: readonly unknown[]) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [clipped, setClipped] = useState(false);
  useEffect(() => {
    if (expanded) return; // 펼친 동안은 접을 단추가 필요하니 다시 재지 않는다
    const measure = () => {
      const el = ref.current;
      setClipped(el ? el.scrollHeight > el.clientHeight + 1 : false);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expanded, ...deps]);
  return [ref, clipped] as const;
}

export default function FactionMembershipCard({
  faction,
  membership,
  locale,
  ownerName,
  ownerAvatarUrl,
  members,
  onOpenMember,
  pendingMemberId = null,
}: FactionMembershipCardProps) {
  const t = useTranslations("celebPage");
  const isEn = locale === "en";

  const factionName = localizedFactionName(faction, locale);
  const descParagraphs = splitReadableParagraphs(localizedFactionDescription(faction, locale));
  const roleShort = (isEn ? membership.roleShortEn?.trim() || membership.roleShort : membership.roleShort)?.trim() || null;
  const roleParagraphs = splitReadableParagraphs(
    (isEn ? membership.roleLongEn?.trim() || membership.roleLong : membership.roleLong) ?? "",
  );

  const [descExpanded, setDescExpanded] = useState(false);
  const [roleExpanded, setRoleExpanded] = useState(false);
  const [membersExpanded, setMembersExpanded] = useState(false);
  const [zoomOpen, setZoomOpen] = useState(false);
  const [descRef, descClipped] = useClipped(descExpanded, [locale]);
  const [roleRef, roleClipped] = useClipped(roleExpanded, [locale]);

  const memberRole = (celeb: FeaturedCeleb) =>
    ((isEn ? celeb.short_desc_en : celeb.short_desc) ??
      (isEn ? celeb.title_en : celeb.title))?.trim() || null;
  const memberName = (celeb: FeaturedCeleb) =>
    (isEn && celeb.nickname_en?.trim()) || celeb.nickname;

  const visibleMembers = membersExpanded ? members : members.slice(0, MEMBERS_PREVIEW);
  const hiddenCount = Math.max(0, members.length - MEMBERS_PREVIEW);
  const hasRoleBlock = roleShort || roleParagraphs.length > 0 || membership.factionImageUrl;

  return (
    <div>
      {/* 도감 머리 — 제목은 가운데, 인원 수는 제목 오른쪽에 떠 있어 가운데 맞춤에
          끼어들지 않는다. 도감 이동은 우측 끝의 화살표 단추 하나다 */}
      <header className="relative border-b border-white/10 pb-5 md:pb-6">
        <div className="mx-auto max-w-3xl">
          <div className="px-14 text-center">
            <h3 className="relative inline-block text-balance font-serif text-2xl font-bold text-text-primary md:text-3xl">
              {factionName}
              <span className="absolute start-full bottom-1 ms-2.5 whitespace-nowrap font-sans text-xs font-semibold tabular-nums text-accent/80">
                {t("factionMemberCount", { count: faction.celebs.length })}
              </span>
            </h3>
          </div>
          {descParagraphs.length > 0 && (
            <div className="mt-4">
              <div
                ref={descRef}
                className={cn(
                  "space-y-3 break-keep text-sm leading-7 text-text-secondary md:text-[15px] md:leading-8",
                  !descExpanded && "line-clamp-3",
                )}
              >
                {descParagraphs.map((paragraph, index) => (
                  <p key={index}>
                    <FormattedText text={paragraph} />
                  </p>
                ))}
              </div>
              {(descClipped || descExpanded) && (
                <button
                  type="button"
                  onClick={() => setDescExpanded((prev) => !prev)}
                  className="mt-2 inline-flex items-center gap-1 rounded text-xs font-bold text-accent/90 outline-none hover:text-accent focus-visible:ring-2 focus-visible:ring-accent"
                >
                  {descExpanded ? t("factionCollapse") : t("factionDescMore")}
                  {descExpanded ? <ChevronUp size={12} aria-hidden /> : <ChevronDown size={12} aria-hidden />}
                </button>
              )}
            </div>
          )}
        </div>
        {faction.slug && (
          <Link
            href={`/explore/faction/${faction.slug}`}
            aria-label={t("factionOpen")}
            title={t("factionOpen")}
            className="absolute end-0 top-0 inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-white/[0.04] text-white/70 outline-none hover:border-accent hover:bg-accent/10 hover:text-accent focus-visible:ring-2 focus-visible:ring-accent"
          >
            <ArrowUpRight size={15} aria-hidden />
          </Link>
        )}
      </header>

      {/* 이 인물의 위치 — 「세력과 이 인물」 머리, 배정의 역할과 긴 소개, 세력 화보 */}
      {hasRoleBlock && (
        <section className="mt-5 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-4 md:px-5 md:py-5">
          <div className="flex items-center justify-center gap-2.5">
            <h4 className="min-w-0 break-keep font-serif text-base font-bold leading-snug text-text-primary md:text-lg">
              {isEn ? (
                <>
                  {factionName} and{" "}
                  <span className="text-accent">&lsquo;{ownerName}&rsquo;</span>
                </>
              ) : (
                <>
                  「{factionName}」{endsWithJong(factionName) ? "과" : "와"}{" "}
                  <span className="text-accent">&lsquo;{ownerName}&rsquo;</span>
                </>
              )}
            </h4>
            <span className="relative block h-7 w-7 shrink-0 overflow-hidden rounded-full bg-white/[0.06] ring-1 ring-accent/45">
              {ownerAvatarUrl ? (
                <Image
                  src={ownerAvatarUrl}
                  alt=""
                  fill
                  unoptimized
                  sizes="28px"
                  className="object-cover"
                />
              ) : (
                <User
                  size={14}
                  aria-hidden
                  className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-text-tertiary"
                />
              )}
            </span>
          </div>
          {roleShort && (
            <p className="effect-engraved mx-auto mt-3.5 w-fit max-w-full break-keep rounded-lg border border-accent-dim/30 bg-black/30 px-3.5 py-2 text-center text-sm font-semibold leading-6 text-accent">
              {roleShort}
            </p>
          )}
          <div className={cn("flex items-start gap-4", (roleShort || roleParagraphs.length > 0) && "mt-4")}>
            {membership.factionImageUrl && (
              <button
                type="button"
                onClick={() => setZoomOpen(true)}
                aria-label={t("enlargePhoto")}
                className="group relative block w-24 shrink-0 overflow-hidden rounded-lg ring-1 ring-white/15 outline-none hover:ring-accent/70 focus-visible:ring-2 focus-visible:ring-accent md:w-36"
              >
                <span className="relative block aspect-[3/4] w-full">
                  <Image
                    src={membership.factionImageUrl}
                    alt={factionName}
                    fill
                    unoptimized
                    sizes="(max-width: 768px) 96px, 144px"
                    className="object-cover"
                  />
                </span>
              </button>
            )}
            {roleParagraphs.length > 0 && (
              <div className="min-w-0 flex-1">
                <div
                  ref={roleRef}
                  className={cn(
                    "space-y-2.5 break-keep text-sm leading-6 text-text-primary/85",
                    !roleExpanded && "line-clamp-5",
                  )}
                >
                  {roleParagraphs.map((paragraph, index) => (
                    <p key={index}>
                      <FormattedText text={paragraph} />
                    </p>
                  ))}
                </div>
                {(roleClipped || roleExpanded) && (
                  <button
                    type="button"
                    onClick={() => setRoleExpanded((prev) => !prev)}
                    className="mt-1.5 inline-flex items-center gap-1 rounded text-xs font-bold text-accent/90 outline-none hover:text-accent focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    {roleExpanded ? t("factionCollapse") : t("factionDescMore")}
                    {roleExpanded ? <ChevronUp size={12} aria-hidden /> : <ChevronDown size={12} aria-hidden />}
                  </button>
                )}
              </div>
            )}
          </div>
        </section>
      )}

      {/* 함께 속한 인물 — 선택기에서 고른 범위의 인물 격자 */}
      {members.length > 0 && (
        <section className="mt-6">
          <p className="text-[11px] font-bold tracking-[0.14em] text-accent/80">
            {t("factionMembers")}
            <span className="ms-1.5 font-semibold tabular-nums text-text-secondary/70">
              {members.length}
            </span>
          </p>
          <ul className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4 md:gap-3 lg:grid-cols-5 xl:grid-cols-6">
            {visibleMembers.map((celeb) => {
              const role = memberRole(celeb);
              return (
                <li key={celeb.id}>
                  <CelebPersonPreviewButton
                    name={memberName(celeb)}
                    avatarUrl={celeb.avatar_url}
                    onClick={() => onOpenMember(celeb)}
                    loading={pendingMemberId === celeb.id}
                    size="featured"
                    fullWidth
                    className="h-full border-white/[0.07] bg-white/[0.018] hover:border-accent/45 hover:bg-accent/[0.055]"
                  >
                    <span className="mt-0.5 flex min-h-8 w-full items-start justify-center">
                      {role && (
                        <span className="line-clamp-2 text-balance break-keep text-[11px] leading-4 text-text-secondary">
                          {role}
                        </span>
                      )}
                    </span>
                  </CelebPersonPreviewButton>
                </li>
              );
            })}
          </ul>
          {hiddenCount > 0 && !membersExpanded && (
            <div className="mt-4 flex justify-center">
              <button
                type="button"
                onClick={() => setMembersExpanded(true)}
                className="flex min-h-10 items-center rounded-full border border-white/15 px-5 text-sm font-semibold text-text-secondary outline-none hover:border-accent/60 hover:text-accent focus-visible:ring-2 focus-visible:ring-accent"
              >
                {t("factionMembersMore", { count: hiddenCount })}
              </button>
            </div>
          )}
          {membersExpanded && (
            <div className="mt-4 flex justify-center">
              <button
                type="button"
                onClick={() => setMembersExpanded(false)}
                className="flex min-h-10 items-center rounded-full border border-white/15 px-5 text-sm font-semibold text-text-secondary outline-none hover:border-accent/60 hover:text-accent focus-visible:ring-2 focus-visible:ring-accent"
              >
                {t("factionCollapse")}
              </button>
            </div>
          )}
        </section>
      )}

      {membership.factionImageUrl && (
        <ImageViewerModal
          src={membership.factionImageUrl}
          alt={factionName}
          isOpen={zoomOpen}
          onClose={() => setZoomOpen(false)}
        />
      )}
    </div>
  );
}
