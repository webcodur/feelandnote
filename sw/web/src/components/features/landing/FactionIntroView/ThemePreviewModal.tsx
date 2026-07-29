"use client";

import {
  type CSSProperties,
  useCallback,
  useEffect,
  useId,
  useRef,
  useSyncExternalStore,
} from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { ArrowLeft, ArrowRight, ArrowUpRight, X } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Z_INDEX } from "@/constants/zIndex";
import FaceStack from "./FaceStack";
import { factionThemeHref } from "./utils";
import type { CollectionTheme } from "./types";
import ThemeVisual from "./sections/ThemeVisual";
import styles from "./ThemePreviewModal.module.css";

interface ThemePreviewModalProps {
  theme: CollectionTheme | null;
  themes: CollectionTheme[];
  onChange: (theme: CollectionTheme) => void;
  onClose: () => void;
}

const subscribeToMount = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

export default function ThemePreviewModal({
  theme,
  themes,
  onChange,
  onClose,
}: ThemePreviewModalProps) {
  const t = useTranslations("explore.faction.intro");
  const mounted = useSyncExternalStore(
    subscribeToMount,
    getClientSnapshot,
    getServerSnapshot,
  );
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const touchStartX = useRef<number | null>(null);
  const currentIndex = theme
    ? themes.findIndex((candidate) => candidate.tag.id === theme.tag.id)
    : -1;
  const currentNumber = currentIndex >= 0 ? currentIndex + 1 : 1;
  const selectAtIndex = useCallback((index: number) => {
    const nextTheme = themes[index];
    if (nextTheme) onChange(nextTheme);
  }, [onChange, themes]);

  useEffect(() => {
    if (!theme) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowLeft" && currentIndex > 0) {
        selectAtIndex(currentIndex - 1);
      }
      if (event.key === "ArrowRight" && currentIndex < themes.length - 1) {
        selectAtIndex(currentIndex + 1);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [currentIndex, onClose, selectAtIndex, theme, themes.length]);

  if (!mounted || !theme) return null;

  const previewStyle = {
    "--preview-color": theme.tag.color,
    zIndex: Z_INDEX.modal,
  } as CSSProperties;

  return createPortal(
    <div
      className={styles.overlay}
      style={previewStyle}
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div
          className={styles.visual}
          onTouchStart={(event) => {
            touchStartX.current = event.changedTouches[0]?.clientX ?? null;
          }}
          onTouchEnd={(event) => {
            const startX = touchStartX.current;
            const endX = event.changedTouches[0]?.clientX;
            touchStartX.current = null;
            if (startX === null || endX === undefined) return;
            const distance = endX - startX;
            if (distance > 48 && currentIndex > 0) {
              selectAtIndex(currentIndex - 1);
            }
            if (distance < -48 && currentIndex < themes.length - 1) {
              selectAtIndex(currentIndex + 1);
            }
          }}
          onTouchCancel={() => {
            touchStartX.current = null;
          }}
        >
          <ThemeVisual theme={theme} presentation="preview" />
          <div className={styles.topMeta}>
            <span className={styles.number}>
              {String(currentNumber).padStart(2, "0")}
            </span>
            <span className={styles.count}>
              {t("figureCount", { count: theme.tag.celebs.length })}
            </span>
          </div>
          <button
            type="button"
            className={`${styles.sideButton} ${styles.previous}`}
            disabled={currentIndex <= 0}
            aria-label={t("carousel.previousPortrait")}
            onClick={() => selectAtIndex(currentIndex - 1)}
          >
            <ArrowLeft size={20} />
          </button>
          <button
            type="button"
            className={`${styles.sideButton} ${styles.next}`}
            disabled={currentIndex < 0 || currentIndex >= themes.length - 1}
            aria-label={t("carousel.nextPortrait")}
            onClick={() => selectAtIndex(currentIndex + 1)}
          >
            <ArrowRight size={20} />
          </button>
        </div>

        <div className={styles.caption}>
          <button
            ref={closeRef}
            type="button"
            className={styles.closeButton}
            aria-label={t("carousel.closePreview")}
            onClick={onClose}
          >
            <X size={19} />
          </button>
          <p className={styles.eyebrow}>{t("carousel.imagePreview")}</p>
          <h2 id={titleId} className={styles.title}>{theme.name}</h2>
          {theme.description && (
            <p className={styles.description}>{theme.description}</p>
          )}
          <div className={styles.faces}>
            <FaceStack people={theme.people} limit={6} />
          </div>
          <Link
            href={factionThemeHref(theme)}
            className={styles.pageLink}
            onClick={onClose}
          >
            {t("carousel.openPage")}
            <ArrowUpRight size={18} />
          </Link>
          <p className={styles.index}>
            {String(currentNumber).padStart(2, "0")} / {String(themes.length).padStart(2, "0")}
          </p>
        </div>
      </section>
    </div>,
    document.body,
  );
}
