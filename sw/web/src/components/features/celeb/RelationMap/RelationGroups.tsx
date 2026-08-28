"use client";

import { ArrowUpRight, User } from "lucide-react";
import { useTranslations } from "next-intl";

import type { RelationNeighborhood } from "@/actions/home/getRelationNeighborhood";
import { Link } from "@/i18n/navigation";
import type { NeighborKind } from "@/lib/celeb/relationNeighborhood";
import CelebAvatarImage from "@/components/ui/CelebAvatarImage";

const NEIGHBOR_AVATAR_PX = 64;

const IMPLIED_TYPE: Partial<Record<NeighborKind, string>> = {
  gave: "influence",
  took: "influenced",
  rival: "rival",
};

interface RelationGroupsProps {
  groups: RelationNeighborhood["groups"];
  isEn: boolean;
  nameOf: (celeb: RelationNeighborhood["center"]) => string;
  onSelect: (celebId: string) => void;
}

export default function RelationGroups({ groups, isEn, nameOf, onSelect }: RelationGroupsProps) {
  const t = useTranslations("explore.hub.relationMap");
  const tRel = useTranslations("celebPage");
  const groupLabel = (kind: NeighborKind) =>
    ({
      gave: t("groupGave"),
      took: t("groupTook"),
      rival: t("groupRival"),
      together: t("groupTogether"),
      family: t("groupFamily"),
    })[kind];

  if (groups.length === 0) {
    return <p className="py-8 text-center text-sm text-text-secondary">{t("noRelations")}</p>;
  }

  return (
    <div className="space-y-7">
      {groups.map((group) => (
        <section key={group.kind}>
          <h5 className="mb-3 flex flex-wrap items-baseline gap-x-2 text-sm font-semibold text-text-primary">
            {groupLabel(group.kind)}
            <span className="text-xs font-normal tabular-nums text-text-secondary">
              {group.total > group.items.length
                ? t("groupCountPartial", { shown: group.items.length, total: group.total })
                : t("groupCount", { count: group.total })}
            </span>
          </h5>

          <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {group.items.map((item) => {
              const name = nameOf(item.celeb);
              const note = (isEn && item.noteEn) || item.note;
              const typeTag =
                note && item.relType === IMPLIED_TYPE[group.kind]
                  ? null
                  : tRel(`relType_${item.relType}`);

              return (
                <li key={item.celeb.id} className="relative">
                  <button
                    type="button"
                    onClick={() => onSelect(item.celeb.id)}
                    className="group flex h-full w-full gap-3 rounded-xl border border-white/5 bg-main p-3 pe-10 text-start hover:border-accent/40 hover:bg-accent/5"
                  >
                    <span className="relative block size-12 shrink-0 overflow-hidden rounded-full border border-white/10 bg-card group-hover:border-accent/50 md:size-16">
                      {item.celeb.avatarUrl ? (
                        <CelebAvatarImage
                          src={item.celeb.avatarUrl}
                          alt={name}
                          boxPx={NEIGHBOR_AVATAR_PX}
                          className="size-full object-cover"
                        />
                      ) : (
                        <User
                          aria-hidden
                          size={20}
                          className="absolute start-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-text-secondary"
                        />
                      )}
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="truncate break-keep text-sm font-semibold text-text-primary group-hover:text-accent">
                          {name}
                        </span>
                        {typeTag && (
                          <span className="ms-auto shrink-0 rounded-full border border-white/10 px-2 py-0.5 text-xs leading-none text-text-secondary">
                            {typeTag}
                          </span>
                        )}
                      </span>
                      {note && (
                        <span className="mt-1 line-clamp-3 break-keep text-sm leading-relaxed text-text-secondary">
                          {note}
                        </span>
                      )}
                    </span>
                  </button>
                  {item.celeb.slug && (
                    <Link
                      href={`/celeb/${item.celeb.slug}`}
                      aria-label={t("openDetail", { name })}
                      className="absolute end-3 top-3 text-text-secondary/60 hover:text-accent"
                    >
                      <ArrowUpRight size={15} />
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
