"use client";

import CelebAvatarImage from "@/components/ui/CelebAvatarImage";
import BlurDissolve from "@/components/ui/BlurDissolve";
import CelebRealityLabel from "@/components/shared/CelebRealityLabel";
import { useCallback, useRef, useState } from "react";
import { ChevronDown, ChevronsUp, Check } from "lucide-react";
import { useTranslations } from "next-intl";
import type { MythPerson } from "@/actions/home/mythTypes";
import type { CelebCardImage } from "@/components/shared/CelebCard";
import { CELEB_GRID_LAYOUT_PORTRAIT } from "@/components/shared/celebGridLayout";
import PortraitCardImage from "@/components/shared/PortraitCardImage";
import { mythLeadImage } from "./mythLeadImage";
import { MYTH_LAYOUT as mythLayout } from "./mythLayout";
import PortraitPersonStepper from "@/components/shared/PortraitPersonStepper";

interface Props {
  people: MythPerson[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  name: string;
  /** portrait이면 개인샷·대표사진은 큰 칸에, 사진 없는 인물은 아래 작은 아바타 격자에 모은다. */
  imageMode?: CelebCardImage;
  /** 대표사진 보기에서 이 편의 전용 개인샷을 먼저 고를 때 쓰는 신화·세력 id */
  mythId?: string;
}

/* 접힌 목록이 보여 주는 인원 */
export const ATLAS_MEMBER_COLLAPSED_COUNT = 12;

// 카드 수식어는 인물의 정식 title만 두 줄까지 쓴다. 팩션 등장 설명·bio는 상세에서 읽는다.
export default function MythPersonPicker({ people, selectedId, onSelect, name, imageMode = "avatar", mythId }: Props) {
  const t = useTranslations("explore.hub.myth");
  const portraitMode = imageMode === "portrait";
  /* 긴 명단은 첫 묶음만 보여 주고 아래 책장이 보이게 한다 — 모두 보기로 전원을 펼친다 */
  const [expanded, setExpanded] = useState(false);
  const [failedPhotoUrls, setFailedPhotoUrls] = useState<Set<string>>(() => new Set());
  const sectionRef = useRef<HTMLElement | null>(null);
  const collapsible = people.length > ATLAS_MEMBER_COLLAPSED_COUNT;
  const entries = people.map(person => {
    const leadUrl = portraitMode ? (mythId ? mythLeadImage(person, mythId) : person.portraitUrl ?? person.imageUrl) : null;
    const photoUrl = portraitMode ? [leadUrl, person.portraitUrl, person.imageUrl]
      .map(url => url?.trim())
      .find(url => url && url !== person.avatarUrl?.trim() && !failedPhotoUrls.has(url)) : undefined;
    return { person, photoUrl };
  });
  const ordered = portraitMode
    ? [...entries.filter(entry => entry.photoUrl), ...entries.filter(entry => !entry.photoUrl)]
    : entries;
  const visible = collapsible && !expanded ? ordered.slice(0, ATLAS_MEMBER_COLLAPSED_COUNT) : ordered;
  const portraitIds = visible.filter(entry => entry.photoUrl).map(entry => entry.person.id);
  const groups = portraitMode
    ? [{ large: true, entries: visible.filter(entry => entry.photoUrl) }, { large: false, entries: visible.filter(entry => !entry.photoUrl) }]
    : [{ large: false, entries: visible }];
  const handlePhotoError = useCallback((url: string) => {
    setFailedPhotoUrls(current => current.has(url) ? current : new Set([...current, url]));
  }, []);
  const toggleExpanded = useCallback(() => {
    setExpanded((current) => {
      /* 접으면 목록이 수십 행 위로 줄어 버튼이 화면 밖으로 나간다 — 머리로 되돌린다 */
      if (current) sectionRef.current?.scrollIntoView({ block: "start" });
      return !current;
    });
  }, []);

  return (
    <section ref={sectionRef} aria-label={name} className="scroll-mt-24">
      <div className="space-y-6 md:space-y-7">
      {groups.filter(group => group.entries.length > 0).map(({ large, entries: cards }) => (
      <div key={large ? "portrait" : "compact"} role="group" aria-label={name} data-person-layout={large ? "portrait" : "compact"}
        className={large ? `${CELEB_GRID_LAYOUT_PORTRAIT} items-start gap-y-6 md:gap-y-7` : mythLayout.memberList}>
      {cards.map(({ person, photoUrl }) => {
        const selected = selectedId === person.id;
        const thumbUrl = [person.avatarUrl, person.portraitUrl, person.imageUrl].find(url => url?.trim() && !failedPhotoUrls.has(url.trim()));
        const title = person.title?.trim();
        return (
          <button
            key={person.id}
            type="button"
            data-person-id={person.id}
            data-portrait-person={large ? person.id : undefined}
            aria-label={person.name}
            aria-describedby={person.reality && person.reality !== "REAL" ? `person-reality-${person.id}` : undefined}
            aria-haspopup="dialog"
            aria-pressed={selected}
            onClick={() => onSelect(person.id)}
            className="group flex min-w-0 scroll-mt-24 flex-col rounded-xl text-center outline-none"
          >
            <span className={`relative ${large ? "aspect-[4/5]" : "aspect-square"} w-full overflow-hidden rounded-xl border bg-bg-card group-focus-visible:ring-2 group-focus-visible:ring-accent group-focus-visible:ring-offset-2 group-focus-visible:ring-offset-bg-secondary ${selected ? "border-accent" : "border-white/10 group-hover:border-accent"}`}>
              {large && <PortraitCardImage portraitSrc={photoUrl} onPhotoError={handlePhotoError}
                avatarSrc={person.avatarUrl} name={person.name} decorative imageClassName="transition-transform duration-500 group-hover:scale-105" />}
              {!large && thumbUrl && (
                <BlurDissolve key={thumbUrl} className="absolute inset-0"><CelebAvatarImage src={thumbUrl} alt="" draggable={false} className="object-cover transition-transform duration-500 group-hover:scale-105" style={{ filter: "none" }} /></BlurDissolve>
              )}
              {!large && !thumbUrl && (
                <span aria-hidden className="flex h-full items-center justify-center text-2xl font-black text-accent">{person.name.slice(0, 1)}</span>
              )}
              {selected && <span className="absolute end-2 top-2 grid size-6 place-items-center rounded-full bg-accent text-bg-main"><Check size={15} aria-hidden /></span>}
              {person.reality && person.reality !== "REAL" && <span className="absolute bottom-2 start-2"><CelebRealityLabel id={`person-reality-${person.id}`} reality={person.reality} interactive={false} /></span>}
            </span>
            <span className="mt-1.5 block w-full min-w-0 px-0.5">
              <span title={person.name} className={`${mythLayout.memberName} ${selected ? "text-accent" : "text-text-primary group-hover:text-accent"}`}>{person.name}</span>
              <span title={title || undefined} aria-hidden={!title || undefined} className={mythLayout.memberTitle}>{title}</span>
            </span>
          </button>
        );
      })}
      </div>
      ))}
      </div>
      {portraitMode && portraitIds.length > 0 && <PortraitPersonStepper containerRef={sectionRef} listKey={portraitIds.join(",")} />}
      {collapsible && (
        <button type="button" onClick={toggleExpanded} aria-expanded={expanded}
          className="mt-6 flex min-h-11 w-full items-center justify-center gap-1.5 rounded-xl border border-white/15 bg-bg-card text-sm font-semibold text-text-secondary outline-none hover:border-accent hover:text-accent focus-visible:ring-2 focus-visible:ring-accent md:mt-7">
          {expanded
            ? <><ChevronsUp size={16} aria-hidden />{t("collapseMembers")}</>
            : <><ChevronDown size={16} aria-hidden />{t("expandMembers", { count: people.length })}</>}
        </button>
      )}
    </section>
  );
}
