import type {
  CelebExternalLink,
  CelebExternalLinkPlatform,
} from "@/types/celebExternalLinks";

export interface PropertyLinkDefinition {
  property: string;
  platform: CelebExternalLinkPlatform;
  group: CelebExternalLink["group"];
  toUrl: (value: string) => string | null;
  showHandle: boolean;
}

const safeHttpUrl = (value: string): string | null => {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:"
      ? url.toString()
      : null;
  } catch {
    return null;
  }
};

const socialUrl = (base: string, value: string): string | null => {
  const handle = value.trim().replace(/^@/, "");
  return handle ? `${base}${encodeURIComponent(handle)}` : null;
};

const imdbUrl = (value: string): string | null => {
  const id = value.trim();
  if (/^nm\d+$/.test(id)) return `https://www.imdb.com/name/${id}/`;
  if (/^tt\d+$/.test(id)) return `https://www.imdb.com/title/${id}/`;
  return null;
};

const locUrl = (value: string): string | null => {
  const id = value.trim();
  if (!/^[a-z]{1,3}\d[\w-]*$/i.test(id)) return null;
  const authorityKind = id.toLowerCase().startsWith("sh")
    ? "subjects"
    : "names";
  return `https://id.loc.gov/authorities/${authorityKind}/${encodeURIComponent(id)}.html`;
};

export const PROPERTY_LINKS: readonly PropertyLinkDefinition[] = [
  { property: "P856", platform: "website", group: "channel", toUrl: safeHttpUrl, showHandle: false },
  {
    property: "P2003", platform: "instagram", group: "channel", showHandle: true,
    toUrl: (value) => socialUrl("https://www.instagram.com/", value)?.concat("/") ?? null,
  },
  {
    property: "P2397", platform: "youtube", group: "channel", showHandle: false,
    toUrl: (value) => socialUrl("https://www.youtube.com/channel/", value),
  },
  {
    property: "P2002", platform: "x", group: "channel", showHandle: true,
    toUrl: (value) => socialUrl("https://x.com/", value),
  },
  {
    property: "P6634", platform: "linkedin", group: "channel", showHandle: false,
    toUrl: (value) => socialUrl("https://www.linkedin.com/in/", value)?.concat("/") ?? null,
  },
  {
    property: "P2013", platform: "facebook", group: "channel", showHandle: false,
    toUrl: (value) => socialUrl("https://www.facebook.com/", value),
  },
  {
    property: "P7085", platform: "tiktok", group: "channel", showHandle: true,
    toUrl: (value) => socialUrl("https://www.tiktok.com/@", value),
  },
  {
    property: "P2037", platform: "github", group: "channel", showHandle: true,
    toUrl: (value) => socialUrl("https://github.com/", value),
  },
  {
    property: "P12361", platform: "bluesky", group: "channel", showHandle: true,
    toUrl: (value) => socialUrl("https://bsky.app/profile/", value),
  },
  {
    property: "P1417", platform: "britannica", group: "reference", showHandle: false,
    toUrl: (value) => `https://www.britannica.com/${value.trim().split("/").map(encodeURIComponent).join("/")}`,
  },
  {
    property: "P3123", platform: "stanford", group: "reference", showHandle: false,
    toUrl: (value) => `https://plato.stanford.edu/entries/${encodeURIComponent(value.trim())}/`,
  },
  { property: "P345", platform: "imdb", group: "reference", toUrl: imdbUrl, showHandle: false },
  { property: "P244", platform: "loc", group: "reference", toUrl: locUrl, showHandle: false },
  {
    property: "P214", platform: "viaf", group: "reference", showHandle: false,
    toUrl: (value) => /^\d+$/.test(value.trim())
      ? `https://viaf.org/en/viaf/${value.trim()}`
      : null,
  },
];
