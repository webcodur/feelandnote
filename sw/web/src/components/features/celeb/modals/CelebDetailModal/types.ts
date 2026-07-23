import type { CelebProfile } from "@/types/home";
import type { Aura } from "@/constants/materials";

export const AURA_GRADIENTS: Record<Aura, string> = {
  1: "from-[#8d6e63] via-[#5d4037] to-[#3e2723]",         // wood (필멸자)
  2: "from-[#607d8b] via-[#455a64] to-[#263238]",         // stone (순례자)
  3: "from-[#D4C1A5] via-[#8C7853] to-[#5D4037]",         // bronze (수사)
  4: "from-[#FFFFFF] via-[#C0C0C0] to-[#808080]",         // silver (전도사)
  5: "from-[#FCF6BA] via-[#D4AF37] to-[#8A6E2F]",         // gold (사제)
  6: "from-[#98FB98] via-[#50C878] to-[#2E8B57]",         // emerald (신관)
  7: "from-[#FF6B6B] via-[#DC143C] to-[#8B0000]",         // crimson (선지자)
  8: "from-[#E0FFFF] via-[#B0E0E6] to-[#87CEEB]",         // diamond (사도)
  9: "from-[#FF00FF] via-[#00FFFF] to-[#FFFF00]",         // holographic (불멸자)
};

export interface CelebDetailModalProps {
  celeb: CelebProfile;
  isOpen: boolean;
  onClose: () => void;
  context?: {
    label: string;
    description?: string | null;
    color?: string;
  };
  hideBirthDate?: boolean;
  hideQuotes?: boolean;
  // 리스트 컨텍스트 네비게이션 (선택)
  onNavigate?: (direction: "prev" | "next") => void;
  hasPrev?: boolean;
  hasNext?: boolean;
  /** 커스텀 z-index (게임 전체화면 등 Z_INDEX.top 위에 표시할 때) */
  zIndex?: number;
}
