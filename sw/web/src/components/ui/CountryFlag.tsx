"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import dynamic from "next/dynamic";
import { getCountryFlagCode } from "@/lib/utils/countryFlag";
import { getCountryNameByLocale } from "@/lib/countries";
import CountryFlagImage from "./CountryFlagImage";

const CountryFlagModal = dynamic(() => import("./CountryFlagModal"));

interface Props {
  code: string | null | undefined;
  label?: string;
  className?: string;
}

// 국기 안내 버튼은 선택·이동 버튼과 나란히 배치한다.
export default function CountryFlag({ code, label, className = "" }: Props) {
  const locale = useLocale();
  const t = useTranslations("shared.countryFlag");
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const wasOpen = useRef(false);
  useEffect(() => {
    if (!isOpen && wasOpen.current) buttonRef.current?.focus({ preventScroll: true });
    wasOpen.current = isOpen;
  }, [isOpen]);
  const flagCode = getCountryFlagCode(code);
  if (!flagCode) return null;
  const name = label ?? getCountryNameByLocale(flagCode, locale);
  const actionLabel = t("open", { country: name });

  return <>
    <button ref={buttonRef} type="button" aria-label={actionLabel} title={actionLabel} aria-haspopup="dialog" aria-expanded={isOpen}
      onClick={event => { event.preventDefault(); event.stopPropagation(); setIsOpen(true); }}
      className={`inline-flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-control hover:bg-white/10 outline-none focus-visible:ring-2 focus-visible:ring-accent ${className}`}>
      <CountryFlagImage code={flagCode} />
    </button>
    {isOpen && <CountryFlagModal code={flagCode} name={name} onClose={() => setIsOpen(false)} />}
  </>;
}
