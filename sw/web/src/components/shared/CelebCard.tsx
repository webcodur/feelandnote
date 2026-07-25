/*
  파일명: /components/shared/CelebCard.tsx
  기능: 셀럽 카드 공통 컴포넌트
  책임: 셀럽 정보를 다양한 형태로 표시하고
        카드 클릭 → 오버레이(greeting + 버튼) → 인포 버튼으로 상세 모달을 띄운다.
*/ // ------------------------------

"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Info, ExternalLink } from "lucide-react";
import { Link } from "@/i18n/navigation";
import CelebDetailModal from "@/components/features/celeb/modals/CelebDetailModal";
import LightCelebModal from "@/components/features/celeb/modals/LightCelebModal";
import { getCelebForModal } from "@/actions/celebs/getCelebForModal";
import { CelebImage, VoiceBadge } from "@/components/ui";
import type { CelebProfile } from "@/types/home";
import type { DialogueSubtitleData } from "@/components/features/game/shared/hooks/useDialogue";
import { useCelebGreeting } from "@/hooks/useCelebGreeting";
import { useTranslations, useLocale } from "next-intl";
import type { Locale } from "@/types/locale";

// #region Types
type Variant = "card" | "circle" | "medallion";
type CardShape = "circle" | "square";

interface CelebCardProps {
  id: string;
  nickname: string;
  avatar_url?: string | null;
  title?: string | null;
  count?: number;
  className?: string;
  celebProfile?: CelebProfile;
  variant?: Variant;
  /** card variant 전용: 이미지 형태 (circle | square) */
  shape?: CardShape;
  // 부모에서 모달 관리 시 위임 (네비게이션 지원용)
  onOpenModal?: (celeb: CelebProfile, index: number) => void;
  index?: number;
  /** 대사 자막 콜백 — 카드 클릭 시 greeting 대사를 DialogueSubtitle로 표시 */
  onSubtitle?: (sub: DialogueSubtitleData) => void;
}
// #endregion

// #region Variant Styles
const badgeStyles = {
  card: "absolute top-1.5 right-1.5 min-w-[24px] h-[24px] px-1.5 bg-black/50 backdrop-blur-md rounded-full border border-accent/50 text-accent text-[10px] shadow-sm",
  circle: "absolute -top-1 -right-1 min-w-[28px] h-7 px-1.5 bg-accent text-black rounded-full text-xs",
  medallion: "absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-accent text-black rounded-full border border-black/20 shadow-lg text-[10px]",
};
// #endregion

export default function CelebCard({
  id,
  nickname,
  avatar_url,
  title,
  count,
  className = "",
  celebProfile,
  variant = "card",
  shape = "circle",
  onOpenModal,
  index = 0,
  onSubtitle,
}: CelebCardProps) {
  const t = useTranslations("shared.celeb");
  const locale = useLocale();
  const isLight = celebProfile?.celeb_tier === 'light';
  const displayNickname = (locale === "en" && celebProfile?.nickname_en) ? celebProfile.nickname_en : nickname;
  const displayTitle = (locale === "en" && celebProfile?.title_en) ? celebProfile.title_en : title;
  const [selectedCeleb, setSelectedCeleb] = useState<CelebProfile | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const hasVoice = celebProfile?.has_voice ?? false;
  const { fireGreeting } = useCelebGreeting({ onSubtitle, locale: locale as Locale });

  // 외부 클릭 시 오버레이 닫기
  useEffect(() => {
    if (!isActive) return;
    const handler = (e: MouseEvent) => {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) {
        setIsActive(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isActive]);


  /** greeting + quote 슬롯에서 균등 확률로 발사 (단일원천: useCelebGreeting) */
  const fireDialogue = useCallback(() => {
    if (!celebProfile) return;
    fireGreeting({ ...celebProfile, nickname: displayNickname });
    if (hasVoice) setVoicePulse(prev => prev + 1);
  }, [celebProfile, displayNickname, hasVoice, fireGreeting]);

  const [voicePulse, setVoicePulse] = useState(0);
  const [ripple, setRipple] = useState<{ x: number; y: number; key: number } | null>(null);
  const rippleCounter = useRef(0);

  // 카드 클릭 → 첫 클릭: 오버레이 열기 + 대사 / 재클릭: ripple + 대사 재발사
  const handleCardClick = useCallback((e: React.MouseEvent) => {
    if (isLoading) return;
    if (!isActive) {
      setIsActive(true);
      fireDialogue();
    } else {
      // 클릭 좌표 → 카드 내 상대 좌표
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      setRipple({ x, y, key: ++rippleCounter.current });
      fireDialogue();
    }
  }, [isLoading, isActive, fireDialogue]);

  // 인포 버튼 → 모달 열기
  const handleInfoClick = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsActive(false);

    if (celebProfile) {
      if (onOpenModal) { onOpenModal(celebProfile, index); return; }
      setSelectedCeleb(celebProfile);
      setIsModalOpen(true);
      return;
    }

    setIsLoading(true);
    try {
      const data = await getCelebForModal(id);
      if (data) {
        if (onOpenModal) { onOpenModal(data, index); return; }
        setSelectedCeleb(data);
        setIsModalOpen(true);
      }
    } catch (error) {
      console.error("Failed to fetch celeb details:", error);
    } finally {
      setIsLoading(false);
    }
  }, [celebProfile, onOpenModal, index, id]);

  // #region Shared Styles
  const vignetteBg = {
    background: "radial-gradient(circle at 50% 0%, #302b27 0%, #171513 40%, #0a0908 100%)"
  };
  const subjectShadow = "drop-shadow-[0_10px_15px_rgba(0,0,0,0.8)]";

  const GlowEffect = ({ isCelebGroup = false }: { isCelebGroup?: boolean }) => {
    const hoverClasses = isCelebGroup
      ? "group-hover/celeb:opacity-100 group-hover/celeb:scale-125 group-hover/celeb:bg-accent/40"
      : "group-hover:opacity-100 group-hover:scale-125 group-hover:bg-accent/40";

    return (
      <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[70%] h-[70%] rounded-full bg-accent/20 blur-[20px] opacity-40 transition-all duration-700 pointer-events-none mix-blend-screen z-0 ${hoverClasses}`} />
    );
  };

  const NoiseTexture = () => (
    <div
      className="absolute inset-0 opacity-[0.06] pointer-events-none z-0 mix-blend-overlay"
      style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='1.5' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}
    />
  );
  // #endregion

  // #region Card Variant
  if (variant === "card") {
    const isCircleShape = shape === "circle";
    const roundedClass = isCircleShape ? "rounded-full" : "rounded-md";

    return (
      <>
        <div ref={cardRef} className={`relative flex flex-col items-center ${className}`}>
          <div
            role="button"
            tabIndex={0}
            onClick={handleCardClick}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleCardClick(e as unknown as React.MouseEvent); } }}
            className={`group relative aspect-square w-full ${roundedClass} overflow-hidden cursor-pointer
              border border-white/5 hover:border-white/20 transition-[border-color,box-shadow,transform] duration-200
              ${isActive ? "border-accent/40 ring-1 ring-accent/30" : ""}
              ${isLoading ? "animate-pulse border-accent/30 pointer-events-none opacity-70" : ""}
              ring-1 ring-inset ring-white/5 shadow-inner hover:shadow-[0_0_15px_rgba(var(--color-accent-rgb),0.3)] hover:duration-500
            `}
            style={vignetteBg}
          >
            <NoiseTexture />
            <GlowEffect />
            <CelebImage
              src={avatar_url}
              alt={nickname}
              shape={isCircleShape ? "circle" : "square"}
              sizes="(max-width: 640px) 120px, (max-width: 1024px) 180px, 200px"
              maxPx={300}
              fallbackSize={32}
              className={`z-10 relative ${subjectShadow} transition-transform duration-500 group-hover:scale-105`}
            />

            {/* 음성 지원 뱃지 */}
            {hasVoice && (
              <div className="absolute top-1.5 left-1.5 z-40">
                <VoiceBadge pulse={voicePulse} />
              </div>
            )}

            {/* 콘텐츠 수 뱃지 (오버레이 비활성 시, full 전용) */}
            {!isLight && !isActive && count !== undefined && count > 0 && (
              <div className={`${badgeStyles.card} z-20 flex items-center justify-center`} title={t("contentCount", { count })}>
                <span className="font-bold leading-none">{count}</span>
              </div>
            )}

            {isLoading && (
              <div className={`absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm ${roundedClass} z-10`}>
                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              </div>
            )}

            {/* 오버레이: 인포 + 팔로우 버튼 (하단 가로 배치) */}
            {isActive && (
              <div className={`absolute inset-0 z-30 flex items-end bg-black/50 backdrop-blur-sm ${roundedClass} p-2 animate-fade-in`}>
                {/* 클릭 지점 ripple */}
                {ripple && (
                  <span
                    key={ripple.key}
                    className="absolute rounded-full bg-accent/40 pointer-events-none animate-[ripple_400ms_ease-out_forwards]"
                    style={{ left: `${ripple.x}%`, top: `${ripple.y}%`, translate: '-50% -50%' }}
                    onAnimationEnd={() => setRipple(null)}
                  />
                )}
                <div className="flex gap-1.5 w-full">
                  {celebProfile?.slug && (
                    <Link
                      href={`/celeb/${celebProfile.slug}`}
                      onClick={(e) => e.stopPropagation()}
                      className="flex-1 flex items-center justify-center py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-md text-white transition-colors"
                    >
                      <ExternalLink size={16} />
                    </Link>
                  )}
                  <button
                    onClick={handleInfoClick}
                    className="flex-1 flex items-center justify-center py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-md text-white transition-colors"
                  >
                    <Info size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 이름 + 수식어 */}
          <div className="mt-1.5 w-full text-center px-0.5">
            <p className="text-xs md:text-sm font-semibold text-text-primary truncate leading-tight">{displayNickname}</p>
            {displayTitle ? (
              <p className="text-[10px] md:text-xs text-amber-400/80 truncate leading-tight mt-0.5">{displayTitle}</p>
            ) : null}
          </div>
        </div>

        {!onOpenModal && selectedCeleb && (
          isLight ? (
            <LightCelebModal celeb={selectedCeleb} isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
          ) : (
            <CelebDetailModal celeb={selectedCeleb} isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
          )
        )}
      </>
    );
  }
  // #endregion

  // #region Circle & Medallion Variants
  const isCircle = variant === "circle";
  const config = variant === "circle"
    ? { container: "w-24 h-24 rounded-full", sizes: "96px", fallbackSize: 32 }
    : { container: "w-14 h-14 sm:w-16 sm:h-16 rounded-full", sizes: "64px", fallbackSize: 20 };

  // circle/medallion 클릭 → 모달 열기 + greeting/quote 발사
  const handleCircleClick = async () => {
    if (isLoading) return;
    fireDialogue();

    if (celebProfile) {
      if (onOpenModal) { onOpenModal(celebProfile, index); return; }
      setSelectedCeleb(celebProfile);
      setIsModalOpen(true);
      return;
    }

    setIsLoading(true);
    try {
      const data = await getCelebForModal(id);
      if (data) {
        if (onOpenModal) { onOpenModal(data, index); return; }
        setSelectedCeleb(data);
        setIsModalOpen(true);
      }
    } catch (error) {
      console.error("Failed to fetch celeb details:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={handleCircleClick}
        disabled={isLoading}
        className={`group/celeb flex flex-col items-center ${isCircle ? "gap-2" : ""} ${className}`}
      >
        <div className={`
          relative shrink-0 ${config.container} p-0.5
          border border-white/10 shadow-lg transition-[transform,box-shadow] duration-300
          group-hover/celeb:border-accent/60
          ${variant === "medallion" ? "group-hover/celeb:scale-105 shadow-xl" : ""}
          ${isLoading ? "animate-pulse border-accent/50" : ""}
        `}
          style={{ background: "#0a0a0c" }}
        >
          <div
            className="absolute inset-0.5 rounded-full overflow-hidden shadow-inner ring-1 ring-white/5 ring-inset"
            style={vignetteBg}
          >
            <NoiseTexture />
            <GlowEffect isCelebGroup />
            <CelebImage
              src={avatar_url}
              alt={nickname}
              shape="circle"
              sizes={config.sizes}
              fallbackSize={config.fallbackSize}
              className={`z-10 relative ${subjectShadow} transition-transform duration-500 group-hover/celeb:scale-110`}
            />
          </div>

          {!isLight && count !== undefined && count > 0 && (
            <div className={`${badgeStyles[variant]} z-20 flex items-center justify-center font-bold`} title={t("contentCount", { count })}>
              {count}
            </div>
          )}

          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm rounded-full">
              <div className={`${isCircle ? "w-6 h-6" : "w-4 h-4"} border-2 border-white/30 border-t-white rounded-full animate-spin`} />
            </div>
          )}
        </div>

        {isCircle && (
          <span className="text-sm font-medium text-text-secondary group-hover/celeb:text-white text-center leading-tight line-clamp-2">
            {displayNickname}
          </span>
        )}
      </button>

      {!onOpenModal && selectedCeleb && (
        isLight ? (
          <LightCelebModal celeb={selectedCeleb} isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
        ) : (
          <CelebDetailModal celeb={selectedCeleb} isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
        )
      )}
    </>
  );
  // #endregion
}
