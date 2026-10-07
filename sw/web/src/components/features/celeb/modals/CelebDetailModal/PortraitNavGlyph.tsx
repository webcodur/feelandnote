import styles from "./CelebDetailModal.module.css";

export default function PortraitNavGlyph({ direction }: { direction: "prev" | "next" }) {
  return (
    <svg width="36" height="44" viewBox="0 0 36 44" fill="none" aria-hidden="true">
      <path
        className={styles.navFace}
        d="M10 2H26L34 10V34L26 42H10L2 34V10Z"
      />
      <path
        className={styles.navEdge}
        d="M10 2H26L34 10V34L26 42H10L2 34V10Z"
      />
      <path className={styles.navBevel} d="M10 5H25L31 11M5 11V33L11 39" />
      <g transform={direction === "next" ? "translate(36 0) scale(-1 1)" : undefined}>
        <path
          d="M21 14L13 22L21 30"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M23 18L19 22L23 26" stroke="currentColor" strokeOpacity="0.2" />
      </g>
    </svg>
  );
}
