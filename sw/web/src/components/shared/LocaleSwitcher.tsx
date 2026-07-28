"use client";

import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { Globe, Check } from "lucide-react";
import Button from "@/components/ui/Button";
import { useState, useRef, useEffect } from "react";
import { Z_INDEX } from "@/constants/zIndex";

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

  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const nextLocale = locale === "ko" ? "en" : "ko";

  const handleSwitch = () => {
    router.replace(pathname, { locale: nextLocale });
  };

  const handleLanguageSelect = (newLocale: string) => {
    if (locale !== newLocale) {
      router.replace(pathname, { locale: newLocale });
    }
    setOpen(false);
  };

  if (variant === "icon") {
    return (
      <div className="relative" ref={ref}>
        <Button
          unstyled
          onClick={() => setOpen((prev) => !prev)}
          className={`w-9 h-9 flex items-center justify-center rounded-lg hover:bg-white/5 text-text-secondary hover:text-text-primary ${className ?? ""}`}
          title={t("label")}
        >
          <Globe size={20} />
        </Button>

        {open && (
          <div 
            className="absolute right-0 top-11 w-32 bg-bg-card border border-border rounded-xl shadow-2xl overflow-hidden" 
            style={{ zIndex: Z_INDEX.dropdown }}
          >
            <div className="py-1">
              <button
                onClick={() => handleLanguageSelect("ko")}
                className={`w-full flex items-center justify-between px-4 py-2.5 text-sm hover:bg-white/5 transition-colors ${locale === "ko" ? "text-accent" : "text-text-primary"}`}
              >
                {t("korean")}
                {locale === "ko" && <Check size={16} />}
              </button>
              <button
                onClick={() => handleLanguageSelect("en")}
                className={`w-full flex items-center justify-between px-4 py-2.5 text-sm hover:bg-white/5 transition-colors ${locale === "en" ? "text-accent" : "text-text-primary"}`}
              >
                English
                {locale === "en" && <Check size={16} />}
              </button>
            </div>
          </div>
        )}
      </div>
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
      className={`text-sm  hover:text-white transition-colors duration-300 ${className ?? ""}`}
    >
      {t("switchTo")}
    </Button>
  );
}
