import type { CSSProperties, ReactNode } from "react";
import { ArrowUpRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { factionThemeHref } from "./utils";
import type { CollectionTheme } from "./types";

interface ThemeActionProps {
  theme: CollectionTheme;
  onPreview: (theme: CollectionTheme) => void;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
  previewLabel: string;
  pageLabel: string;
  shortcutClassName?: string;
}

export default function ThemeAction({
  theme,
  onPreview,
  className,
  style,
  children,
  previewLabel,
  pageLabel,
  shortcutClassName,
}: ThemeActionProps) {
  const baseClassName = cn("group text-start", className);

  if (!theme.tag.is_featured) {
    return (
      <div
        className={cn(baseClassName, "cursor-not-allowed opacity-50")}
        style={style}
        aria-disabled="true"
      >
        {children}
      </div>
    );
  }

  return (
    <div
      className={baseClassName}
      style={style}
    >
      {children}
      <button
        type="button"
        className="absolute inset-0 z-10 cursor-zoom-in focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-accent"
        aria-label={`${theme.name}: ${previewLabel}`}
        onClick={() => onPreview(theme)}
      />
      <Link
        href={factionThemeHref(theme)}
        className={cn(
          "absolute z-20 inline-flex size-9 items-center justify-center rounded-full border border-white/25 bg-black/70 text-white shadow-lg backdrop-blur-md hover:border-accent hover:bg-accent hover:text-black",
          shortcutClassName,
        )}
        aria-label={`${theme.name}: ${pageLabel}`}
      >
        <ArrowUpRight size={16} />
      </Link>
    </div>
  );
}
