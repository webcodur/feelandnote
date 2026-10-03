"use client";

import { useState } from "react";
import { BookOpenText } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import FigurePersonRows from "@/components/features/celeb/FigurePersonRows";
import type { FigureBookCharacter } from "@/actions/figure-books/getFigureBooks";

/** 그룹마다 처음에 보이는 인물 수 — 넘치면 더보기로 나머지를 연다 */
const INITIAL_VISIBLE = 6;

interface FigureBookCharactersSectionProps {
  characters: FigureBookCharacter[];
}

export default function FigureBookCharactersSection({
  characters,
}: FigureBookCharactersSectionProps) {
  const t = useTranslations("contentDetail");
  const locale = useLocale();
  const [expandedGroups, setExpandedGroups] = useState<ReadonlySet<string>>(new Set());

  const toggleGroup = (relationType: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(relationType)) next.delete(relationType);
      else next.add(relationType);
      return next;
    });
  };

  const groups = [
    {
      relationType: "appearance" as const,
      label: t("fictionCharactersAppearance"),
      characters: characters.filter((character) => character.relationType === "appearance"),
    },
    {
      relationType: "related" as const,
      label: t("fictionCharactersRelated"),
      characters: characters.filter((character) => character.relationType === "related"),
    },
  ].filter((group) => group.characters.length > 0);

  return (
    <div className="space-y-4 pt-4">
      <div className="flex items-start gap-2.5 rounded-lg border border-accent/20 bg-accent/[0.05] px-3 py-2.5">
        <BookOpenText size={16} className="mt-0.5 shrink-0 text-accent" />
        <p className="text-xs leading-relaxed text-text-secondary">
          {t("fictionCharactersIntro")}
        </p>
      </div>

      {groups.map((group) => {
        const expanded = expandedGroups.has(group.relationType);
        const visible = expanded ? group.characters : group.characters.slice(0, INITIAL_VISIBLE);
        const hidden = group.characters.length - visible.length;

        return (
          <section key={group.relationType}>
            <h3 className="mb-2 flex items-center gap-2 text-sm font-black text-text-primary">
              {group.label}
              <span className="font-mono text-xs font-medium text-text-tertiary">
                {group.characters.length}
              </span>
            </h3>
            {/* 얼굴은 초상화 확대, 중앙은 대사 읊기, 우측 단추는 인물 상세 — 공용 행이 맡는다 */}
            <FigurePersonRows
              locale={locale}
              rows={visible.map((character) => ({
                person: {
                  id: character.id,
                  slug: character.slug,
                  listed: true,
                  name: character.nickname,
                  avatarUrl: character.avatarUrl,
                  qid: null,
                },
                subtitle: character.title,
              }))}
            />
            {group.characters.length > INITIAL_VISIBLE && (
              <div className="mt-3 text-center">
                <button
                  type="button"
                  onClick={() => toggleGroup(group.relationType)}
                  className="inline-block rounded-lg border border-white/[0.08] px-4 py-2 text-[13px] text-text-secondary hover:border-accent/40 hover:text-accent"
                >
                  {expanded ? t("showLess") : t("fictionCharactersMore", { count: hidden })}
                </button>
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
