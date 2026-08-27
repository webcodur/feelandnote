export type CelebExternalLinkGroup = "channel" | "reference";

export type CelebExternalLinkPlatform =
  | "website"
  | "instagram"
  | "youtube"
  | "x"
  | "linkedin"
  | "facebook"
  | "tiktok"
  | "github"
  | "bluesky"
  | "wikipedia"
  | "britannica"
  | "stanford"
  | "imdb"
  | "loc"
  | "viaf"
  | "wikidata";

export interface CelebExternalLink {
  platform: CelebExternalLinkPlatform;
  group: CelebExternalLinkGroup;
  url: string;
  handle: string | null;
}
