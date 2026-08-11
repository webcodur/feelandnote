"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { Users } from "lucide-react";
import { getSpectrumByCelebId } from "@/actions/spectrum/getSpectrumByCelebId";
import type { SpectrumPersonSummary } from "@/actions/spectrum/getSpectrumPeople";
import { PROFESSION_LABELS } from "@/lib/spectrum/constants";
import type { SpectrumVector } from "@/lib/spectrum/utils";
import CelebImage from "@/components/ui/CelebImage";
import SpectrumInfoPanel from "./SpectrumInfoPanel";
import { useTranslations } from "next-intl";

interface Props {
  initialPeople: SpectrumPersonSummary[];
  initialSelectedId: string | null;
  initialSpectrum: SpectrumVector | null;
}

export default function SpectrumExplorerSection({
  initialPeople,
  initialSelectedId,
  initialSpectrum,
}: Props) {
  const t = useTranslations("explore.ui");
  const defaultSelectedId = initialSelectedId ?? initialPeople[0]?.id ?? null;
  const [selectedId, setSelectedId] = useState<string | null>(defaultSelectedId);
  const [selectedSpectrum, setSelectedSpectrum] = useState<SpectrumVector | null>(initialSpectrum);
  const [isPending, startTransition] = useTransition();
  const requestIdRef = useRef<string | null>(null);

  const selectedPerson = useMemo(
    () => initialPeople.find((person) => person.id === selectedId) ?? null,
    [initialPeople, selectedId],
  );

  const handleSelect = (person: SpectrumPersonSummary) => {
    if (person.id === selectedId) return;

    setSelectedId(person.id);
    setSelectedSpectrum(null);
    requestIdRef.current = person.id;
    startTransition(async () => {
      const next = await getSpectrumByCelebId(person.id);
      if (requestIdRef.current !== person.id) return;
      setSelectedSpectrum(next);
    });
  };

  if (initialPeople.length === 0) {
    return (
      <div className="rounded-lg border border-white/10 bg-bg-card/40 p-8 text-center">
        <p className="text-sm text-text-secondary">{t("spectrumNoData")}</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
      <aside className="rounded-lg border border-white/10 bg-bg-card/40 p-3">
        <div className="mb-2 flex items-center gap-2 px-1">
          <Users className="h-4 w-4 text-accent" />
          <h2 className="text-sm font-semibold text-text-primary">{t("spectrumList")}</h2>
          <span className="text-xs">{initialPeople.length}</span>
        </div>
        <div className="max-h-[620px] space-y-1 overflow-y-auto pr-1">
          {initialPeople.map((person) => {
            const active = person.id === selectedId;
            const professionLabel = person.profession ? PROFESSION_LABELS[person.profession] ?? person.profession : t("professionUnknown");

            return (
              <button
                key={person.id}
                type="button"
                onClick={() => handleSelect(person)}
                className={`w-full rounded-md border px-2.5 py-2 text-left ${
                  active
                    ? "border-accent/60 bg-accent/10 text-text-primary"
                    : "border-white/10 bg-black/20 text-text-secondary hover:bg-black/35"
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 overflow-hidden rounded-full border border-white/15 bg-bg-secondary">
                    {person.avatar_url ? (
                      <CelebImage src={person.avatar_url} alt={person.nickname} shape="circle" sizes="32px" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs font-serif">
                        {person.nickname.charAt(0)}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{person.nickname}</p>
                    <p className="truncate text-[11px]">{professionLabel}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </aside>

      <section>
        <SpectrumInfoPanel person={selectedPerson} spectrum={selectedSpectrum} loading={isPending} />
      </section>
    </div>
  );
}
