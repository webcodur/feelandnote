"use client";

import { useEffect } from "react";
import { useLocale } from "next-intl";
import ImageViewerModal from "@/components/ui/ImageViewerModal";
import { celebDisplayName } from "@/lib/celeb/displayName";
import type { CelebProfile } from "@/types/home";

interface Props {
  celebs: CelebProfile[];
  activeId: string;
  onSelect: (id: string) => void;
  onClose: () => void;
}

export default function CelebGridImageViewer({ celebs, activeId, onSelect, onClose }: Props) {
  const locale = useLocale();
  const people = celebs.filter(person => person.portrait_url || person.avatar_url);
  const index = people.findIndex(person => person.id === activeId);
  const person = people[index];
  const previous = people[index - 1];
  const next = people[index + 1];

  useEffect(() => {
    if (!person) return;
    const navigate = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
      const target = event.key === "ArrowLeft" ? previous : event.key === "ArrowRight" ? next : undefined;
      if (!target) return;
      event.preventDefault();
      onSelect(target.id);
    };
    document.addEventListener("keydown", navigate);
    return () => document.removeEventListener("keydown", navigate);
  }, [person, previous, next, onSelect]);

  const src = person?.portrait_url || person?.avatar_url;
  if (!person || !src) return null;
  const name = celebDisplayName(person, locale);

  return <ImageViewerModal src={src} alt={name} caption={`${name} · ${index + 1} / ${people.length}`}
    isOpen onClose={onClose} closeOnImageClick captionPlacement="below"
    showImageShadow={Boolean(person.portrait_url)}
    onPrev={previous ? () => onSelect(previous.id) : undefined}
    onNext={next ? () => onSelect(next.id) : undefined} />;
}
