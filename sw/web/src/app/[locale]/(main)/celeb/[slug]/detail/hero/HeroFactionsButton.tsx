"use client";

import { useCallback, useState } from "react";
import { ArrowUpRight, Network } from "lucide-react";
import { useTranslations } from "next-intl";
import type { FactionItem } from "@/actions/user/getCelebBySlug";
import { mythHref } from "@/components/features/user/explore/myth/mythHref";
import Modal, { ModalBody } from "@/components/ui/Modal";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/types/locale";

interface Props {
  factions: FactionItem[];
  locale: Locale;
}

export default function HeroFactionsButton({ factions, locale }: Props) {
  const t = useTranslations("explore.faction");
  const [isOpen, setIsOpen] = useState(false);
  const close = useCallback(() => setIsOpen(false), []);
  const memberships = factions.filter((faction) => faction.slug && faction.isPublished);
  if (!memberships.length) return null;

  return (
    <>
      <button
        type="button"
        aria-label={t("memberOf")}
        title={t("memberOf")}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        onClick={() => setIsOpen(true)}
        className="inline-flex size-11 shrink-0 items-center justify-center rounded-md border border-white/12 bg-transparent text-text-secondary outline-none hover:border-accent/50 hover:bg-white/[0.04] hover:text-accent active:bg-white/[0.07] focus-visible:ring-2 focus-visible:ring-accent/60"
      >
        <Network size={18} aria-hidden="true" />
      </button>
      <Modal isOpen={isOpen} onClose={close} title={t("memberOf")} icon={Network} size="sm">
        <ModalBody>
          <ul className="grid gap-2">
            {memberships.map((faction) => {
              const name = locale === "en" ? faction.name_en?.trim() || faction.name : faction.name;
              const headline = (locale === "en" ? faction.headline_en : faction.headline)?.trim();
              return (
                <li key={faction.id}>
                  <Link
                    href={faction.isMyth ? mythHref(faction.slug) : `/explore/faction/${faction.slug}`}
                    onClick={close}
                    className="flex min-h-11 items-center gap-3 rounded-md border border-white/12 px-3 py-3 text-text-secondary outline-none hover:border-accent/50 hover:bg-white/[0.04] hover:text-accent active:bg-white/[0.07] focus-visible:ring-2 focus-visible:ring-accent/60"
                  >
                    <span className="min-w-0 flex-1 text-start">
                      <span className="block text-sm font-semibold [overflow-wrap:anywhere]">{name}</span>
                      {headline && <span className="mt-1 block text-xs leading-relaxed text-text-tertiary">{headline}</span>}
                    </span>
                    <ArrowUpRight size={16} className="shrink-0" aria-hidden="true" />
                  </Link>
                </li>
              );
            })}
          </ul>
        </ModalBody>
      </Modal>
    </>
  );
}
