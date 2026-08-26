"use client";

import { useLocale, useTranslations } from "next-intl";
import { getPathname, usePathname } from "@/i18n/navigation";
import { Languages } from "lucide-react";

interface LocaleSwitcherProps {
  /** "icon" = compact globe button (Header), "menu" = full text row (ProfileMenu), "text" = inline link (Footer) */
  variant?: "icon" | "menu" | "text";
  className?: string;
}

export default function LocaleSwitcher({ variant = "icon", className }: LocaleSwitcherProps) {
  const locale = useLocale();
  const pathname = usePathname();
  const t = useTranslations("layout.locale");
  const targetLocale = locale === "ko" ? "en" : "ko";
  const targetHref = getPathname({ href: pathname, locale: targetLocale });

  if (variant === "icon") {
    return (
      <a
        href={targetHref}
        hrefLang={targetLocale}
        aria-label={t("switchTo")}
        title={t("switchTo")}
        className={`w-9 h-9 flex items-center justify-center rounded-lg hover:bg-white/5 active:bg-white/10 text-text-secondary hover:text-text-primary active:text-accent ${className ?? ""}`}
      >
        <Languages size={20} />
      </a>
    );
  }

  if (variant === "menu") {
    return (
      <a
        href={targetHref}
        hrefLang={targetLocale}
        className={`flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-white/5 active:bg-white/10 w-full text-text-primary ${className ?? ""}`}
      >
        <Languages size={16} className="text-text-secondary" />
        {t("switchTo")}
      </a>
    );
  }

  return (
    <a
      href={targetHref}
      hrefLang={targetLocale}
      className={`text-sm hover:text-white active:text-accent ${className ?? ""}`}
    >
      {t("switchTo")}
    </a>
  );
}
