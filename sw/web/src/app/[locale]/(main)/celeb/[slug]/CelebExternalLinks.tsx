"use client";

import { useCallback, useState } from "react";
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
  Link2,
  Linkedin,
  type LucideIcon,
  Youtube,
} from "lucide-react";

import Modal, { ModalBody } from "@/components/ui/Modal";
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
  const [isOpen, setIsOpen] = useState(false);
  const closeModal = useCallback(() => setIsOpen(false), []);

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
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-label={copy.aria}
        title={copy.title}
        className="inline-flex h-8 w-8 flex-none items-center justify-center rounded-md border border-white/12 bg-transparent p-0 text-text-secondary hover:border-accent/50 hover:bg-white/[0.04] hover:text-accent active:bg-white/[0.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
      >
        <Link2 aria-hidden="true" className="h-4 w-4" />
      </button>

      <Modal
        isOpen={isOpen}
        onClose={closeModal}
        title={copy.title}
        icon={Link2}
        size="sm"
      >
        <ModalBody className="space-y-5 p-4 sm:p-5">
          {groups.map((group) => (
            <section key={group.key} aria-labelledby={`external-links-${group.key}`}>
              <h3
                id={`external-links-${group.key}`}
                className="text-sm font-semibold text-text-primary"
              >
                {group.label}
              </h3>
              <div className="mt-2 grid gap-2">
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
                      onClick={closeModal}
                      className="group flex min-h-11 w-full min-w-0 items-center gap-3 rounded-md border border-white/10 bg-white/[0.025] px-3 py-2.5 text-start text-sm text-text-secondary hover:border-accent/45 hover:bg-white/[0.06] hover:text-accent active:bg-white/[0.09] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
                    >
                      <Icon aria-hidden="true" className="h-4 w-4 flex-none" />
                      <span className="min-w-0 flex-1">
                        <span className="block font-semibold">{label}</span>
                        {link.handle ? (
                          <span className="mt-0.5 block truncate text-xs font-normal text-text-tertiary group-hover:text-text-secondary">
                            {link.handle}
                          </span>
                        ) : null}
                      </span>
                      <ExternalLink
                        aria-hidden="true"
                        className="h-3.5 w-3.5 flex-none"
                      />
                    </a>
                  );
                })}
              </div>
            </section>
          ))}
        </ModalBody>
      </Modal>
    </>
  );
}
