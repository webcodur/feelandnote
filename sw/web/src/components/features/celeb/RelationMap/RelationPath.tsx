"use client";

import { CornerUpLeft } from "lucide-react";

import type { RelationNeighborhood } from "@/actions/home/getRelationNeighborhood";

interface RelationPathProps {
  trail: RelationNeighborhood[];
  current: RelationNeighborhood;
  label: string;
  backLabel: string;
  nameOf: (celeb: RelationNeighborhood["center"]) => string;
  onBack: () => void;
  onJump: (index: number) => void;
}

export default function RelationPath({
  trail,
  current,
  label,
  backLabel,
  nameOf,
  onBack,
  onJump,
}: RelationPathProps) {
  if (trail.length === 0) return null;

  return (
    <div className="mt-1 flex max-w-full flex-col items-center gap-2">
      <nav aria-label={label} className="max-w-full overflow-x-auto">
        <ol className="flex min-w-max items-center gap-1 text-xs text-text-secondary">
          {trail.map((place, index) => (
            <li key={`${place.center.id}-${index}`} className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => onJump(index)}
                className="rounded-full px-2 py-1 hover:bg-accent/10 hover:text-accent"
              >
                {nameOf(place.center)}
              </button>
              <span aria-hidden className="text-text-secondary/40">
                /
              </span>
            </li>
          ))}
          <li aria-current="page" className="px-2 py-1 font-medium text-text-primary">
            {nameOf(current.center)}
          </li>
        </ol>
      </nav>
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1 text-xs text-text-secondary hover:border-accent/40 hover:text-accent"
      >
        <CornerUpLeft size={13} />
        {backLabel}
      </button>
    </div>
  );
}
