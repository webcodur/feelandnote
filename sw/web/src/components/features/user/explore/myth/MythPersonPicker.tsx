"use client";

import CelebAvatarImage from "@/components/ui/CelebAvatarImage";
import BlurDissolve from "@/components/ui/BlurDissolve";
import ContentTextModal from "@/components/ui/ContentTextModal";
import CelebRealityLabel from "@/components/shared/CelebRealityLabel";
import { useCallback, useState } from "react";
import { ChevronRight, Check } from "lucide-react";
import { useTranslations } from "next-intl";
import type { MythPerson } from "@/actions/home/mythTypes";
import { MYTH_LAYOUT as mythLayout } from "./mythLayout";

interface Props {
  people: MythPerson[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  name: string;
  groupDescription?: string | null;
}

// 카드 수식어는 인물의 정식 title만 두 줄까지 쓴다. 팩션 등장 설명·bio는 상세에서 읽는다.
export default function MythPersonPicker({ people, selectedId, onSelect, name, groupDescription }: Props) {
  const t = useTranslations("explore.hub.myth");
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  return (
    <section aria-label={t("memberList")}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h3 className="text-lg font-bold text-text-primary md:text-xl">{name}</h3>
          <span className="text-sm font-medium text-text-secondary">{t("groupMemberCount", { count: people.length })}</span>
        </div>
        {groupDescription && (
          <button type="button" onClick={() => setOpen(true)} aria-haspopup="dialog" aria-expanded={open} className="flex min-h-10 items-center gap-1 rounded-lg px-2 text-sm font-semibold text-text-secondary outline-none hover:bg-white/5 hover:text-accent focus-visible:ring-2 focus-visible:ring-accent">
            {t("groupOverview")}<ChevronRight size={15} aria-hidden />
          </button>
        )}
      </div>
      <div role="group" aria-label={t("memberList")} className={mythLayout.memberList}>
      {people.map((person) => {
        const selected = selectedId === person.id;
        const thumbUrl = person.avatarUrl ?? person.portraitUrl ?? person.imageUrl;
        const title = person.title?.trim();
        return (
          <button
            key={person.id}
            type="button"
            data-person-id={person.id}
            aria-label={person.name}
            aria-describedby={person.reality && person.reality !== "REAL" ? `person-reality-${person.id}` : undefined}
            aria-haspopup="dialog"
            aria-pressed={selected}
            onClick={() => onSelect(person.id)}
            className="group flex min-w-0 scroll-mt-24 flex-col rounded-xl text-center outline-none"
          >
            <span className={`relative aspect-square w-full overflow-hidden rounded-xl border bg-bg-card group-focus-visible:ring-2 group-focus-visible:ring-accent group-focus-visible:ring-offset-2 group-focus-visible:ring-offset-bg-secondary ${selected ? "border-accent" : "border-white/10 group-hover:border-accent"}`}>
              {thumbUrl ? (
                <BlurDissolve key={thumbUrl} className="absolute inset-0"><CelebAvatarImage src={thumbUrl} alt="" draggable={false} className="object-cover transition-transform duration-500 group-hover:scale-105" style={{ filter: "none" }} /></BlurDissolve>
              ) : (
                <span aria-hidden className="flex h-full items-center justify-center text-2xl font-black text-accent">{person.name.slice(0, 1)}</span>
              )}
              {selected && <span className="absolute end-2 top-2 grid size-6 place-items-center rounded-full bg-accent text-bg-main"><Check size={15} aria-hidden /></span>}
              {person.reality && person.reality !== "REAL" && <span className="absolute bottom-2 start-2"><CelebRealityLabel id={`person-reality-${person.id}`} reality={person.reality} /></span>}
            </span>
            <span className="mt-2.5 block w-full min-w-0 px-0.5">
              <span className={`block break-keep text-sm font-bold leading-5 [overflow-wrap:anywhere] md:text-base md:leading-6 ${selected ? "text-accent" : "text-text-primary group-hover:text-accent"}`}>{person.name}</span>
              {title && <span title={title} className="mt-1 line-clamp-2 break-keep text-sm leading-5 text-text-secondary [overflow-wrap:anywhere]">{title}</span>}
            </span>
          </button>
        );
      })}
      </div>
      {open && groupDescription && <ContentTextModal isOpen onClose={close} title={name} text={groupDescription} />}
    </section>
  );
}
