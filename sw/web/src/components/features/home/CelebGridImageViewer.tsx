"use client";

import CelebImageViewer from "@/components/shared/CelebImageViewer";
import type { CelebProfile } from "@/types/home";

interface Props {
  celebs: CelebProfile[];
  activeId: string;
  onSelect: (id: string) => void;
  onClose: () => void;
}

export default function CelebGridImageViewer({ celebs, activeId, onSelect, onClose }: Props) {
  const people = celebs.filter(person => person.portrait_url || person.avatar_url);
  const index = people.findIndex(person => person.id === activeId);
  const person = people[index];
  const previous = people[index - 1];
  const next = people[index + 1];
  if (!person) return null;

  return <CelebImageViewer person={person} onClose={onClose} previous={previous} next={next}
    position={{ index, total: people.length }}
    onPrev={previous ? () => onSelect(previous.id) : undefined}
    onNext={next ? () => onSelect(next.id) : undefined} />;
}
