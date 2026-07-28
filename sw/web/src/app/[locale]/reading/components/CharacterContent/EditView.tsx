/*
  파일명: /app/reading/components/CharacterContent/EditView.tsx
  기능: 인물 편집 뷰
  책임: 인물의 조직/성별/이름/설명을 편집하고 삭제한다.
*/ // ------------------------------

"use client";

import { useTranslations } from "next-intl";
import { Trash2, X } from "lucide-react";
import type { CharacterInfo } from "../../types";
import { GENDER_OPTIONS } from "./constants";

interface EditViewProps {
  character: CharacterInfo;
  onUpdate: (id: string, updates: Partial<CharacterInfo>) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

export default function EditView({ character, onUpdate, onDelete, onClose }: EditViewProps) {
  const t = useTranslations("reading.character");
  const names = character.names || [""];

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-text-primary">{t("editCharacter")}</h3>
        <button
          onClick={onClose}
          className="rounded-lg bg-white/5 px-3 py-2 text-sm text-text-secondary hover:bg-white/10"
        >
          {t("done")}
        </button>
      </div>

      <div className="space-y-4">
        {/* 조직 정보 */}
        <div className="rounded-lg bg-white/5 p-3 space-y-3">
          <p className="text-xs font-semibold text-text-secondary">{t("orgInfo")}</p>

          <div>
            <label className="mb-1 block text-xs">{t("orgLabel")}</label>
            <input
              type="text"
              value={character.group || ""}
              onChange={(e) => onUpdate(character.id, { group: e.target.value })}
              placeholder={t("orgPlaceholder")}
              className="w-full rounded-lg bg-white/5 px-3 py-2 text-sm text-text-primary placeholder: focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs">{t("subOrgLabel")}</label>
            <input
              type="text"
              value={character.subgroup || ""}
              onChange={(e) => onUpdate(character.id, { subgroup: e.target.value })}
              placeholder={t("subOrgPlaceholder")}
              className="w-full rounded-lg bg-white/5 px-3 py-2 text-sm text-text-primary placeholder: focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs">{t("rankLabel")}</label>
            <input
              type="text"
              value={character.rank || ""}
              onChange={(e) => onUpdate(character.id, { rank: e.target.value })}
              placeholder={t("rankPlaceholder")}
              className="w-full rounded-lg bg-white/5 px-3 py-2 text-sm text-text-primary placeholder: focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
        </div>

        {/* 성별 */}
        <div>
          <label className="mb-2 block text-xs font-medium text-text-secondary">{t("gender")}</label>
          <div className="flex gap-2">
            {GENDER_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => onUpdate(character.id, { gender: opt.value })}
                className={`flex-1 rounded-lg border py-2 text-xs font-medium transition-colors ${
                  character.gender === opt.value
                    ? opt.color
                    : "border-border bg-white/5  hover:bg-white/10"
                }`}
              >
                {t(opt.key)}
              </button>
            ))}
          </div>
        </div>

        {/* 이름 */}
        <div>
          <label className="mb-2 block text-xs font-medium text-text-secondary">
            {t("nameLabel")}
          </label>
          <div className="space-y-2">
            {names.map((name, i) => (
              <div key={i} className="flex gap-2">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => {
                    const newNames = [...names];
                    newNames[i] = e.target.value;
                    onUpdate(character.id, { names: newNames });
                  }}
                  placeholder={i === 0 ? t("primaryName") : t("aliasName")}
                  className="flex-1 rounded-lg bg-white/5 px-3 py-2 text-sm text-text-primary placeholder: focus:outline-none focus:ring-2 focus:ring-accent"
                />
                {names.length > 1 && (
                  <button
                    onClick={() =>
                      onUpdate(character.id, { names: names.filter((_, idx) => idx !== i) })
                    }
                    className="rounded-lg p-2 hover:bg-white/5 hover:text-text-primary"
                  >
                    <X className="size-4" />
                  </button>
                )}
              </div>
            ))}
            <button
              onClick={() => onUpdate(character.id, { names: [...names, ""] })}
              className="w-full rounded-lg border border-dashed border-border py-2 text-xs hover:border-accent hover:text-accent"
            >
              {t("addName")}
            </button>
          </div>
        </div>

        {/* 설명 */}
        <div>
          <label className="mb-2 block text-xs font-medium text-text-secondary">{t("descriptionLabel")}</label>
          <textarea
            value={character.description || ""}
            onChange={(e) => onUpdate(character.id, { description: e.target.value })}
            placeholder={t("descriptionPlaceholder")}
            className="w-full resize-none rounded-lg bg-white/5 p-3 text-sm leading-relaxed text-text-primary placeholder: focus:outline-none focus:ring-2 focus:ring-accent"
            rows={4}
          />
        </div>

        {/* 삭제 */}
        <button
          onClick={() => {
            if (confirm(t("confirmDelete"))) {
              onDelete(character.id);
              onClose();
            }
          }}
          className="w-full rounded-lg bg-red-500/10 py-2.5 text-sm font-medium text-red-500 hover:bg-red-500/20"
        >
          <div className="flex items-center justify-center gap-2">
            <Trash2 className="size-4" />
            {t("deleteCharacter")}
          </div>
        </button>
      </div>
    </div>
  );
}
