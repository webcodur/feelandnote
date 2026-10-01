import { Brain, Clock, Crosshair, Crown, Footprints, ScanFace, Shield, Swords } from "lucide-react";

export const REST_GROUP_ID = "rest";

/** 쉼터 목차·카드·직접 진입이 함께 사용하는 게임 공개 설정. */
export const REST_GAMES = [
  { valueKey: "troy", href: "/rest#troy", label: "TROY", icon: Shield, image: "/images/games/troy-card.webp", dev: true },
  { valueKey: "dawn", href: "/rest#dawn", label: "DAWN", icon: Clock, image: "/images/games/dawn-card.webp", dev: false },
  { valueKey: "labyrinth", href: "/rest#labyrinth", label: "LABYRINTH", icon: Crosshair, image: "/images/games/labyrinth-card.webp", dev: false },
  { valueKey: "hegemony", href: "/rest#hegemony", label: "HEGEMONY", icon: Swords, image: "/images/games/hegemony-card.webp", dev: false },
  { valueKey: "suikoden", href: "/rest#suikoden", label: "CHEONDO", icon: Crown, image: "/images/games/suikoden-card.webp", dev: true },
  { valueKey: "wander", href: "/rest#wander", label: "WANDER", icon: Footprints, image: "/images/games/wander-card.webp", dev: true },
  { valueKey: "memory", href: "/rest#memory", label: "MEMORY", icon: Brain, image: "/images/games/memory-card.webp", dev: false },
  { valueKey: "portrait", href: "/rest#portrait", label: "PORTRAITS IN TIME", icon: ScanFace, image: "/images/games/memory-card.webp", dev: true },
] as const;

export type GameId = (typeof REST_GAMES)[number]["valueKey"];
