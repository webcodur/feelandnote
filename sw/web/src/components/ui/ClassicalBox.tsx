import { ReactNode, ElementType, HTMLAttributes } from "react";
import styles from "./ClassicalBox.module.css";
import { cn } from "@/utils/cn"; // Assuming you have a cn utility, or I will use a simple join if not available. checking.. usually ui/lib/utils or just template literals. 
// I'll stick to template literals + passed className to be safe, or check for clsx/tailwind-merge usage.
// The globals grep didn't show utils. Let's check imports in other files. UserProfileSidebar uses utils/cn? No, it defines local cn.
// Card.tsx uses template literals.
// I'll define a local helper or using plain template literals for now to be safe and dependency-free, or check if I can find a utility.
// I'll use `className` prop strictly.

interface ClassicalBoxProps extends HTMLAttributes<HTMLElement> {
  children: ReactNode;
  as?: ElementType;
  hover?: boolean;
}

export default function ClassicalBox({
  children,
  className = "",
  as: Component = "div",
  hover = false,
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
      {children}
    </Component>
  );
}
