/*
  파일명: /components/ui/Logo.tsx
  기능: Feel&Note 브랜드 워드마크
  책임: 단일 서체 환경에서도 고유한 로고와 반응형 축약 마크를 표시한다.
*/

"use client";

import { Link } from "@/i18n/navigation";
import styles from "./Logo.module.css";
import LogoWordmark from "./LogoWordmark";

type LogoSize = "sm" | "md" | "lg" | "xl";
type LogoVariant = "default" | "hero";

interface LogoProps {
  size?: LogoSize;
  variant?: LogoVariant;
  className?: string;
  onClick?: () => void;
  asLink?: boolean;
  subtitle?: string;
}

const sizeClasses: Record<LogoSize, string> = {
  sm: styles.sizeSm,
  md: styles.sizeMd,
  lg: styles.sizeLg,
  xl: styles.sizeXl,
};

export default function Logo({
  size = "md",
  variant = "default",
  className = "",
  onClick,
  asLink = true,
  subtitle,
}: LogoProps) {
  const isHero = variant === "hero";
  const rootClassName = [
    styles.root,
    sizeClasses[size],
    isHero ? styles.hero : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const logoContent = (
    <div className={rootClassName}>
      <span className="sr-only">Feel &amp; Note</span>
      <span className={styles.fullMark}>
        <LogoWordmark className={styles.wordmark} />
      </span>
      {!isHero && (
        <span className={styles.mobileMark}>
          <LogoWordmark compact className={styles.wordmark} />
        </span>
      )}
      {subtitle && (
        <span className={styles.subtitle}>
          <span aria-hidden="true" className={styles.subtitleRule} />
          <span>{subtitle}</span>
          <span aria-hidden="true" className={styles.subtitleRule} />
        </span>
      )}
    </div>
  );

  if (!asLink) {
    return <div onClick={onClick}>{logoContent}</div>;
  }

  return (
    <Link
      href="/"
      onClick={onClick}
      aria-label="Feel & Note"
      className={styles.link}
    >
      {logoContent}
    </Link>
  );
}
