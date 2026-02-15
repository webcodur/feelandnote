"use client";

import type { PersonaPersonSummary } from "@/actions/persona/getPersonaPeople";
import type { PersonaVector } from "@/lib/persona/utils";
import PersonaStatPanel from "@/components/shared/PersonaStatPanel";

interface Props {
  person: PersonaPersonSummary | null;
  persona: PersonaVector | null;
  loading: boolean;
}

export default function PersonaInfoPanel({ person, persona, loading }: Props) {
  const statusText = loading ? "정보 불러오는 중..." : persona ? "인간정보 분석 창" : "인간정보 데이터 없음";

  if (!person) {
    return (
      <div className="rounded-lg border border-white/10 bg-bg-card/40 p-6 text-sm text-text-secondary">
        선택 가능한 사람이 없습니다.
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-white/20 bg-[#d9d9d9]/5 p-3 sm:p-4">
      <div className="rounded border border-white/20 bg-black/25">
        <div className="flex items-center gap-3 border-b border-white/10 bg-black/30 p-3">
          <div className="h-14 w-14 overflow-hidden rounded-sm border border-white/20 bg-bg-secondary">
            {person.avatar_url ? (
              <img src={person.avatar_url} alt={person.nickname} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-xl font-serif text-text-secondary">
                {person.nickname.charAt(0)}
              </div>
            )}
          </div>
          <div className="min-w-0">
            <p className="text-xs text-text-secondary">{person.title || "인물"}</p>
            <h3 className="truncate text-lg font-serif font-bold text-text-primary">{person.nickname}</h3>
            <p className="truncate text-xs text-accent/80">{statusText}</p>
          </div>
        </div>
        <PersonaStatPanel stats={persona} />
      </div>
    </div>
  );
}
