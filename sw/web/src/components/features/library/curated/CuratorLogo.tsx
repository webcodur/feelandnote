"use client";

import Image from "next/image";
import { useId, useState } from "react";
import { CURATOR_LOGO_PALETTES } from "./curatorLogoPalettes";
import { getCuratorBrand } from "./curatorBrandPalettes";
import { getCuratorLogoUrl } from "./curatorLogos";

const LOGO_SIZES = {
  gallery: { className: "size-28 md:size-40", sizes: "(min-width: 768px) 160px, 112px" },
  card: { className: "size-20 md:size-24", sizes: "(min-width: 768px) 96px, 80px" },
  hero: { className: "size-28 md:size-36", sizes: "(min-width: 768px) 144px, 112px" },
  compact: { className: "size-14", sizes: "56px" },
  inline: { className: "size-12", sizes: "48px" },
} as const;

/** 원본은 보존하고, 정적 분석에 맞는 잉크·양각 표현만 화면에 합성한다. */
export default function CuratorLogo({ slug, name, logoUrl, kind, size = "card" }: {
  slug: string;
  name: string;
  logoUrl?: string | null;
  kind?: string;
  size?: keyof typeof LOGO_SIZES;
}) {
  const src = getCuratorLogoUrl(slug, logoUrl);
  const filterId = `curator-ink-${useId().replace(/:/g, "")}`;
  const palette = CURATOR_LOGO_PALETTES[slug];
  const paper = palette?.treatment === "paper";
  const monochrome = palette?.monochrome;
  const darkMono = monochrome && palette?.treatment === "dark";
  const tone = paper || (monochrome && palette?.treatment === "transparent") || darkMono;
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const brand = getCuratorBrand(slug, kind);
  const dimensions = LOGO_SIZES[size];
  const words = name.trim().split(/\s+/);
  const initials = words.length > 1
    ? words.slice(0, 2).map(word => Array.from(word)[0]).join("")
    : Array.from(name.trim()).slice(0, 2).join("");

  return (
    <span aria-hidden="true" className={`relative inline-flex shrink-0 items-center justify-center ${dimensions.className}`}>
      {tone && <svg width="0" height="0" className="absolute" aria-hidden="true"><defs>
        <filter id={filterId} x="-15%" y="-15%" width="130%" height="130%" colorInterpolationFilters="sRGB">
          {(paper || darkMono) && <>
            <feColorMatrix in="SourceGraphic" result="ink" type="matrix" values={paper
              ? "0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  -0.255 -0.858 -0.087 0 1.2"
              : "0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  .255 .858 .087 0 -.05"} />
            <feComposite in="SourceGraphic" in2="ink" operator="in" result="cut" />
          </>}
          {monochrome ? <feColorMatrix in={paper || darkMono ? "cut" : "SourceGraphic"} type="matrix" values="0 0 0 0 .77  0 0 0 0 .74  0 0 0 0 .68  0 0 0 1 0" /> :
            <feComponentTransfer in="cut">
              <feFuncR type="linear" slope=".5" intercept=".5" />
              <feFuncG type="linear" slope=".5" intercept=".5" />
              <feFuncB type="linear" slope=".5" intercept=".5" />
            </feComponentTransfer>}
          {monochrome && size !== "inline" && <>
            <feDropShadow dx="0" dy="1" stdDeviation="0" floodColor="#ffffff" floodOpacity=".18" />
            <feDropShadow dx="0" dy="3" stdDeviation="1.5" floodColor="#000000" floodOpacity=".85" />
          </>}
        </filter>
      </defs></svg>}
      {src && src !== failedSrc ? (
        <Image src={src} alt="" fill sizes={dimensions.sizes} className="object-contain" style={{
          filter: tone ? `url(#${filterId})` : "drop-shadow(0 2px 1px #000)",
          mixBlendMode: palette?.treatment === "dark" && !darkMono ? "screen" : undefined,
        }} onError={() => setFailedSrc(src)} />
      ) : (
        <span className="flex size-full items-center justify-center rounded-full border text-xl font-semibold md:text-2xl"
          style={{ color: brand.accent, borderColor: `${brand.accent}50`, background: `${brand.primary}30` }}>
          {initials}
        </span>
      )}
    </span>
  );
}
