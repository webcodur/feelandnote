"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { MythPerson, Myth } from "@/actions/home/mythTypes";
import { FormattedText, splitReadableParagraphs } from "@/components/ui";
import VirtualMonologueModal from "@/components/shared/VirtualMonologueModal";
import { useCelebVirtualMonologue } from "@/hooks/useCelebVirtualMonologue";
import FactionPersonHeader from "@/components/features/faction/entry/FactionPersonHeader";
import FactionPersonBooks from "@/components/features/faction/entry/FactionPersonBooks";
import { FACTION_PERSON_LAYOUT as layout } from "@/components/features/faction/entry/factionPersonLayout";
import Modal from "@/components/ui/Modal";
import { mythLeadImage } from "./mythLeadImage";

interface Props {
  person: MythPerson;
  myth: Myth;
  onClose: () => void;
}

export default function MythPersonDetail({ person, myth, onClose }: Props) {
  const t = useTranslations("explore.hub.myth");
  const monologue = useCelebVirtualMonologue(person.id);
  const [monologueOpen, setMonologueOpen] = useState(false);
  const appearance = person.appearances.find((item) => item.mythId === myth.id)?.summary ?? null;
  const lead = person.headline;
  const body = person.reading?.guide?.trim() || person.bio?.trim();
  const paragraphs = splitReadableParagraphs(body ?? "");
  const group = myth.groups.find((item) => item.personIds.includes(person.id));

  return (
    <Modal isOpen onClose={onClose} ariaLabel={person.name} size="full" animateHeight={false} frame="plain" boxClassName={layout.modal}>
      <article className={layout.article}>
        <FactionPersonHeader nested person={person} factionName={myth.name} group={group?.name}
          portraitUrl={mythLeadImage(person, myth.id)} onMonologue={monologue ? () => setMonologueOpen(true) : undefined}>
          {lead && <p className={layout.lead}>{lead}</p>}
          {appearance && appearance !== lead && appearance !== body && (
            <p className="text-sm leading-6 text-text-secondary" aria-label={t("appearanceInMyth", { name: myth.name })}>{appearance}</p>
          )}
          <div className={layout.paragraphs}>
            {paragraphs.length > 0
              ? paragraphs.map((paragraph, index) => <p key={index}><FormattedText text={paragraph} /></p>)
              : <p className="text-text-tertiary">{t("noBio")}</p>}
          </div>
        </FactionPersonHeader>
        <FactionPersonBooks celebId={person.id} />
      </article>
      {monologueOpen && monologue && <VirtualMonologueModal nested text={monologue} onClose={() => setMonologueOpen(false)} />}
    </Modal>
  );
}
