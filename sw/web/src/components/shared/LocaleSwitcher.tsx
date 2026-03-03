"use client";

import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { Globe } from "lucide-react";
import Button from "@/components/ui/Button";

interface LocaleSwitcherProps {
  /** "icon" = compact globe button (Header), "menu" = full text row (ProfileMenu), "text" = inline link (Footer) */
  variant?: "icon" | "menu" | "text";
  className?: string;
}

export default function LocaleSwitcher({ variant = "icon", className }: LocaleSwitcherProps) {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations("layout.locale");

  const nextLocale = locale === "ko" ? "en" : "ko";

  const handleSwitch = () => {
    router.replace(pathname, { locale: nextLocale });
  };

  if (variant === "icon") {
    return (
      <Button
        unstyled
        onClick={handleSwitch}
        className={`w-9 h-9 flex items-center justify-center rounded-lg hover:bg-white/5 text-text-secondary hover:text-text-primary ${className ?? ""}`}
        title={t("label")}
      >
        <Globe size={20} />
      </Button>
    );
  }

  if (variant === "menu") {
    return (
      <Button
        unstyled
        onClick={handleSwitch}
        className={`flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-white/5 w-full text-text-primary ${className ?? ""}`}
      >
        <Globe size={16} className="text-text-secondary" />
        {t("switchTo")}
      </Button>
    );
  }

  // variant === "text"
  return (
    <Button
      unstyled
      onClick={handleSwitch}
      className={`text-sm text-text-tertiary hover:text-white transition-colors duration-300 ${className ?? ""}`}
    >
      {t("switchTo")}
    </Button>
  );
}
