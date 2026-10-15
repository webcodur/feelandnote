"use client";

import { useState } from "react";
import { UserRound } from "lucide-react";
import CelebAvatarImage from "@/components/ui/CelebAvatarImage";
import BlurDissolve from "@/components/ui/BlurDissolve";
import { cn } from "@/lib/utils";
import styles from "./PortraitCardImage.module.css";

interface Props {
  portraitSrc?: string | null;
  alternateSrc?: string | null;
  avatarSrc?: string | null;
  name: string;
  decorative?: boolean;
  imageClassName?: string;
}

/** 사진·아바타·이니셜이 같은 4:5 틀을 유지한다. 실패한 주소는 현재 후보 안에서만 기억한다. */
export default function PortraitCardImage({ portraitSrc, alternateSrc, avatarSrc, name, decorative = false, imageClassName }: Props) {
  const candidates = [portraitSrc?.trim(), alternateSrc?.trim(), avatarSrc?.trim()];
  const key = JSON.stringify(candidates);
  const [failed, setFailed] = useState<{ key: string; urls: string[] }>({ key, urls: [] });
  const failures = failed.key === key ? failed.urls : [];
  const avatar = candidates[2];
  const photo = candidates.slice(0, 2).find(url => url && url !== avatar && !failures.includes(url));
  const src = photo || (avatar && !failures.includes(avatar) ? avatar : undefined);
  const kind = photo ? "photo" : src ? "avatar" : "initials";
  const initial = name.trim().split(/\s+/).slice(0, 2).map(word => Array.from(word)[0] ?? "").join("").toLocaleUpperCase();

  const onError = () => {
    if (!src) return;
    setFailed(previous => {
      const urls = previous.key === key ? previous.urls : [];
      return urls.includes(src) ? previous : { key, urls: [...urls, src] };
    });
  };

  return (
    <div className={cn(styles.root, kind !== "photo" && styles.fallback)} data-portrait-source={kind}>
      {src && (
        <BlurDissolve key={src} className="absolute inset-0">
          <CelebAvatarImage src={src} alt={decorative ? "" : name} draggable={false} onError={onError}
            className={cn(kind === "photo" ? "object-cover object-top" : styles.avatarImage, imageClassName)} />
        </BlurDissolve>
      )}
      {!src && (
        <span className={styles.monogram} aria-hidden="true">
          {initial && initial}
          {!initial && <UserRound className={styles.emptyGlyph} strokeWidth={1} />}
        </span>
      )}
    </div>
  );
}
