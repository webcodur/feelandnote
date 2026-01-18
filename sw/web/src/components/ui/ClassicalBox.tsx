import { ReactNode, ElementType, HTMLAttributes } from "react";
import styles from "./ClassicalBox.module.css";

interface ClassicalBoxProps extends HTMLAttributes<HTMLElement> {
  children: ReactNode;
  as?: ElementType;
  hover?: boolean;
}

export default function ClassicalBox({
  children,
  className = "",
  as: Component = "div",
  hover = true,
  ...rest
}: ClassicalBoxProps) {
  return (
    <Component
      className={`
        ${styles.classicalBox}
        ${hover ? styles.hoverable : ""}
        bg-bg-card border-double border-4 border-accent-dim/40 shadow-lg
        ${className}
      `}
      {...rest}
    >
      {hover && <div className={styles.fillOverlay} />}
      {children}
    </Component>
  );
}
