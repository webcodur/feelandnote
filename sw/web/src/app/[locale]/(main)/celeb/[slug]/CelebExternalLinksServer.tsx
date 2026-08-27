import { getTranslations } from "next-intl/server";

import type {
  CelebExternalLink,
  CelebExternalLinkPlatform,
} from "@/types/celebExternalLinks";
import CelebExternalLinks, {
  type CelebExternalLinkCopy,
} from "./CelebExternalLinks";

interface Props {
  links: CelebExternalLink[];
  name: string;
}

export default async function CelebExternalLinksServer({ links, name }: Props) {
  if (links.length === 0) return null;
  const t = await getTranslations("celebPage");
  const platformLabels: { [key in CelebExternalLinkPlatform]: string } = {
    website: t("externalPlatformWebsite"),
    instagram: t("externalPlatformInstagram"),
    youtube: t("externalPlatformYoutube"),
    x: t("externalPlatformX"),
    linkedin: t("externalPlatformLinkedin"),
    facebook: t("externalPlatformFacebook"),
    tiktok: t("externalPlatformTiktok"),
    github: t("externalPlatformGithub"),
    bluesky: t("externalPlatformBluesky"),
    wikipedia: t("externalPlatformWikipedia"),
    britannica: t("externalPlatformBritannica"),
    stanford: t("externalPlatformStanford"),
    imdb: t("externalPlatformImdb"),
    loc: t("externalPlatformLoc"),
    viaf: t("externalPlatformViaf"),
    wikidata: t("externalPlatformWikidata"),
  };
  const openLabels = Object.fromEntries(
    Object.entries(platformLabels).map(([platform, label]) => [
      platform,
      t("externalLinkOpen", { name, platform: label }),
    ]),
  ) as CelebExternalLinkCopy["openLabels"];
  const copy: CelebExternalLinkCopy = {
    title: t("externalLinksTitle"),
    channels: t("externalLinksChannels"),
    references: t("externalLinksReferences"),
    aria: t("externalLinksAria", { name }),
    platformLabels,
    openLabels,
  };

  return <CelebExternalLinks links={links} copy={copy} />;
}
