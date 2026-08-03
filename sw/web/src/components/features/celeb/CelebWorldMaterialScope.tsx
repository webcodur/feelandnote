import type { ElementType, ReactNode } from "react";
import { getWorldMaterial, getWorldMaterialStyle } from "@/lib/celeb/worldMaterial";
import styles from "./CelebWorldMaterialScope.module.css";

interface CelebWorldMaterialScopeProps {
  children: ReactNode;
  worldId: string;
  className?: string;
  as?: ElementType;
}

export default function CelebWorldMaterialScope({
  children,
  worldId,
  className = "",
  as: Component = "div",
}: CelebWorldMaterialScopeProps) {
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
