import Image from "next/image";
import type { CollectionTheme } from "../types";
import styles from "../FactionCollection.module.css";

interface ThemeVisualProps {
  theme: CollectionTheme;
  className?: string;
  presentation?: "card" | "preview";
}

export default function ThemeVisual({
  theme,
  className = "",
  presentation = "card",
}: ThemeVisualProps) {
  const isPreview = presentation === "preview";

  return (
    <div className={`${styles.visual} ${className}`} aria-hidden>
      {theme.coverImage && (
        <Image
          src={theme.coverImage}
          alt=""
          fill
          unoptimized
          sizes="(max-width: 768px) 100vw, 42vw"
          className={`${styles.visualImage} ${isPreview ? styles.previewImage : ""}`}
        />
      )}
      {!theme.coverImage && theme.people.length > 0 && (
        <div className={styles.portraitCollage}>
          {theme.people
            .filter((person) => person.avatar_url)
            .slice(0, 3)
            .map((person) => (
            <span key={person.id} className="relative min-w-0">
              <Image
                src={person.avatar_url!}
                alt=""
                fill
                unoptimized
                sizes="180px"
                className="object-cover"
              />
            </span>
            ))}
        </div>
      )}
      {!isPreview && (
        <>
          <span className={styles.visualWash} />
          <span className={styles.visualGrid} />
        </>
      )}
    </div>
  );
}
