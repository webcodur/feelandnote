import type { FeaturedCeleb, FeaturedTag } from "@/actions/home";
import type { Locale } from "@/types/locale";

export type FactionDisplayMode = "atlas" | "registry";

export interface CollectionTheme {
  tag: FeaturedTag;
  index: number;
  name: string;
  description: string | null;
  coverImage: string | null;
  people: FeaturedCeleb[];
}

export interface CollectionSection {
  tag: FeaturedTag;
  name: string;
  description: string | null;
  color: string;
  themes: CollectionTheme[];
  people: FeaturedCeleb[];
  coverImages: string[];
  totalCelebs: number;
}

export interface FactionCollectionData {
  real: CollectionSection[];
  fiction: CollectionSection[];
  heroThemes: CollectionTheme[];
  totalThemes: number;
  totalCelebs: number;
}

export interface CollectionViewProps {
  data: FactionCollectionData;
  locale: Locale;
  sectionIndex: number;
  onSectionChange: (index: number) => void;
}
