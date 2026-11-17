"use client";

import { useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import { Moon, Sun } from "lucide-react";
import { DEFAULT_THEME, type Theme } from "@/constants/theme";
import { applyTheme, readStoredTheme, subscribeTheme } from "@/lib/theme";

/** 헤더의 해·달 버튼 — 바꿀 쪽 아이콘을 보여 주고 누르면 바꾼다 */
export default function ThemeToggle({ className = "" }: { className?: string }) {
  const t = useTranslations("layout.theme");
  // 서버 HTML은 테마를 모르므로 기본값으로 그리고, 브라우저에서는 저장된 값을 읽는다.
  const theme = useSyncExternalStore(subscribeTheme, readStoredTheme, () => DEFAULT_THEME);

  const next: Theme = theme === "dark" ? "light" : "dark";
  const label = t(next === "light" ? "toLight" : "toDark");
  const Icon = next === "light" ? Sun : Moon;

  return (
    <button
      type="button"
      onClick={() => applyTheme(next, { save: true })}
      aria-label={label}
      title={label}
      className={`w-9 h-9 flex items-center justify-center rounded-lg hover:bg-white/5 active:bg-white/10 text-text-secondary hover:text-text-primary active:text-accent ${className}`}
    >
      <Icon size={18} strokeWidth={1.5} aria-hidden="true" />
    </button>
  );
}
