import { ReactNode, ElementType, HTMLAttributes } from "react";
import styles from "./ClassicalBox.module.css";

interface ClassicalBoxProps extends HTMLAttributes<HTMLElement> {
  children: ReactNode;
  as?: ElementType;
  hover?: boolean;
  /** 모바일에서는 장식 상자를 벗기고 md 이상에서만 기존 상자 스타일을 적용한다. */
  mobilePlain?: boolean;
  variant?: "default" | "danger";
}

export default function ClassicalBox({
  children,
  className = "",
  as: Component = "div",
  hover = true,
  mobilePlain = false,
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
        ${mobilePlain
          ? "border-0 bg-transparent shadow-none md:border-4 md:bg-bg-card md:shadow-lg"
          : "border-4 bg-bg-card shadow-lg"}
        border-double
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
