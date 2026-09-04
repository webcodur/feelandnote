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
  appearances: Array<{ traditionId: string; summary: string | null; quote: string | null }>;
  avatarUrl: string | null;
  imageUrl: string | null;
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
