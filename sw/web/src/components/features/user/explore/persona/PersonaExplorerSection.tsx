"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { Users } from "lucide-react";
import { getPersonaByCelebId } from "@/actions/persona/getPersonaByCelebId";
import type { PersonaPersonSummary } from "@/actions/persona/getPersonaPeople";
import { PROFESSION_LABELS } from "@/lib/persona/constants";
import type { PersonaVector } from "@/lib/persona/utils";
import PersonaInfoPanel from "./PersonaInfoPanel";

interface Props {
  initialPeople: PersonaPersonSummary[];
  initialSelectedId: string | null;
  initialPersona: PersonaVector | null;
}

export default function PersonaExplorerSection({
  initialPeople,
  initialSelectedId,
  initialPersona,
}: Props) {
  const defaultSelectedId = initialSelectedId ?? initialPeople[0]?.id ?? null;
  const [selectedId, setSelectedId] = useState<string | null>(defaultSelectedId);
  const [selectedPersona, setSelectedPersona] = useState<PersonaVector | null>(initialPersona);
  const [isPending, startTransition] = useTransition();
  const requestIdRef = useRef<string | null>(null);

  const selectedPerson = useMemo(
    () => initialPeople.find((person) => person.id === selectedId) ?? null,
    [initialPeople, selectedId],
  );

  const handleSelect = (person: PersonaPersonSummary) => {
    if (person.id === selectedId) return;

    setSelectedId(person.id);
    setSelectedPersona(null);
    requestIdRef.current = person.id;
    startTransition(async () => {
      const next = await getPersonaByCelebId(person.id);
      if (requestIdRef.current !== person.id) return;
      setSelectedPersona(next);
    });
  };

  if (initialPeople.length === 0) {
    return (
      <div className="rounded-lg border border-white/10 bg-bg-card/40 p-8 text-center">
        <p className="text-sm text-text-secondary">표시할 사람 데이터가 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
      <aside className="rounded-lg border border-white/10 bg-bg-card/40 p-3">
        <div className="mb-2 flex items-center gap-2 px-1">
          <Users className="h-4 w-4 text-accent" />
          <h2 className="text-sm font-semibold text-text-primary">사람 목록</h2>
          <span className="text-xs text-text-tertiary">{initialPeople.length}</span>
        </div>
        <div className="max-h-[620px] space-y-1 overflow-y-auto pr-1">
          {initialPeople.map((person) => {
            const active = person.id === selectedId;
            const professionLabel = person.profession ? PROFESSION_LABELS[person.profession] ?? person.profession : "직군 미상";

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
                      <img src={person.avatar_url} alt={person.nickname} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs font-serif">
                        {person.nickname.charAt(0)}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{person.nickname}</p>
                    <p className="truncate text-[11px] text-text-tertiary">{professionLabel}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </aside>

      <section>
        <PersonaInfoPanel person={selectedPerson} persona={selectedPersona} loading={isPending} />
      </section>
    </div>
  );
}
