"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import Modal from "@/components/ui/Modal";
import type { StoryGuide } from "./storyBoundaries";

interface Props {
  images: { url: string; label?: string | null; guide?: StoryGuide }[];
  title: string;
  activeIndex: number;
  endingTitle?: string;
  onSelect: (index: number) => void;
  onClose: () => void;
  zIndex: number;
}

export default function FactionSceneNavigator({ images, title, activeIndex, endingTitle, onSelect, onClose, zIndex }: Props) {
  const t = useTranslations("explore.hub.myth");
  const [query, setQuery] = useState("");
  const [number, setNumber] = useState(activeIndex < images.length ? String(activeIndex + 1) : "");
  const activeRef = useRef<HTMLButtonElement>(null);
  const selectedNumber = Number(number);
  const validNumber = Number.isInteger(selectedNumber) && selectedNumber >= 1 && selectedNumber <= images.length;
  const search = query.trim().toLocaleLowerCase();
  const matches = images.map((image, index) => ({ ...image, index }))
    .filter(image => !search || (image.label || title).toLocaleLowerCase().includes(search) || String(image.index + 1) === search);
  const showEnding = endingTitle && (!search || endingTitle.toLocaleLowerCase().includes(search) || "ending".includes(search));

  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "nearest" });
  }, []);

  const inputClass = "h-11 min-w-0 rounded-lg border border-white/20 bg-black/20 px-3 text-sm text-text-primary outline-none hover:border-accent focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/50";
  const itemClass = "flex w-full items-start gap-3 rounded-lg border p-3 text-left text-sm outline-none hover:border-accent hover:bg-accent/10 hover:text-accent focus-visible:ring-2 focus-visible:ring-accent";

  return (
    <Modal isOpen onClose={onClose} title={t("selectImage")} stickyHeader frame="plain" escapeCapture zIndex={zIndex}
      widthClassName="max-w-3xl" boxClassName="overflow-hidden rounded-2xl border border-white/20 bg-bg-main" animateHeight={false}>
      <div className="space-y-4 p-4 sm:p-6" data-scene-navigator>
        <form className="flex flex-wrap items-end gap-2" onSubmit={event => { event.preventDefault(); if (validNumber) onSelect(selectedNumber - 1); }}>
          <label className="flex min-w-0 flex-1 flex-col gap-2 text-xs text-text-secondary">
            {t("imageNumber", { count: images.length })}
            <input data-scene-number type="number" inputMode="numeric" min={1} max={images.length} step={1} required value={number}
              onChange={event => setNumber(event.target.value)} className={inputClass} />
          </label>
          <button type="submit" disabled={!validNumber}
            className="h-11 rounded-lg border border-accent/40 bg-accent/10 px-5 text-sm text-accent outline-none enabled:hover:bg-accent/20 enabled:hover:border-accent focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-40">
            {t("goToImage")}
          </button>
        </form>
        <input type="search" aria-label={t("searchImages")} placeholder={t("searchImages")} value={query}
          onChange={event => setQuery(event.target.value)} className={`${inputClass} w-full`} />
        <div className="max-h-[45dvh] overflow-y-auto overscroll-contain p-1">
          <ol className="grid gap-2">
            {matches.map(image => (
              <li key={`${image.url}-${image.index}`}>
                <button ref={activeIndex === image.index ? activeRef : undefined} type="button" onClick={() => onSelect(image.index)}
                  aria-current={activeIndex === image.index ? "step" : undefined} data-scene-jump={image.index + 1}
                  className={`${itemClass} ${activeIndex === image.index ? "border-accent/60 bg-accent/10 text-accent" : "border-white/10 text-text-primary"}`}>
                  <span className="min-w-7 shrink-0 tabular-nums text-accent/80">{image.index + 1}</span>
                  <span className="break-keep">{image.guide && <span className="me-2 text-accent">{t(image.guide.phase === 'opening' ? 'storyGuideOpening' : 'storyGuideClosing')} ·</span>}{image.label || title}</span>
                </button>
              </li>
            ))}
            {showEnding && (
              <li>
                <button ref={activeIndex === images.length ? activeRef : undefined} type="button" onClick={() => onSelect(images.length)}
                  aria-current={activeIndex === images.length ? "step" : undefined} data-ending-jump
                  className={`${itemClass} ${activeIndex === images.length ? "border-accent/60 bg-accent/10 text-accent" : "border-white/10 text-text-primary"}`}>
                  <span className="shrink-0 text-xs tracking-wider text-accent">ENDING</span><span>{endingTitle}</span>
                </button>
              </li>
            )}
          </ol>
          {!matches.length && !showEnding && <p className="py-8 text-center text-sm text-text-secondary">{t("noMatchingImages")}</p>}
        </div>
      </div>
    </Modal>
  );
}
