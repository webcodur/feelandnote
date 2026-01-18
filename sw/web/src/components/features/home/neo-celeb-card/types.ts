import { CelebProfile } from "@/types/home";

export type CardVariant = "diamond" | "gold" | "silver" | "bronze" | "iron" | "black-gold" | "rose-gold" | "crimson" | "amethyst" | "holographic";
export type CardSize = "default" | "compact" | "small";

export interface NeoCelebCardProps {
  celeb: CelebProfile;
  variant: CardVariant;
  className?: string;
  onFollowClick?: (e: React.MouseEvent) => void;
  scale?: number;
  size?: CardSize;
}
