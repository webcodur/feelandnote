import type { ReactNode } from "react";
import {
  Atom, AudioWaveform, Clapperboard, Crown, Feather, Gem, Sparkles, Trophy,
  type LucideIcon,
} from "lucide-react";
import {
  getCelebThemeStyle,
  type CelebThemeId,
  type ResolvedCelebTheme,
} from "@/lib/celeb/theme";
import styles from "./CelebTheme.module.css";

const THEME_ICONS: { readonly [key in CelebThemeId]: LucideIcon } = {
  regalia: Crown,
  archive: Feather,
  orbit: Atom,
  stage: Clapperboard,
  resonance: AudioWaveform,
  venture: Gem,
  arena: Trophy,
  mythic: Sparkles,
};

interface CelebThemeScopeProps {
  children: ReactNode;
  theme: ResolvedCelebTheme;
  className?: string;
}

export function CelebThemeScope({ children, theme, className = "" }: CelebThemeScopeProps) {
  return (
    <div
      className={`${styles.scope} ${className}`}
      data-celeb-theme={theme.id}
      data-celeb-era={theme.era}
      data-celeb-variation={theme.variation}
      style={getCelebThemeStyle(theme)}
    >
      {children}
    </div>
  );
}

interface CelebThemeHeroProps {
  title: ReactNode;
  subtitle: string;
  theme: ResolvedCelebTheme;
  compact?: boolean;
}

export function CelebThemeHero({ title, subtitle, theme, compact = false }: CelebThemeHeroProps) {
  const Icon = THEME_ICONS[theme.id];
  return (
    <header
      className={`${styles.hero} ${compact ? styles.compact : ""}`}
      data-theme-motif={theme.id}
    >
      <div className={styles.light} />
      <div className={styles.orbitOuter} />
      <div className={styles.orbitInner} />
      <Icon className={styles.icon} strokeWidth={0.85} aria-hidden="true" />
      <div className={styles.copy}>
        <p className={styles.title}>{title}</p>
        <p className={styles.subtitle}>{subtitle}</p>
      </div>
      <span className={styles.themeMark} aria-hidden="true">
        {theme.labelEn}
      </span>
    </header>
  );
}
