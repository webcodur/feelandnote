import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";

import CelebExternalLinks from "@/app/[locale]/(main)/celeb/[slug]/CelebExternalLinks";
import type { CelebExternalLink } from "@/types/celebExternalLinks";
import type { CelebExternalLinkCopy } from "@/app/[locale]/(main)/celeb/[slug]/CelebExternalLinks";

const links: CelebExternalLink[] = [
  {
    platform: "website",
    group: "channel",
    url: "https://www.gatesnotes.com/",
    handle: null,
  },
  {
    platform: "wikipedia",
    group: "reference",
    url: "https://ko.wikipedia.org/wiki/%EB%B9%8C_%EA%B2%8C%EC%9D%B4%EC%B8%A0",
    handle: null,
  },
];

const copy: CelebExternalLinkCopy = {
  title: ["external", "links"].join(" "),
  channels: "channels",
  references: "references",
  aria: "external links for test person",
  platformLabels: {
    website: "website",
    instagram: "Instagram",
    youtube: "YouTube",
    x: "X",
    linkedin: "LinkedIn",
    facebook: "Facebook",
    tiktok: "TikTok",
    github: "GitHub",
    bluesky: "Bluesky",
    wikipedia: "wikipedia",
    britannica: "britannica",
    stanford: "stanford encyclopedia",
    imdb: "IMDb",
    loc: "library of congress",
    viaf: "VIAF",
    wikidata: "wikidata",
  },
  openLabels: {
    website: "open website",
    instagram: "",
    youtube: "",
    x: "",
    linkedin: "",
    facebook: "",
    tiktok: "",
    github: "",
    bluesky: "",
    wikipedia: "open wikipedia",
    britannica: "",
    stanford: "",
    imdb: "",
    loc: "",
    viaf: "",
    wikidata: "",
  },
};

test("renders without an intl provider", () => {
  assert.doesNotThrow(() => {
    renderToStaticMarkup(<CelebExternalLinks links={links} copy={copy} />);
  });
});
