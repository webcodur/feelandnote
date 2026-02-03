import { useState } from "react";
import Image from "next/image";
import { User } from "lucide-react";
import CelebCard from "@/components/shared/CelebCard";
import CelebDetailModal from "@/components/features/home/celeb-card-drafts/CelebDetailModal";
import { getCelebForModal } from "@/actions/celebs/getCelebForModal";
import { DecorativeLabel } from "@/components/ui";
import type { CelebProfile } from "@/types/home";

interface Celeb {
  id: string
  nickname: string
  avatar_url?: string | null;
  title?: string | null;
  count?: number; // 영향력 수치 등 (선택)
}

interface Props {
  celebs: Celeb[];
  title?: string;
  subtitle?: string;
  type?: "modern" | "classic"; // modern: 카드형 (기본), classic: 원형 (시대 섹션용)
  centered?: boolean; // 중앙 배치 + 컨텐츠 크기에 맞춤
}

// 카드 너비 스타일
const cardWidthStyles = {
  default: "w-[120px] sm:w-auto",
  centered: "w-[100px] sm:w-[120px]",
};

export default function RepresentativeCelebs({ celebs, title, subtitle, type = "modern", centered = false }: Props) {
  const [selectedCeleb, setSelectedCeleb] = useState<CelebProfile | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handleCelebClick = async (celebId: string) => {
    if (loadingId) return;
    setLoadingId(celebId);
    try {
      const data = await getCelebForModal(celebId);
      if (data) {
        setSelectedCeleb(data);
        setIsModalOpen(true);
      }
    } catch (error) {
      console.error("Failed to fetch celeb details:", error);
    } finally {
      setLoadingId(null);
    }
  };

  if (!celebs || celebs.length === 0) return null;

  return (
    <div className={centered ? "" : "w-full"}>
      {title && (
        <div className={`mb-4 ${centered ? "flex justify-center" : ""}`}>
          <DecorativeLabel label={title} />
        </div>
      )}

      {type === "modern" ? (
        <>
          {/* centered: 원형 아바타 3명 (모바일/PC 통일) */}
          {centered ? (
            <div className="flex justify-center gap-8 sm:gap-12">
              {celebs.slice(0, 3).map((celeb) => (
                <button
                  key={celeb.id}
                  onClick={() => handleCelebClick(celeb.id)}
                  disabled={loadingId === celeb.id}
                  className="group/celeb flex flex-col items-center gap-3"
                >
                  <div className={`
                    relative shrink-0 w-24 h-24 rounded-full border-2 border-white/10 p-0.5
                    group-hover/celeb:border-accent bg-neutral-900 shadow-lg
                    ${loadingId === celeb.id ? "animate-pulse border-accent/50" : ""}
                  `}>
                    <div className="relative w-full h-full rounded-full overflow-hidden">
                      {celeb.avatar_url ? (
                        <Image src={celeb.avatar_url} alt={celeb.nickname} fill className="object-cover" sizes="96px" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-bg-secondary">
                          <User size={32} className="text-text-tertiary" />
                        </div>
                      )}
                    </div>
                    {(celeb.count !== undefined && celeb.count > 0) && (
                      <div className="absolute -top-1 -right-1 z-20 min-w-[28px] h-7 px-1.5 bg-accent text-black rounded-full flex items-center justify-center text-xs font-bold">
                        {celeb.count}
                      </div>
                    )}
                    {loadingId === celeb.id && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm rounded-full">
                        <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      </div>
                    )}
                  </div>
                  <span className="text-sm font-medium text-text-secondary group-hover/celeb:text-white text-center leading-tight line-clamp-2">
                    {celeb.nickname}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            /* 카드형 (centered가 아닐 때) */
            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hidden snap-x snap-mandatory sm:grid sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 sm:pb-0 sm:overflow-visible">
              {celebs.map((celeb) => (
                <CelebCard
                  key={celeb.id}
                  id={celeb.id}
                  nickname={celeb.nickname}
                  avatar_url={celeb.avatar_url}
                  title={celeb.title}
                  count={celeb.count}
                  className={`snap-start shrink-0 ${cardWidthStyles.default}`}
                />
              ))}
            </div>
          )}
        </>
      ) : (
        // Classic: 원형 메달리온 수평 배치 (Era 섹션용 - 썸네일+뱃지)
        <div className="flex justify-start gap-2">
          {celebs.map((celeb) => (
            <button
              key={celeb.id}
              onClick={() => handleCelebClick(celeb.id)}
              disabled={loadingId === celeb.id}
              className="group/celeb"
            >
              <div className={`
                relative shrink-0 w-14 h-14 sm:w-16 sm:h-16 rounded-full border-2 border-white/10 p-0.5
                group-hover/celeb:border-accent group-hover/celeb:scale-105 transition-all bg-neutral-900 shadow-xl
                ${loadingId === celeb.id ? "animate-pulse border-accent/50" : ""}
              `}>
                <div className="relative w-full h-full rounded-full overflow-hidden">
                   {celeb.avatar_url ? (
                    <Image
                      src={celeb.avatar_url}
                      alt={celeb.nickname}
                      fill
                      className="object-cover"
                      sizes="64px"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-bg-secondary">
                      <User size={20} className="text-text-tertiary" />
                    </div>
                  )}
                </div>

                {/* 숫자 뱃지 */}
                {(celeb.count !== undefined && celeb.count > 0) && (
                  <div className="absolute -top-1 -right-1 z-20 min-w-[18px] h-[18px] px-1 bg-accent text-black rounded-full flex items-center justify-center border border-black/20 shadow-lg text-[10px] font-bold">
                    {celeb.count}
                  </div>
                )}

                {loadingId === celeb.id && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm rounded-full">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {selectedCeleb && (
        <CelebDetailModal
          celeb={selectedCeleb}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </div>
  );
}
