/*
  파일명: /app/reading/components/CharacterContent/CharacterListPanel.tsx
  기능: 인물 리스트 패널
  책임: 그룹/서브그룹별 인물 카드 목록을 표시한다.
*/ // ------------------------------

"use client";

import { useTranslations } from "next-intl";
import { Plus, Users, User } from "lucide-react";
import type { CharacterInfo } from "../../types";
import { GENDER_COLORS } from "./constants";

interface Props {
  characters: CharacterInfo[];
  selectedId: string | null;
  connectingFromId: string | null;
  onAdd: () => void;
  onSelect: (id: string) => void;
}

export default function CharacterListPanel({
  characters,
  selectedId,
  connectingFromId,
  onAdd,
  onSelect,
}: Props) {
  const t = useTranslations("reading.character");

  // 그룹별로 인물 분류
  const groupedCharacters = characters.reduce((acc, char) => {
    const group = char.group || t("other");
    const subgroup = char.subgroup || t("uncategorized");

    if (!acc[group]) acc[group] = {};
    if (!acc[group][subgroup]) acc[group][subgroup] = [];

    acc[group][subgroup].push(char);
    return acc;
  }, {} as Record<string, Record<string, CharacterInfo[]>>);

  return (
    <div className="w-72 shrink-0 border-r border-border bg-[#1a1f27] flex flex-col">
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-text-primary">{t("characterList")}</h3>
          <span className="text-xs text-text-tertiary">{t("personCount", { count: characters.length })}</span>
        </div>
        <button
          onClick={onAdd}
          className="w-full rounded-lg border border-dashed border-border py-2 text-xs text-text-tertiary hover:border-accent hover:text-accent flex items-center justify-center gap-2"
        >
          <Plus className="size-3" />
          {t("addCharacter")}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {characters.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-text-tertiary text-xs p-4">
            <Users className="size-8 mb-2 opacity-50" />
            <p>{t("startPrompt")}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(groupedCharacters).map(([groupName, subgroups]) => (
              <div
                key={groupName}
                className="rounded-xl border-2 border-accent/20 bg-accent/5 p-3"
              >
                {/* 그룹 헤더 */}
                <div className="mb-3 flex items-center justify-between">
                  <h4 className="text-sm font-bold text-accent">{groupName}</h4>
                  <span className="text-xs text-accent/70">
                    {t("personCount", { count: Object.values(subgroups).flat().length })}
                  </span>
                </div>

                {/* 서브그룹들 */}
                <div className="space-y-3">
                  {Object.entries(subgroups).map(([subgroupName, chars]) => (
                    <div
                      key={`${groupName}-${subgroupName}`}
                      className="rounded-lg border border-border bg-[#1a1f27] p-2"
                    >
                      {/* 서브그룹 헤더 */}
                      {subgroupName !== t("uncategorized") && (
                        <div className="mb-2 px-2 py-1">
                          <p className="text-xs font-semibold text-text-secondary">
                            {subgroupName}
                          </p>
                        </div>
                      )}

                      {/* 인물 카드들 */}
                      <div className="space-y-1">
                        {chars.map((char) => {
                          const isSelected = selectedId === char.id;
                          const isConnecting = connectingFromId === char.id;
                          const relCount = (char.relations || []).length;

                          return (
                            <button
                              key={char.id}
                              onClick={() => onSelect(char.id)}
                              className={`w-full rounded-lg border p-2 text-left transition-all ${
                                isSelected
                                  ? "border-accent bg-accent/10"
                                  : isConnecting
                                    ? "border-accent/50 bg-accent/5 ring-2 ring-accent/20"
                                    : "border-transparent bg-white/5 hover:bg-white/10 hover:border-border"
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <div
                                  className={`flex size-7 shrink-0 items-center justify-center rounded-full border ${
                                    GENDER_COLORS[char.gender || "unknown"]
                                  }`}
                                >
                                  <User className="size-3.5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-baseline gap-2">
                                    <p className="text-xs font-medium text-text-primary truncate">
                                      {char.names?.[0] || t("noName")}
                                    </p>
                                    {char.rank && (
                                      <span className="text-[10px] text-text-tertiary">
                                        {char.rank}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[10px] text-text-tertiary">
                                    {t("relationsCount", { count: relCount })}
                                  </p>
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
