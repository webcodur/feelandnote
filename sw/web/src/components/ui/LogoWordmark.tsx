import styles from "./Logo.module.css";

interface LogoWordmarkProps {
  compact?: boolean;
  className?: string;
}

export default function LogoWordmark({
  compact = false,
  className = "",
}: LogoWordmarkProps) {
  return (
    <span
      aria-hidden="true"
      className={`${className} ${compact ? styles.compact : ""}`}
    >
      <span className={styles.word}>{compact ? "F" : "FEEL"}</span>
      <span className={styles.ampersand}>&amp;</span>
      <span className={styles.word}>{compact ? "N" : "NOTE"}</span>
    </span>
  );
}
