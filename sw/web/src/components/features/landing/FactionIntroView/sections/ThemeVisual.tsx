import Image from "next/image";
import BlurDissolve from "@/components/ui/BlurDissolve";
import type { CollectionTheme } from "../types";
import styles from "../FactionCollection.module.css";

interface ThemeVisualProps {
  theme: CollectionTheme;
  className?: string;
  presentation?: "card" | "preview";
  /** 대표 사진 대신 걸 화보 주소 — 겹창에서 화보를 넘겨 볼 때 쓴다 */
  imageUrl?: string | null;
}

export default function ThemeVisual({
  theme,
  className = "",
  presentation = "card",
  imageUrl,
}: ThemeVisualProps) {
  const isPreview = presentation === "preview";
  const src = imageUrl ?? theme.coverImage;

  /*
    단체샷이 없는 세력은 구성원 얼굴 격자샷으로 대신한다.
    인원에 맞춰 규모를 고른다 — 9명 이상 3×3, 4명 이상 2×2, 그 미만은 인원수대로 세로 분할.
  */
  const gridPeople = theme.people.filter((person) => person.avatar_url);
  const gridCols =
    gridPeople.length >= 9 ? 3 : gridPeople.length >= 4 ? 2 : Math.max(gridPeople.length, 1);
  const gridShown = gridPeople.slice(0, gridCols * gridCols);

  return (
    <div className={`${styles.visual} ${className}`} aria-hidden>
      {src && (
        <>
          {/* 카드 비율이 제각각이라 원본을 꽉 채우면 인물이 잘린다.
              흐린 배경으로 여백을 메우고 전경은 잘림 없이 통째로 건다. */}
          <Image
            key={`backdrop-${src}`}
            src={src}
            alt=""
            fill
            unoptimized
            sizes="(max-width: 768px) 100vw, 42vw"
            className={styles.visualBackdrop}
          />
          <BlurDissolve key={src} className="absolute inset-0">
            <Image
              src={src}
              alt=""
              fill
              unoptimized
              sizes="(max-width: 768px) 100vw, 42vw"
              className={`${styles.visualImage} ${isPreview ? styles.previewImage : styles.containImage}`}
            />
          </BlurDissolve>
        </>
      )}
      {!src && gridShown.length > 0 && (
        <div
          className={styles.portraitCollage}
          style={{ gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))` }}
        >
          {gridShown.map((person) => (
            <span key={person.id} className="relative min-w-0">
              <BlurDissolve className="absolute inset-0">
                <Image
                  src={person.avatar_url!}
                  alt=""
                  fill
                  unoptimized
                  sizes="180px"
                  className="object-cover"
                />
              </BlurDissolve>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
