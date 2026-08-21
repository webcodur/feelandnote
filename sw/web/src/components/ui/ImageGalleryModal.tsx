"use client";

import Image from "next/image";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { Z_INDEX } from "@/constants/zIndex";
import { cn } from "@/lib/utils";

export interface GalleryImage {
  src: string;
  alt: string;
}

interface ImageGalleryModalProps {
  images: readonly GalleryImage[];
  initialIndex: number;
  title: string;
  labels: {
    close: string;
    previous: string;
    next: string;
  };
  onClose: () => void;
}

export default function ImageGalleryModal({
  images,
  initialIndex,
  title,
  labels,
  onClose,
}: ImageGalleryModalProps) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [activeIndex, setActiveIndex] = useState(() =>
    Math.max(0, Math.min(images.length - 1, initialIndex)),
  );
  const move = useCallback((delta: number) => {
    setActiveIndex((current) => (current + delta + images.length) % images.length);
  }, [images.length]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowLeft") move(-1);
      if (event.key === "ArrowRight") move(1);
      if (event.key === "Home") setActiveIndex(0);
      if (event.key === "End") setActiveIndex(images.length - 1);
      if (event.key !== "Tab") return;

      const controls = dialogRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled])',
      );
      if (!controls?.length) return;
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);
    closeRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [images.length, move, onClose]);

  const activeImage = images[activeIndex];
  if (!activeImage || typeof document === "undefined") return null;

  return createPortal(
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="fixed inset-0 flex h-[100dvh] flex-col bg-black/95 text-white backdrop-blur-sm"
      style={{ zIndex: Z_INDEX.top }}
    >
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-white/10 px-3 sm:h-16 sm:px-5">
        <div className="min-w-0">
          <h2 id={titleId} className="truncate text-sm font-semibold text-white/90 sm:text-base">
            {title}
          </h2>
          <p aria-live="polite" className="mt-0.5 text-xs tabular-nums text-white/55">
            {activeIndex + 1} / {images.length}
          </p>
        </div>
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label={labels.close}
          className="flex size-10 items-center justify-center rounded-full border border-white/15 bg-white/[0.06] text-white/75 hover:border-white/45 hover:bg-white/15 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <X size={22} aria-hidden />
        </button>
      </header>

      <div className="relative min-h-0 flex-1" onClick={onClose}>
        <div
          className="relative mx-auto h-full w-[calc(100%-5rem)] max-w-[88rem] sm:w-[calc(100%-8rem)]"
          onClick={(event) => event.stopPropagation()}
        >
          <Image
            key={activeImage.src}
            src={activeImage.src}
            alt={activeImage.alt}
            fill
            unoptimized
            priority
            sizes="100vw"
            className="object-contain"
          />
        </div>

        {images.length > 1 ? (
          <>
            <GalleryArrow direction="previous" label={labels.previous} onClick={() => move(-1)} />
            <GalleryArrow direction="next" label={labels.next} onClick={() => move(1)} />
          </>
        ) : null}
      </div>

      {images.length > 1 ? (
        <div
          className="flex h-20 shrink-0 items-center gap-2 overflow-x-auto border-t border-white/10 bg-black/60 px-3 scrollbar-hide sm:h-24 sm:justify-center sm:px-5"
          onClick={(event) => event.stopPropagation()}
        >
          {images.map((image, index) => (
            <button
              key={`${image.src}-${index}`}
              type="button"
              onClick={() => setActiveIndex(index)}
              aria-label={image.alt}
              aria-current={index === activeIndex ? "true" : undefined}
              className={cn(
                "relative aspect-video h-12 shrink-0 overflow-hidden rounded-md border bg-white/[0.04] hover:border-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent sm:h-16",
                index === activeIndex ? "border-accent" : "border-white/15",
              )}
            >
              <Image
                src={image.src}
                alt=""
                fill
                unoptimized
                loading="eager"
                sizes="112px"
                className="object-cover"
              />
            </button>
          ))}
        </div>
      ) : null}
    </div>,
    document.body,
  );
}

function GalleryArrow({
  direction,
  label,
  onClick,
}: {
  direction: "previous" | "next";
  label: string;
  onClick: () => void;
}) {
  const Icon = direction === "previous" ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      aria-label={label}
      className={cn(
        "absolute top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black/55 text-white/75 hover:border-accent hover:bg-accent/20 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent sm:size-12",
        direction === "previous" ? "start-2 sm:start-4" : "end-2 sm:end-4",
      )}
    >
      <Icon size={26} aria-hidden />
    </button>
  );
}
