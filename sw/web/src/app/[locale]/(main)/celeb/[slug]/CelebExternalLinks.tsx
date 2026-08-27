import {
  AtSign,
  BookOpenText,
  Clapperboard,
  Database,
  ExternalLink,
  Facebook,
  Github,
  Globe2,
  Instagram,
  Landmark,
  LibraryBig,
  Linkedin,
  type LucideIcon,
  Youtube,
} from "lucide-react";

import type {
  CelebExternalLink,
  CelebExternalLinkPlatform,
} from "@/types/celebExternalLinks";

interface Props {
  links: CelebExternalLink[];
  copy: CelebExternalLinkCopy;
}

export interface CelebExternalLinkCopy {
  title: string;
  channels: string;
  references: string;
  aria: string;
  platformLabels: { [key in CelebExternalLinkPlatform]: string };
  openLabels: { [key in CelebExternalLinkPlatform]: string };
}

const PLATFORM_ICONS: { [key in CelebExternalLinkPlatform]: LucideIcon } = {
  website: Globe2,
  instagram: Instagram,
  youtube: Youtube,
  x: AtSign,
  linkedin: Linkedin,
  facebook: Facebook,
  tiktok: AtSign,
  github: Github,
  bluesky: AtSign,
  wikipedia: BookOpenText,
  britannica: LibraryBig,
  stanford: Landmark,
  imdb: Clapperboard,
  loc: Landmark,
  viaf: LibraryBig,
  wikidata: Database,
};

export default function CelebExternalLinks({ links, copy }: Props) {
  if (links.length === 0) return null;

  const groups = [
    {
      key: "channel" as const,
      label: copy.channels,
      links: links.filter((link) => link.group === "channel"),
    },
    {
      key: "reference" as const,
      label: copy.references,
      links: links.filter((link) => link.group === "reference"),
    },
  ].filter((group) => group.links.length > 0);

  return (
    <section
      aria-label={copy.aria}
      className="mt-6 border-t border-accent-dim/30 pt-5 text-start"
    >
      <h2 className="text-sm font-bold text-text-primary">
        {copy.title}
      </h2>
      <div className="mt-3 grid gap-4 md:grid-cols-2">
        {groups.map((group) => (
          <div key={group.key} className="min-w-0">
            <p className="text-sm font-medium text-text-secondary">
              {group.label}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {group.links.map((link) => {
                const Icon = PLATFORM_ICONS[link.platform];
                const label = copy.platformLabels[link.platform];
                return (
                  <a
                    key={link.platform}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={copy.openLabels[link.platform]}
                    aria-label={copy.openLabels[link.platform]}
                    className="group inline-flex min-w-0 max-w-full items-center gap-2 rounded-md border border-stone-light/40 bg-bg-secondary/45 px-3 py-2 text-sm font-semibold text-text-secondary hover:border-accent hover:bg-white/5 hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                  >
                    <Icon aria-hidden="true" className="h-4 w-4 flex-none" />
                    <span className="truncate">{label}</span>
                    {link.handle && (
                      <span className="max-w-32 truncate font-normal text-text-tertiary group-hover:text-text-secondary">
                        {link.handle}
                      </span>
                    )}
                    <ExternalLink aria-hidden="true" className="h-3.5 w-3.5 flex-none" />
                  </a>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
