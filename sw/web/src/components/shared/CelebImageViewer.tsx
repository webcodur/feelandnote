"use client";

import { useEffect, useState } from "react";
import { useLocale } from "next-intl";
import ImageViewerModal from "@/components/ui/ImageViewerModal";
import { celebDisplayName } from "@/lib/celeb/displayName";
import type { CelebProfile } from "@/types/home";

interface Props {
  person: CelebProfile;
  onClose: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  previous?: CelebProfile;
  next?: CelebProfile;
  position?: { index: number; total: number };
  zIndex?: number;
}

export default function CelebImageViewer({ person, onClose, onPrev, onNext, previous, next, position, zIndex }: Props) {
  const locale = useLocale();
  const index = position?.index ?? 0;
  const requestedSrc = person.portrait_url || person.avatar_url;
  const [image, setImage] = useState(() => ({
    person, index, src: requestedSrc || "",
    previousSrc: null as string | null, ready: false, error: false,
  }));

  useEffect(() => {
    if (!requestedSrc) return;
    let cancelled = false;
    let fallbackTried = !person.portrait_url || person.portrait_url === person.avatar_url;
    const photo = new window.Image();
    photo.onload = async () => {
      try { await photo.decode(); } catch { /* 이미 로드된 사진은 디코딩 API 실패 시에도 표시한다. */ }
      if (cancelled) return;
      setImage(current => ({ person, index, src: photo.src, previousSrc: current.src, ready: true, error: false }));
    };
    photo.onerror = () => {
      if (cancelled) return;
      if (!fallbackTried && person.avatar_url) {
        fallbackTried = true;
        photo.src = person.avatar_url;
        return;
      }
      setImage(current => ({ ...current, person, index, ready: true, error: true }));
    };
    photo.src = requestedSrc;
    return () => { cancelled = true; photo.onload = null; photo.onerror = null; };
  }, [person, index, requestedSrc]);

  useEffect(() => {
    for (const neighbor of [previous, next]) {
      const src = neighbor?.portrait_url || neighbor?.avatar_url;
      if (src) new window.Image().src = src;
    }
  }, [previous, next]);

  useEffect(() => {
    const navigate = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
      const action = event.key === "ArrowLeft" ? onPrev : event.key === "ArrowRight" ? onNext : undefined;
      if (!action) return;
      event.preventDefault();
      action();
    };
    document.addEventListener("keydown", navigate);
    return () => document.removeEventListener("keydown", navigate);
  }, [onPrev, onNext]);

  const name = celebDisplayName(requestedSrc ? image.person : person, locale);
  const caption = position ? `${name} · ${image.index + 1} / ${position.total}` : name;
  return <ImageViewerModal src={image.src} alt={name} caption={caption}
    isOpen onClose={onClose} closeOnImageClick captionPlacement="below" gallery zIndex={zIndex}
    previousSrc={image.previousSrc} imageError={!requestedSrc || image.error}
    isLoading={Boolean(requestedSrc) && (!image.ready || image.person.id !== person.id)}
    onPrev={onPrev} onNext={onNext} />;
}
