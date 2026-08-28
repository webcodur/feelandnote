"use client";

import { useCallback, useRef, useState, useTransition } from "react";
import { ArrowUpRight, Loader2, User } from "lucide-react";
import { useTranslations } from "next-intl";

import { searchCelebs } from "@/actions/search/searchCelebs";
import {
  getRelationNeighborhood,
  type RelationNeighborhood,
} from "@/actions/home/getRelationNeighborhood";
import type { RelationStarter } from "@/actions/home/getRelationShapes";
import CelebAvatarImage from "@/components/ui/CelebAvatarImage";
import { Link } from "@/i18n/navigation";
import { withParticle } from "@/lib/korean-particle";
import RelationGroups from "./RelationGroups";
import RelationPath from "./RelationPath";
import RelationSearch, { type RelationSearchHit } from "./RelationSearch";

const SEARCH_DEBOUNCE_MS = 250;
const SEARCH_LIMIT = 6;
const CENTER_AVATAR_PX = 128;

interface RelationExplorerProps {
  initial: RelationNeighborhood;
  starters: RelationStarter[];
  isEn: boolean;
}

export default function RelationExplorer({ initial, starters, isEn }: RelationExplorerProps) {
  const t = useTranslations("explore.hub.relationMap");
  const [current, setCurrent] = useState(initial);
  const [trail, setTrail] = useState<RelationNeighborhood[]>([]);
  const [pending, startTransition] = useTransition();
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<RelationSearchHit[]>([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchSeq = useRef(0);

  const nameOf = useCallback(
    (celeb: { nickname: string; nicknameEn?: string | null; nickname_en?: string | null }) =>
      (isEn && (celeb.nicknameEn ?? celeb.nickname_en)) || celeb.nickname,
    [isEn],
  );

  const moveTo = useCallback(
    (celebId: string) => {
      if (pending || celebId === current.center.id) return;
      setQuery("");
      setHits([]);
      startTransition(async () => {
        const next = await getRelationNeighborhood(celebId);
        if (!next) return;
        setTrail((previous) => [...previous, current]);
        setCurrent(next);
      });
    },
    [current, pending],
  );

  const goBack = useCallback(() => {
    setTrail((previous) => {
      if (previous.length === 0) return previous;
      setCurrent(previous[previous.length - 1]);
      return previous.slice(0, -1);
    });
  }, []);

  const jumpTo = useCallback((index: number) => {
    setTrail((previous) => {
      const next = previous[index];
      if (!next) return previous;
      setCurrent(next);
      return previous.slice(0, index);
    });
  }, []);

  const onQueryChange = useCallback((value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const seq = ++searchSeq.current;

    const keyword = value.trim();
    if (keyword.length < 2) {
      setHits([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      const result = await searchCelebs({ query: keyword, limit: SEARCH_LIMIT });
      if (seq !== searchSeq.current) return;
      setHits((result.items ?? []) as RelationSearchHit[]);
      setSearching(false);
    }, SEARCH_DEBOUNCE_MS);
  }, []);

  const centerName = nameOf(current.center);
  const previousName = trail.length > 0 ? nameOf(trail[trail.length - 1].center) : "";
  const backName = isEn ? previousName : withParticle(previousName, "direction");
  const centerTitle = (isEn && current.center.titleEn) || current.center.title;

  return (
    <div className="rounded-2xl border border-white/5 bg-card p-5 md:p-7">
      <RelationSearch
        query={query}
        hits={hits}
        searching={searching}
        placeholder={t("searchPlaceholder")}
        clearLabel={t("searchClear")}
        nameOf={nameOf}
        onQueryChange={onQueryChange}
        onSelect={moveTo}
      />

      {starters.length > 0 && (
        <div className="mb-7 flex flex-wrap items-center justify-center gap-2">
          <span className="text-xs text-text-secondary">{t("startersLead")}</span>
          {starters.map((starter) => (
            <button
              key={starter.id}
              type="button"
              onClick={() => moveTo(starter.id)}
              disabled={pending || starter.id === current.center.id}
              className="rounded-full border border-white/10 px-3 py-1 text-xs text-text-secondary hover:border-accent/40 hover:text-accent disabled:border-accent/40 disabled:text-accent"
            >
              {(isEn && starter.nicknameEn) || starter.nickname}
            </button>
          ))}
        </div>
      )}

      <div className={`relative ${pending ? "opacity-60" : ""}`} aria-busy={pending}>
        {pending && (
          <span className="absolute inset-x-0 top-0 z-10 flex justify-center">
            <Loader2 aria-hidden className="size-6 animate-spin text-accent" />
          </span>
        )}

        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <span className="relative block size-24 overflow-hidden rounded-full border-2 border-accent/70 bg-main md:size-32">
            {current.center.avatarUrl ? (
              <CelebAvatarImage
                src={current.center.avatarUrl}
                alt={centerName}
                boxPx={CENTER_AVATAR_PX}
                className="size-full object-cover"
              />
            ) : (
              <User
                aria-hidden
                size={40}
                className="absolute start-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-text-secondary"
              />
            )}
          </span>
          <span>
            <span className="flex items-center justify-center gap-1.5">
              <span className="text-lg font-semibold text-text-primary md:text-xl">{centerName}</span>
              {current.center.slug && (
                <Link
                  href={`/celeb/${current.center.slug}`}
                  aria-label={t("openDetail", { name: centerName })}
                  className="text-text-secondary hover:text-accent"
                >
                  <ArrowUpRight size={18} />
                </Link>
              )}
            </span>
            {centerTitle && <span className="mt-0.5 block text-sm text-text-secondary">{centerTitle}</span>}
          </span>

          <RelationPath
            trail={trail}
            current={current}
            label={t("shapeExplorer")}
            backLabel={t("goBack", { name: backName })}
            nameOf={nameOf}
            onBack={goBack}
            onJump={jumpTo}
          />
        </div>

        <RelationGroups groups={current.groups} isEn={isEn} nameOf={nameOf} onSelect={moveTo} />
      </div>
    </div>
  );
}
