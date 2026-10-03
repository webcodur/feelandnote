"use client";

import { useLayoutEffect, useRef } from "react";
import styles from "./AtlasNav.module.css";

interface AtlasRailHighlightProps {
  sectionId: string;
  hovering: boolean;
}

export default function AtlasRailHighlight({ sectionId, hovering }: AtlasRailHighlightProps) {
  const highlightRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const highlight = highlightRef.current;
    const list = highlight?.parentElement;
    if (!list || !highlight) return;

    const update = () => {
      const item = Array.from(list.querySelectorAll<HTMLElement>("[data-atlas-section]"))
        .find((element) => element.dataset.atlasSection === sectionId);
      highlight.dataset.visible = String(Boolean(item && item.offsetHeight));
      if (!item) return;
      highlight.style.height = `${item.offsetHeight}px`;
      highlight.style.transform = `translateY(${item.offsetTop}px)`;
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(list);
    return () => observer.disconnect();
  }, [sectionId]);

  return <div ref={highlightRef} className={styles.atlasHighlight} data-hovering={hovering} aria-hidden="true" />;
}
