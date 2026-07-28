/*
  파일명: /app/reading/components/CharacterContent/CharacterContent.tsx
  기능: 조직 섹션 콘텐츠 (인물 중심 뷰)
  책임: 인물 리스트와 관계를 간단하게 표시한다.
*/ // ------------------------------

"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Users } from "lucide-react";
import type { CharacterInfo } from "../../types";
import CharacterListPanel from "./CharacterListPanel";
import DetailView from "./DetailView";
import EditView from "./EditView";

interface Props {
  characters: CharacterInfo[];
  onAdd: () => void;
  onUpdate: (id: string, updates: Partial<CharacterInfo>) => void;
  onDelete: (id: string) => void;
}

export default function CharacterContent({
  characters,
  onAdd,
  onUpdate,
  onDelete,
}: Props) {
  const t = useTranslations("reading.character");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [connectingFromId, setConnectingFromId] = useState<string | null>(null);

  const selectedChar = characters.find((c) => c.id === selectedId);

  const handleSelectCharacter = (id: string) => {
    if (connectingFromId && connectingFromId !== id) {
      setSelectedId(id);
    } else {
      setSelectedId(id);
      setEditingId(null);
      setConnectingFromId(null);
    }
  };

  const handleAddRelation = (fromId: string, toId: string, type: string) => {
    const char = characters.find((c) => c.id === fromId);
    if (!char) return;
    const relations = char.relations || [];
    if (relations.some((r) => r.targetId === toId && r.type === type)) return;
    onUpdate(fromId, { relations: [...relations, { targetId: toId, type }] });
    setConnectingFromId(null);
  };

  const handleDeleteRelation = (fromId: string, targetId: string, type: string) => {
    const char = characters.find((c) => c.id === fromId);
    if (!char) return;
    const relations = (char.relations || []).filter(
      (r) => !(r.targetId === targetId && r.type === type)
    );
    onUpdate(fromId, { relations });
  };

  return (
    <div className="flex h-full w-full overflow-hidden">
      {/* 좌측: 인물 리스트 */}
      <CharacterListPanel
        characters={characters}
        selectedId={selectedId}
        connectingFromId={connectingFromId}
        onAdd={onAdd}
        onSelect={handleSelectCharacter}
      />

      {/* 우측: 상세 정보 */}
      <div className="flex-1 bg-[#1a1f27] overflow-y-auto">
        {!selectedChar ? (
          <div className="flex h-full flex-col items-center justify-center text-center p-6">
            <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-accent/10 text-accent">
              <Users className="size-8" />
            </div>
            <h3 className="mb-2 text-lg font-medium text-text-primary">{t("orgChart")}</h3>
            <p className="text-sm max-w-md">
              {t("selectPrompt")}
            </p>
          </div>
        ) : editingId === selectedChar.id ? (
          <EditView
            character={selectedChar}
            onUpdate={onUpdate}
            onDelete={onDelete}
            onClose={() => setEditingId(null)}
          />
        ) : (
          <DetailView
            character={selectedChar}
            characters={characters}
            connectingFromId={connectingFromId}
            onEdit={() => setEditingId(selectedChar.id)}
            onNavigate={setSelectedId}
            onStartConnecting={() => setConnectingFromId(selectedChar.id)}
            onCancelConnecting={() => setConnectingFromId(null)}
            onAddRelation={handleAddRelation}
            onDeleteRelation={handleDeleteRelation}
          />
        )}
      </div>
    </div>
  );
}
