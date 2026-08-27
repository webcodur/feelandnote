import type { CelebExternalLink } from "@/types/celebExternalLinks";
import { PROPERTY_LINKS } from "./externalLinkProperties";

interface WikidataStringValue {
  value?: string;
}

interface WikidataClaim {
  rank?: "preferred" | "normal" | "deprecated";
  mainsnak?: {
    datavalue?: WikidataStringValue;
  };
}

interface WikidataClaims {
  [property: string]: WikidataClaim[] | undefined;
}

interface WikidataSitelink {
  title?: string;
}

interface WikidataSitelinks {
  [site: string]: WikidataSitelink | undefined;
}

export interface WikidataExternalLinkEntity {
  claims?: WikidataClaims;
  sitelinks?: WikidataSitelinks;
}

function firstClaimValue(
  entity: WikidataExternalLinkEntity,
  property: string,
): string | null {
  const claims = entity.claims?.[property] ?? [];
  const preferred = claims.filter((claim) => claim.rank === "preferred");
  const candidates = preferred.length > 0 ? preferred : claims;
  for (const claim of candidates) {
    if (claim.rank === "deprecated") continue;
    const value = claim.mainsnak?.datavalue?.value;
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function wikipediaLink(
  entity: WikidataExternalLinkEntity,
  locale: string,
): CelebExternalLink | null {
  const preferredSite = locale === "en" ? "enwiki" : "kowiki";
  const fallbackSite = preferredSite === "enwiki" ? "kowiki" : "enwiki";
  const site = entity.sitelinks?.[preferredSite]?.title
    ? preferredSite
    : fallbackSite;
  const title = entity.sitelinks?.[site]?.title?.trim();
  if (!title) return null;
  const language = site === "kowiki" ? "ko" : "en";
  return {
    platform: "wikipedia",
    group: "reference",
    url: `https://${language}.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, "_"))}`,
    handle: null,
  };
}

export function buildCelebExternalLinks(
  entity: WikidataExternalLinkEntity,
  qid: string,
  locale: string,
): CelebExternalLink[] {
  const links: CelebExternalLink[] = [];
  const seenUrls = new Set<string>();

  const add = (link: CelebExternalLink | null) => {
    if (!link || seenUrls.has(link.url)) return;
    seenUrls.add(link.url);
    links.push(link);
  };

  for (const definition of PROPERTY_LINKS) {
    const value = firstClaimValue(entity, definition.property);
    if (!value) continue;
    const url = definition.toUrl(value);
    add(url ? {
      platform: definition.platform,
      group: definition.group,
      url,
      handle: definition.showHandle ? `@${value.replace(/^@/, "")}` : null,
    } : null);
  }

  add(wikipediaLink(entity, locale));
  add(wikidataLink(qid));
  return links;
}

export function wikidataLink(qid: string): CelebExternalLink | null {
  if (!/^Q\d+$/.test(qid)) return null;
  return {
    platform: "wikidata",
    group: "reference",
    url: `https://www.wikidata.org/wiki/${qid}`,
    handle: null,
  };
}
