/*
  파일명: /components/ui/LogoWordmark.tsx
  기능: feelandnote 워드마크
  책임: feel·and·note 세 span을 공백 없이 붙여 DOM 텍스트가 한 단어 feelandnote가 되게 한다(검색 토큰).
        축약형은 F&N 모노그램이다.
*/

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
      <span className={styles.word}>{compact ? "F" : "feel"}</span>
      <span className={styles.joiner}>{compact ? "&" : "and"}</span>
      <span className={styles.word}>{compact ? "N" : "note"}</span>
    </span>
  );
}
