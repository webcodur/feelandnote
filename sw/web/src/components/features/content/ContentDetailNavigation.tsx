"use client";

import hubStyles from "@/components/shared/HubSection.module.css";

import { createContext, useEffect, useRef, useState, type ReactNode } from "react";
import AtlasNav, { type AtlasNavItem } from "@/components/shared/atlasNav/AtlasNav";
import { useSectionNavigation } from "@/lib/scroll/useSectionNavigation";
import PageContainer from "@/components/layout/PageContainer";
import styles from "./ContentDetail.module.css";

export const ContentDetailSectionsContext = createContext<AtlasNavItem[]>([]);

/** 서버 슬롯·로그인에 따라 실제로 표시된 본문 구획만 공용 목차에 싣는다. */
export default function ContentDetailNavigation({ children, workId }: { children: ReactNode; workId: string }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [items, setItems] = useState<AtlasNavItem[]>([]);
  const { activeSectionId, navigate } = useSectionNavigation(items.map(item => item.sectionId));

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    let previousKey = "";
    const update = () => {
      const sections = Array.from(root.querySelectorAll<HTMLElement>("[data-content-detail-section]"));
      const next = sections.map((section, index) => ({
        key: section.dataset.contentDetailSection!,
        sectionId: section.dataset.contentDetailSection!,
        label: section.dataset.sectionLabel!,
        chapter: String(index + 1).padStart(2, "0"),
      }));
      const key = next.map(item => `${item.key}:${item.label}`).join("|");
      if (key === previousKey) return;
      previousKey = key;
      setItems(next);
    };
    update();
    const observer = new MutationObserver(update);
    observer.observe(root, { childList: true, subtree: true, attributes: true, attributeFilter: ["data-section-label"] });
    return () => observer.disconnect();
  }, [rootRef]);

  return (
    <ContentDetailSectionsContext.Provider value={items}>
      <PageContainer width="detail">
        <div ref={rootRef} className={`${styles.page} ${hubStyles.page}`} data-content-work-id={workId}>
          <AtlasNav items={items} activeId={activeSectionId} onNavigate={navigate} />
          {children}
        </div>
      </PageContainer>
    </ContentDetailSectionsContext.Provider>
  );
}
