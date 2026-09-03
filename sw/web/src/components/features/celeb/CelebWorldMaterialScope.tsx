import type { ElementType, ReactNode } from "react";
import { getWorldMaterial, getWorldMaterialStyle } from "@/lib/celeb/worldMaterial";
import styles from "./CelebWorldMaterialScope.module.css";

interface CelebWorldMaterialScopeProps {
  children: ReactNode;
  worldId: string;
  className?: string;
  as?: ElementType;
  /** true면 세계 재질 테마를 걸지 않고 기본 색상(globals.css)으로 둔다 */
  disableTheme?: boolean;
}

export default function CelebWorldMaterialScope({
  children,
  worldId,
  className = "",
  as: Component = "div",
  disableTheme = false,
}: CelebWorldMaterialScopeProps) {
  if (disableTheme) {
    return <Component className={`${styles.scope} ${className}`}>{children}</Component>;
  }

  const material = getWorldMaterial(worldId);

  return (
    <Component
      className={`${styles.scope} ${className}`}
      data-world-material={material.id}
      style={getWorldMaterialStyle(material)}
    >
      {children}
    </Component>
  );
}
