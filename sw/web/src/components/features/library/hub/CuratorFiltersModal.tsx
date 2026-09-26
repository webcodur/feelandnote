"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Modal from "@/components/ui/Modal";
import { getCountryNameByLocale } from "@/lib/countries";

export default function CuratorFiltersModal({ kind, topic, country, kinds, topics, countries, onChange, onClose }: {
  kind: string;
  topic: string;
  country: string;
  kinds: string[];
  topics: string[];
  countries: string[];
  onChange: (key: "kind" | "topic" | "country", value: string) => void;
  onClose: () => void;
}) {
  const t = useTranslations("library.curated");
  const ui = useTranslations("home.ui");
  const locale = useLocale();
  const [active, setActive] = useState<"kind" | "topic" | "country">("kind");
  const label = (value: string) => {
    if (value === "all") return t("filterAll");
    if (active === "country") return getCountryNameByLocale(value, locale);
    if (active === "kind") return t(`kind.${value}`);
    return t.has(`topicLabel.${value}`) ? t(`topicLabel.${value}`) : value;
  };
  const countryOptions = [...countries].sort((a, b) => getCountryNameByLocale(a, locale).localeCompare(getCountryNameByLocale(b, locale), locale));
  const options = ["all", ...(active === "kind" ? kinds : active === "country" ? countryOptions : topics)];
  return (
    <Modal isOpen onClose={onClose} title={ui("compactFilters.open")} titleClassName="text-center" size="lg" animateHeightDuration={200}>
      <div className="grid grid-cols-3 gap-2 border-b border-white/10 p-3">
        {(["kind", "topic", "country"] as const).map(value => (
          <button key={value} type="button" aria-pressed={active === value} onClick={() => setActive(value)} className={`min-h-11 rounded-md border px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-accent ${active === value ? "border-accent/30 bg-accent/10 text-accent hover:bg-accent/20" : "border-white/15 text-text-secondary hover:border-white/35 hover:bg-white/5"}`}>
            {t(value === "kind" ? "filterKind" : value === "country" ? "filterCountry" : "filterTopic")}
          </button>
        ))}
      </div>
      <div className="max-h-[48vh] min-h-64 space-y-1 overflow-y-auto p-3">
        {options.map(value => {
          const selected = value === (active === "kind" ? kind : active === "country" ? country : topic);
          return <button key={value} type="button" aria-pressed={selected} onClick={() => onChange(active, value)} className={`flex min-h-11 w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm outline-none focus-visible:ring-2 focus-visible:ring-accent ${selected ? "bg-accent/10 text-accent hover:bg-accent/20" : "text-text-primary hover:bg-white/5"}`}>
            <span className="flex-1">{label(value)}</span>{selected && <Check size={15} aria-hidden />}
          </button>;
        })}
      </div>
    </Modal>
  );
}
