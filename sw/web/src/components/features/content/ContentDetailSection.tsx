"use client";

import { useContext, type ReactNode } from "react";
import HubSection from "@/components/shared/HubSection";
import { ContentDetailSectionsContext } from "./ContentDetailNavigation";
import styles from "./ContentDetail.module.css";

interface Props {
  id: string;
  title: string;
  children: ReactNode;
  headerActions?: ReactNode;
  opening?: boolean;
}

/** 인물 상세와 같은 구획 머리. 서버에서 늦게 도착하는 구획도 목차에 등록된다. */
export default function ContentDetailSection({ id, title, children, headerActions, opening }: Props) {
  const items = useContext(ContentDetailSectionsContext);
  const index = items.findIndex(item => item.sectionId === id);
  return (
    <div data-content-detail-section={id} data-section-label={title}>
      <HubSection id={id} title={title} headerActions={headerActions} tabIndex={-1}
        index={index >= 0 ? index : undefined} total={items.length}
        compact hideDivider={opening} className={styles.section}>
        {opening ? children : <div className={styles.sectionBody}>{children}</div>}
      </HubSection>
    </div>
  );
}
