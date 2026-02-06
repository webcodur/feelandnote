import { ReactNode, ElementType, HTMLAttributes } from "react";
import styles from "./ClassicalBox.module.css";

interface ClassicalBoxProps extends HTMLAttributes<HTMLElement> {
  children: ReactNode;
  as?: ElementType;
  hover?: boolean;
  variant?: "default" | "danger";
}

export default function ClassicalBox({
  children,
  className = "",
  as: Component = "div",
  hover = true,
  variant = "default",
  ...rest
}: ClassicalBoxProps) {
  const isDanger = variant === "danger";

  return (
    <Component
      className={`
        ${styles.classicalBox}
        ${hover ? styles.hoverable : ""}
        ${isDanger ? styles.danger : ""}
        bg-bg-card border-double border-4 shadow-lg
        ${isDanger ? "border-red-500/40" : "border-accent-dim/40"}
        ${className}
      `}
      {...rest}
    >
      {hover && <div className={styles.fillOverlay} />}
      {children}
    </Component>
  );
}
