"use client";

import { useRef, useState } from "react";
import { ChevronDown, ChevronsUp } from "lucide-react";
import { useTranslations } from "next-intl";
import type { MythPerson } from "@/actions/home/mythTypes";
import type { CelebCardImage } from "@/components/shared/CelebCard";
import MythPersonPicker, { ATLAS_MEMBER_COLLAPSED_COUNT } from "../MythPersonPicker";
import AtlasMemberDescriptionCard from "./AtlasMemberDescriptionCard";
import { MYTH_LAYOUT as layout } from "../mythLayout";

interface Props {
  people: MythPerson[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  name: string;
  mythId: string;
  listKey: string;
  showDescription: boolean;
  imageMode: CelebCardImage;
}

export default function AtlasMemberList({ showDescription, imageMode, listKey, ...props }: Props) {
  if (!showDescription) return <MythPersonPicker key={listKey} {...props} imageMode={imageMode} />;
  return (
    <div className={layout.container} data-member-description-view>
      <DescriptionList key={listKey} {...props} imageMode={imageMode} />
    </div>
  );
}

function DescriptionList({ people, selectedId, onSelect, name, mythId, imageMode }: Omit<Props, "showDescription" | "listKey">) {
  const t = useTranslations("explore.hub.myth");
  const [expanded, setExpanded] = useState(false);
  const sectionRef = useRef<HTMLElement | null>(null);
  const visible = expanded ? people : people.slice(0, ATLAS_MEMBER_COLLAPSED_COUNT);
  return (
    <section ref={sectionRef} aria-label={name} className="scroll-mt-24">
      <div className={layout.descriptionList}>
        {visible.map(person => (
          <AtlasMemberDescriptionCard key={person.id} person={person} mythId={mythId} imageMode={imageMode}
            selected={selectedId === person.id} onSelect={onSelect}
            description={person.appearances.find(appearance => appearance.mythId === mythId)?.summary?.trim() ?? ""} />
        ))}
      </div>
      {people.length > ATLAS_MEMBER_COLLAPSED_COUNT && (
        <button type="button" aria-expanded={expanded} onClick={() => {
          if (expanded) sectionRef.current?.scrollIntoView({ block: "start" });
          setExpanded(value => !value);
        }} className="mt-6 flex min-h-11 w-full items-center justify-center gap-1.5 rounded-xl border border-white/15 bg-bg-card text-sm font-semibold text-text-secondary outline-none hover:border-accent hover:text-accent focus-visible:ring-2 focus-visible:ring-accent md:mt-7">
          {expanded ? <><ChevronsUp size={16} aria-hidden />{t("collapseMembers")}</> : <><ChevronDown size={16} aria-hidden />{t("expandMembers", { count: people.length })}</>}
        </button>
      )}
    </section>
  );
}
