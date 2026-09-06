import type { FactionQuoteMedia } from "@feelandnote/shared/lib/faction-quote-media";

export interface MythTradition {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  isPublished: boolean;
  regionId: string;
  images: Array<{ url: string; label: string | null }>;
  personIds: string[];
}

export interface MythRegion {
  id: string;
  name: string;
  traditionIds: string[];
}

export interface MythPerson {
  id: string;
  slug: string;
  name: string;
  title: string | null;
  headline: string | null;
  bio: string | null;
  reading: { guide: string } | null;
  summary: string | null;
  /* 대사는 전승마다 다르다. quoteMedia는 출간된 음성·화보 전환 묶음이며 없으면 손으로 넘긴다 */
  appearances: Array<{
    traditionId: string;
    summary: string | null;
    quote: string | null;
    quoteMedia: FactionQuoteMedia | null;
  }>;
  avatarUrl: string | null;
  imageUrl: string | null;
  portraitUrl: string | null;
  images: Array<{ url: string; focus?: { x: number; y: number } }>;
  traditionIds: string[];
  sourceIds: string[];
}

export interface MythWork {
  id: string;
  title: string;
  creator: string | null;
  thumbnailUrl: string | null;
  category: "book" | "video" | "game" | "music";
  coupangUrl: string | null;
  personIds: string[];
}

export interface MythAtlasData {
  regions: MythRegion[];
  traditions: MythTradition[];
  people: MythPerson[];
  works: MythWork[];
  openingPersonId: string | null;
}
