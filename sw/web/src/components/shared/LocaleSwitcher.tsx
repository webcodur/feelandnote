"use client";

import { useState, useEffect, useRef } from "react";
import { useLocale, useTranslations } from "next-intl";
import { getPathname, usePathname } from "@/i18n/navigation";
import { Globe, Check, Hourglass } from "lucide-react";
import { Z_INDEX } from "@/constants/zIndex";

interface LocaleSwitcherProps {
  /** "icon" = compact globe button (Header), "menu" = full text row (ProfileMenu), "text" = inline link (Footer) */
  variant?: "icon" | "menu" | "text";
  className?: string;
}

interface LocaleOption {
  code: string;
  /** 그 언어의 자국어 표기 — 번역 키 없이 그대로 둔다 */
  nativeName: string;
  ready: boolean;
  /** 미지원 언어를 눌렀을 때 그 나라 말로 띄우는 준비중 문구 */
  soonMessage?: string;
}

const LOCALE_OPTIONS: LocaleOption[] = [
  { code: "ko", nativeName: "한국어", ready: true },
  { code: "en", nativeName: "English", ready: true },
  { code: "ja", nativeName: "日本語", ready: false, soonMessage: "準備中です" },
  { code: "zh", nativeName: "简体中文", ready: false, soonMessage: "敬请期待" },
  { code: "es", nativeName: "Español", ready: false, soonMessage: "Próximamente" },
  { code: "fr", nativeName: "Français", ready: false, soonMessage: "Bientôt disponible" },
  { code: "de", nativeName: "Deutsch", ready: false, soonMessage: "Bald verfügbar" },
];

/** 헤더 지구본 버튼 — 드롭다운에서 KO/EN 전환, 미지원 언어는 준비중 안내 */
function LocaleDropdown({ locale, pathname, className, label }: { locale: string; pathname: string; className?: string; label: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [soonMessage, setSoonMessage] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-locale-dropdown]")) setIsOpen(false);
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("click", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("click", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const handleSoon = (message: string) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setSoonMessage(message);
    timerRef.current = setTimeout(() => setSoonMessage(null), 2000);
  };

  return (
    <div className="relative" data-locale-dropdown>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label={label}
        title={label}
        aria-expanded={isOpen}
        className={`w-9 h-9 flex items-center justify-center rounded-lg hover:bg-white/5 active:bg-white/10 text-text-secondary hover:text-text-primary active:text-accent ${className ?? ""}`}
      >
        <Globe size={20} />
      </button>

      {isOpen && (
        <div className="absolute end-0 top-11 w-44 bg-bg-card border border-border rounded-xl shadow-2xl overflow-hidden py-1" style={{ zIndex: Z_INDEX.dropdown }}>
          {LOCALE_OPTIONS.map((option) => {
            const isCurrent = option.code === locale;
            if (option.ready) {
              return (
                <a
                  key={option.code}
                  href={getPathname({ href: pathname, locale: option.code })}
                  hrefLang={option.code}
                  onClick={() => setIsOpen(false)}
                  aria-current={isCurrent || undefined}
                  className={`flex items-center justify-between px-4 py-2.5 text-sm no-underline hover:bg-white/5 ${isCurrent ? "text-accent font-medium" : "text-text-primary"}`}
                >
                  <span>{option.nativeName}</span>
                  {isCurrent && <Check size={14} />}
                </a>
              );
            }
            return (
              <button
                key={option.code}
                type="button"
                onClick={() => handleSoon(option.soonMessage ?? "")}
                className="w-full flex items-center justify-between px-4 py-2 text-[13px] text-text-secondary/40 hover:bg-white/[0.03] hover:text-text-secondary/70"
              >
                <span>{option.nativeName}</span>
                <Hourglass size={12} className="opacity-50" />
              </button>
            );
          })}
          {soonMessage && (
            <div className="px-4 py-2 border-t border-border/40 text-center text-xs text-accent">
              {soonMessage}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function LocaleSwitcher({ variant = "icon", className }: LocaleSwitcherProps) {
  const locale = useLocale();
  const pathname = usePathname();
  const t = useTranslations("layout.locale");
  const targetLocale = locale === "ko" ? "en" : "ko";
  const targetHref = getPathname({ href: pathname, locale: targetLocale });

  if (variant === "icon") {
    return <LocaleDropdown locale={locale} pathname={pathname} className={className} label={t("label")} />;
  }

  if (variant === "menu") {
    return (
      <a
        href={targetHref}
        hrefLang={targetLocale}
        className={`flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-white/5 active:bg-white/10 w-full text-text-primary ${className ?? ""}`}
      >
        <Globe size={16} className="text-text-secondary" />
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
