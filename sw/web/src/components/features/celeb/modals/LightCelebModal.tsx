/*
  Light 셀럽 상세 모달
  - 감상 기록 없이 명언·프로필 중심
  - PC/모바일: 중앙 모달
*/
"use client";

import { useState, useEffect } from "react";
import { Link } from "@/i18n/navigation";
import { Check, UserPlus, ExternalLink, Calendar, MapPin, Briefcase } from "lucide-react";
import { toggleFollow } from "@/actions/user";
import type { CelebProfile } from "@/types/home";
import { getCelebProfileUrl } from "@/lib/url";
import { getAuraByScore, type Aura } from "@/constants/materials";
import Modal from "@/components/ui/Modal";
import { FormattedText } from "@/components/ui";
import { Avatar, BlurDissolve } from "@/components/ui";
import { useTranslations, useLocale } from "next-intl";

const AURA_GRADIENTS: Record<Aura, string> = {
  1: "from-[#8d6e63] via-[#5d4037] to-[#3e2723]",
  2: "from-[#607d8b] via-[#455a64] to-[#263238]",
  3: "from-[#D4C1A5] via-[#8C7853] to-[#5D4037]",
  4: "from-[#FFFFFF] via-[#C0C0C0] to-[#808080]",
  5: "from-[#FCF6BA] via-[#D4AF37] to-[#8A6E2F]",
  6: "from-[#98FB98] via-[#50C878] to-[#2E8B57]",
  7: "from-[#FF6B6B] via-[#DC143C] to-[#8B0000]",
  8: "from-[#E0FFFF] via-[#B0E0E6] to-[#87CEEB]",
  9: "from-[#FF00FF] via-[#00FFFF] to-[#FFFF00]",
};

interface LightCelebModalProps {
  celeb: CelebProfile;
  isOpen: boolean;
  onClose: () => void;
  zIndex?: number;
}

export default function LightCelebModal({ celeb, isOpen, onClose, zIndex }: LightCelebModalProps) {
  const t = useTranslations("home.ui");
  const tProf = useTranslations("profession");
  const locale = useLocale();
  const isEn = locale === "en";

  const displayNickname = (isEn && celeb.nickname_en) || celeb.nickname;
  const displayTitle = (isEn && celeb.title_en) || celeb.title;
  const displayBio = (isEn && celeb.bio_en) || celeb.bio;
  const displayQuotes = (isEn && celeb.quotes_en) || celeb.quotes;

  const [followingOverride, setFollowingOverride] = useState<{
    celebId: string;
    value: boolean;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const isFollowing =
    followingOverride?.celebId === celeb.id
      ? followingOverride.value
      : celeb.is_following;

  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [isOpen]);

  const aura: Aura = celeb.influence?.total_score != null
    ? getAuraByScore(celeb.influence.total_score)
    : 1;
  const borderGradient = AURA_GRADIENTS[aura];

  const handleFollowClick = async () => {
    if (isLoading) return;
    setIsLoading(true);
    const prevState = isFollowing;
    setFollowingOverride({ celebId: celeb.id, value: !isFollowing });
    const result = await toggleFollow(celeb.id, "celeb");
    if (!result.success) {
      setFollowingOverride({ celebId: celeb.id, value: prevState });
    }
    setIsLoading(false);
  };

  if (!isOpen) return null;

  const content = (
    <div className="flex flex-col w-full h-full overflow-y-auto custom-scrollbar">
      {/* Avatar + 이름 + 메타 */}
      <div className="flex flex-col items-center px-6 pt-8 pb-4 shrink-0">
        <BlurDissolve>
          <Avatar
            url={celeb.avatar_url}
            name={displayNickname}
            size="2xl"
            className="ring-2 ring-accent/30 rounded-full shadow-2xl mb-4"
          />
        </BlurDissolve>

        {displayTitle && (
          <p className="text-[10px] text-accent font-bold uppercase tracking-[.25em] mb-1">{displayTitle}</p>
        )}

        <h2 className="text-2xl md:text-3xl font-black font-serif text-text-primary leading-tight text-center break-all mb-3">
          {displayNickname}
        </h2>

        {/* 메타 정보 */}
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs md:text-sm justify-center">
          {celeb.profession && (
            <span className="flex items-center gap-1">
              <Briefcase size={12} />
              {tProf.has(celeb.profession) ? tProf(celeb.profession) : celeb.profession}
            </span>
          )}
          {celeb.nationality && (
            <span className="flex items-center gap-1">
              <MapPin size={12} />
              {celeb.nationality}
            </span>
          )}
          {celeb.birth_date && (
            <span className="flex items-center gap-1">
              <Calendar size={12} />
              {celeb.birth_date}
              {celeb.death_date && ` ~ ${celeb.death_date}`}
            </span>
          )}
        </div>
      </div>

      {/* 명언 */}
      {displayQuotes && (
        <blockquote className="text-xs md:text-sm font-serif bg-white/[0.03] rounded-sm py-4 mx-6 mb-2 leading-relaxed text-center px-4">
          <FormattedText text={displayQuotes} />
        </blockquote>
      )}

      {/* 바이오 */}
      {displayBio && (
        <div className="px-6 md:px-8 pt-4 pb-2">
          <p className="text-xs md:text-sm text-text-secondary leading-relaxed text-left break-all">
            <FormattedText text={displayBio} />
          </p>
        </div>
      )}

      {/* 하단 액션 */}
      <div className="flex gap-3 px-6 md:px-8 py-6 shrink-0 mt-auto">
        <button
          onClick={handleFollowClick}
          disabled={isLoading}
          className={`
            flex-1 flex items-center justify-center gap-1.5 py-3 rounded-2xl md:rounded-sm font-bold text-xs md:text-sm transition-all active:scale-95
            ${isFollowing
              ? "bg-black/40 backdrop-blur-md text-accent border border-accent/40 shadow-inner"
              : "bg-accent text-black border border-accent shadow-[0_0_15px_rgba(212,175,55,0.4)] hover:shadow-[0_0_20px_rgba(212,175,55,0.6)]"
            }
            ${isLoading ? "opacity-50 cursor-not-allowed" : ""}
          `}
        >
          {isFollowing ? <Check size={14} strokeWidth={3} /> : <UserPlus size={14} strokeWidth={3} />}
          <span>{isFollowing ? t("followingLabel") : t("followLabel")}</span>
          <span className="font-extrabold">{t("followerUnit", { count: celeb.follower_count || 0 })}</span>
        </button>
        <Link
          href={getCelebProfileUrl(celeb)}
          className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-2xl md:rounded-sm border border-accent/30 hover:border-accent/60 text-accent font-bold text-xs md:text-sm hover:bg-accent/5 transition-all duration-300 backdrop-blur-sm active:scale-[0.98]"
        >
          <ExternalLink size={14} strokeWidth={2} />
          <span>{t("viewProfile")}</span>
        </Link>
      </div>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      frame="plain"
      widthClassName="max-w-[520px]"
      overlayClassName="bg-black/70 backdrop-blur-sm"
      boxClassName={`rounded-sm bg-gradient-to-br p-[3px] ${borderGradient} shadow-[0_0_50px_-12px_rgba(212,175,55,0.25)]`}
      closeButtonClassName="absolute -top-3 -right-3 z-20 flex h-8 w-8 items-center justify-center rounded-full border border-border bg-bg-main text-text-secondary hover:bg-bg-card hover:text-text-primary"
      animateHeight={false}
      zIndex={zIndex}
    >
      <div className="relative bg-bg-main max-h-[calc(100dvh-4rem)] overflow-hidden flex flex-col">
        {content}
      </div>
    </Modal>
  );
}
