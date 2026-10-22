"use client";

import { useTranslations } from "next-intl";
import type { MythPerson } from "@/actions/home/mythTypes";
import type { CelebCardImage } from "@/components/shared/CelebCard";
import PortraitCardImage from "@/components/shared/PortraitCardImage";
import CelebImage from "@/components/ui/CelebImage";
import CelebRealityLabel from "@/components/shared/CelebRealityLabel";
import FormattedText from "@/components/ui/FormattedText";
import { mythLeadImage } from "../mythLeadImage";
import { MYTH_LAYOUT as layout } from "../mythLayout";

interface Props {
  person: MythPerson;
  mythId: string;
  description: string;
  imageMode: CelebCardImage;
  selected: boolean;
  onSelect: (id: string) => void;
}

/** 사진과 이 도감에서의 설명을 인물별로 짝짓는다. 본문은 선택·복사할 수 있다. */
export default function AtlasMemberDescriptionCard({ person, mythId, description, imageMode, selected, onSelect }: Props) {
  const t = useTranslations("explore.hub.myth.memberView");
  return (
    <article data-person-id={person.id} data-person-description data-member-image={imageMode} className={layout.descriptionRow}>
      <button type="button" aria-label={person.name} aria-haspopup="dialog" aria-pressed={selected} onClick={() => onSelect(person.id)}
        className={`group relative w-full overflow-hidden rounded-xl border bg-bg-card outline-none hover:border-accent focus-visible:ring-2 focus-visible:ring-accent md:row-span-2 ${imageMode === "avatar" ? "aspect-square" : "aspect-[4/5]"} ${selected ? "border-accent" : "border-white/10"}`}>
        {imageMode === "avatar" ? (
          <CelebImage src={person.avatarUrl ?? person.portraitUrl ?? person.imageUrl} alt=""
            className="transition-transform duration-500 group-hover:scale-105" />
        ) : (
          <PortraitCardImage portraitSrc={mythLeadImage(person, mythId)}
            alternateSrc={person.portraitUrl ?? person.imageUrl} avatarSrc={person.avatarUrl}
            name={person.name} decorative imageClassName="transition-transform duration-500 group-hover:scale-105" />
        )}
      </button>
      <div className="flex min-w-0 flex-col items-start gap-1.5 self-center text-start md:self-start">
        <h3 className="min-w-0 text-lg font-semibold text-text-primary md:text-xl">
          <button type="button" aria-haspopup="dialog" onClick={() => onSelect(person.id)}
            className="min-h-10 break-keep rounded-control border border-line-strong px-3 py-1 text-start outline-none hover:border-accent/60 hover:text-accent focus-visible:ring-2 focus-visible:ring-accent">{person.name}</button>
        </h3>
        {person.title && <p className="text-sm leading-relaxed text-text-secondary">{person.title}</p>}
        {person.reality && person.reality !== "REAL" && <CelebRealityLabel reality={person.reality} interactive={false} />}
      </div>
      <div className="col-span-2 min-w-0 break-keep text-start text-sm leading-7 text-text-primary md:col-span-1 md:col-start-2 md:row-start-2 md:text-base md:leading-8">
        {description ? <FormattedText text={description} layout="prose" /> : <p className="text-text-tertiary">{t("empty")}</p>}
      </div>
    </article>
  );
}
