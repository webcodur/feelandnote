import { ReactNode, ElementType, HTMLAttributes, Ref } from "react";
import styles from "./ClassicalBox.module.css";

interface ClassicalBoxProps extends HTMLAttributes<HTMLElement> {
  children: ReactNode;
  as?: ElementType;
  hover?: boolean;
  /** 옛 호출 호환 — 모바일에서 판을 더 옅게 둔다(선은 같고 바탕만 반투명) */
  mobileSlim?: boolean;
  variant?: "default" | "danger";
  ref?: Ref<HTMLElement>;
}

// 판 하나 = 카드색 면 + 얇은 선 + 16px 모서리. 그림자는 바탕에서 살짝 뜨는 정도만 둔다
const BOX = "rounded-panel border border-solid border-line shadow-[0_24px_48px_-24px_rgba(0,0,0,0.7)]";

export default function ClassicalBox({
  children,
  className = "",
  as: Component = "div",
  hover = true,
  mobileSlim = false,
  variant = "default",
  ...rest
}: ClassicalBoxProps) {
  const isDanger = variant === "danger";

  return (
    <Component
      className={`${styles.classicalBox} ${hover ? styles.hoverable : ""} ${isDanger ? styles.danger : ""} ${BOX} ${
        mobileSlim ? "bg-bg-card/60 md:bg-bg-card" : "bg-bg-card"
      } ${className}`}
      {...rest}
    >
      {children}
    </Component>
  );
}
