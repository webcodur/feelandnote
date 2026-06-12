/*
  파일명: /app/reading/components/CharacterContent/DetailView.tsx
  기능: 인물 상세 뷰
  책임: 선택된 인물의 정보와 관계 목록을 표시한다.
*/ // ------------------------------

"use client";

import { useTranslations } from "next-intl";
import { X, ArrowRight, User } from "lucide-react";
import type { CharacterInfo } from "../../types";
import { RELATION_TYPES } from "../../types";
import { GENDER_COLORS } from "./constants";

interface DetailViewProps {
  character: CharacterInfo;
  characters: CharacterInfo[];
  connectingFromId: string | null;
  onEdit: () => void;
  onNavigate: (id: string) => void;
  onStartConnecting: () => void;
  onCancelConnecting: () => void;
  onAddRelation: (fromId: string, toId: string, type: string) => void;
  onDeleteRelation: (fromId: string, toId: string, type: string) => void;
}

export default function DetailView({
  character,
  characters,
  connectingFromId,
  onEdit,
  onNavigate,
  onStartConnecting,
  onCancelConnecting,
  onAddRelation,
  onDeleteRelation,
}: DetailViewProps) {
  const t = useTranslations("reading.character");

  const relations = (character.relations || [])
    .map((rel) => ({
      ...rel,
      target: characters.find((c) => c.id === rel.targetId),
    }))
    .filter((rel) => rel.target);

  const isConnecting = connectingFromId === character.id;

  return (
    <div className="p-6">
      {/* 헤더 */}
      <div className="mb-6 flex items-start justify-between">
        <div className="flex items-start gap-4">
          <div
            className={`flex size-16 items-center justify-center rounded-full border-2 ${
              GENDER_COLORS[character.gender || "unknown"]
            }`}
          >
            <User className="size-8" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-2xl font-bold text-text-primary">
                {character.names?.[0] || t("noName")}
              </h2>
              {character.rank && (
                <span className="rounded-full bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent">
                  {character.rank}
                </span>
              )}
            </div>
            {(character.group || character.subgroup) && (
              <div className="mt-1 flex items-center gap-1 text-xs text-text-secondary">
                {character.group && <span>{character.group}</span>}
                {character.group && character.subgroup && <span>›</span>}
                {character.subgroup && <span>{character.subgroup}</span>}
              </div>
            )}
            {character.names && character.names.length > 1 && (
              <p className="mt-1 text-sm text-text-secondary">
                {t("aliases")}: {character.names.slice(1).join(", ")}
              </p>
            )}
            {character.description && (
              <p className="mt-2 text-sm text-text-tertiary leading-relaxed">
                {character.description}
              </p>
            )}
          </div>
        </div>
        <button
          onClick={onEdit}
          className="rounded-lg bg-white/5 px-3 py-2 text-sm text-text-secondary hover:bg-white/10 hover:text-text-primary"
        >
          {t("edit")}
        </button>
      </div>

      {/* 관계 연결 모드 */}
      {isConnecting && (
        <div className="mb-4 rounded-lg bg-accent/10 border border-accent/30 p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-accent">{t("connectMode")}</p>
            <button
              onClick={onCancelConnecting}
              className="text-text-tertiary hover:text-text-primary"
            >
              <X className="size-4" />
            </button>
          </div>
          <p className="text-xs text-text-tertiary">
            {t("connectPrompt")}
          </p>
        </div>
      )}

      {/* 연결 대상 선택 시 관계 타입 선택 */}
      {connectingFromId && connectingFromId !== character.id && (
        <div className="mb-4 rounded-lg bg-accent/10 border border-accent/30 p-4">
          <p className="text-sm font-medium text-accent mb-3">{t("selectRelationType")}</p>
          <div className="flex flex-wrap gap-2">
            {RELATION_TYPES.map((type) => (
              <button
                key={type}
                onClick={() => onAddRelation(connectingFromId, character.id, type)}
                className="rounded-lg bg-white/5 px-3 py-1.5 text-xs hover:bg-accent/20 hover:text-accent"
              >
                {type}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 관계 목록 */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-text-primary">{t("relations")}</h3>
          <button
            onClick={onStartConnecting}
            className="rounded-lg bg-accent/10 px-3 py-1.5 text-xs font-medium text-accent hover:bg-accent/20"
          >
            {t("addRelation")}
          </button>
        </div>

        {relations.length === 0 ? (
          <div className="rounded-lg bg-white/5 p-6 text-center">
            <p className="text-sm text-text-tertiary">{t("noRelations")}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {relations.map((rel) => (
              <div
                key={`${rel.targetId}-${rel.type}`}
                className="group flex items-center justify-between rounded-lg bg-white/5 p-3 hover:bg-white/10"
              >
                <button
                  onClick={() => onNavigate(rel.targetId)}
                  className="flex flex-1 items-center gap-3 text-left"
                >
                  <div
                    className={`flex size-10 items-center justify-center rounded-full border ${
                      GENDER_COLORS[rel.target!.gender || "unknown"]
                    }`}
                  >
                    <User className="size-5" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-text-primary">
                      {rel.target!.names?.[0] || t("noName")}
                    </p>
                    <p className="text-xs text-text-tertiary">{rel.type}</p>
                  </div>
                  <ArrowRight className="size-4 text-text-tertiary group-hover:text-accent" />
                </button>
                <button
                  onClick={() => onDeleteRelation(character.id, rel.targetId, rel.type)}
                  className="ml-2 rounded p-1 text-text-tertiary opacity-0 group-hover:opacity-100 hover:bg-red-500/10 hover:text-red-500"
                >
                  <X className="size-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
