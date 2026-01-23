/*
  파일명: /app/reading/components/CharacterContent.tsx
  기능: 조직 섹션 콘텐츠 (인물 중심 뷰)
  책임: 인물 리스트와 관계를 간단하게 표시한다.
*/ // ------------------------------

"use client";

import { useState } from "react";
import { Trash2, X, Plus, Users, ArrowRight, User } from "lucide-react";
import type { CharacterInfo, CharacterGender } from "../types";
import { RELATION_TYPES } from "../types";

interface Props {
  characters: CharacterInfo[];
  onAdd: () => void;
  onUpdate: (id: string, updates: Partial<CharacterInfo>) => void;
  onDelete: (id: string) => void;
}

const GENDER_OPTIONS: { value: CharacterGender; label: string; color: string }[] = [
  { value: "male", label: "남", color: "bg-blue-500/20 text-blue-400 border-blue-400" },
  { value: "female", label: "여", color: "bg-pink-500/20 text-pink-400 border-pink-400" },
  { value: "unknown", label: "?", color: "bg-gray-500/20 text-gray-400 border-gray-400" },
];

const GENDER_COLORS = {
  male: "bg-blue-500/10 text-blue-400 border-blue-500/30",
  female: "bg-pink-500/10 text-pink-400 border-pink-500/30",
  unknown: "bg-gray-500/10 text-gray-400 border-gray-500/30",
};

export default function CharacterContent({
  characters,
  onAdd,
  onUpdate,
  onDelete,
}: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [connectingFromId, setConnectingFromId] = useState<string | null>(null);

  const selectedChar = characters.find((c) => c.id === selectedId);

  // 그룹별로 인물 분류
  const groupedCharacters = characters.reduce((acc, char) => {
    const group = char.group || "기타";
    const subgroup = char.subgroup || "미분류";

    if (!acc[group]) acc[group] = {};
    if (!acc[group][subgroup]) acc[group][subgroup] = [];

    acc[group][subgroup].push(char);
    return acc;
  }, {} as Record<string, Record<string, CharacterInfo[]>>);

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
      <div className="w-72 shrink-0 border-r border-border bg-[#1a1f27] flex flex-col">
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-text-primary">인물 목록</h3>
            <span className="text-xs text-text-tertiary">{characters.length}명</span>
          </div>
          <button
            onClick={onAdd}
            className="w-full rounded-lg border border-dashed border-border py-2 text-xs text-text-tertiary hover:border-accent hover:text-accent flex items-center justify-center gap-2"
          >
            <Plus className="size-3" />
            새 인물 추가
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          {characters.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center text-text-tertiary text-xs p-4">
              <Users className="size-8 mb-2 opacity-50" />
              <p>인물을 추가하여 시작하세요</p>
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
                      {Object.values(subgroups).flat().length}명
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
                        {subgroupName !== "미분류" && (
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
                                onClick={() => {
                                  if (connectingFromId && connectingFromId !== char.id) {
                                    setSelectedId(char.id);
                                  } else {
                                    setSelectedId(char.id);
                                    setEditingId(null);
                                    setConnectingFromId(null);
                                  }
                                }}
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
                                        {char.names?.[0] || "이름 없음"}
                                      </p>
                                      {char.rank && (
                                        <span className="text-[10px] text-text-tertiary">
                                          {char.rank}
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-[10px] text-text-tertiary">
                                      관계 {relCount}개
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

      {/* 우측: 상세 정보 */}
      <div className="flex-1 bg-[#1a1f27] overflow-y-auto">
        {!selectedChar ? (
          <div className="flex h-full flex-col items-center justify-center text-center p-6">
            <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-accent/10 text-accent">
              <Users className="size-8" />
            </div>
            <h3 className="mb-2 text-lg font-medium text-text-primary">조직도</h3>
            <p className="text-sm text-text-tertiary max-w-md">
              좌측에서 인물을 선택하여 상세 정보와 관계를 확인하세요
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

// #region 상세 뷰
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

function DetailView({
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
  const [showRelationPicker, setShowRelationPicker] = useState(false);

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
                {character.names?.[0] || "이름 없음"}
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
                별명: {character.names.slice(1).join(", ")}
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
          편집
        </button>
      </div>

      {/* 관계 연결 모드 */}
      {isConnecting && (
        <div className="mb-4 rounded-lg bg-accent/10 border border-accent/30 p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-accent">관계 연결 모드</p>
            <button
              onClick={onCancelConnecting}
              className="text-text-tertiary hover:text-text-primary"
            >
              <X className="size-4" />
            </button>
          </div>
          <p className="text-xs text-text-tertiary">
            좌측에서 연결할 대상을 선택하세요
          </p>
        </div>
      )}

      {/* 연결 대상 선택 시 관계 타입 선택 */}
      {connectingFromId && connectingFromId !== character.id && (
        <div className="mb-4 rounded-lg bg-accent/10 border border-accent/30 p-4">
          <p className="text-sm font-medium text-accent mb-3">관계 유형 선택</p>
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
          <h3 className="text-sm font-semibold text-text-primary">관계</h3>
          <button
            onClick={onStartConnecting}
            className="rounded-lg bg-accent/10 px-3 py-1.5 text-xs font-medium text-accent hover:bg-accent/20"
          >
            + 관계 추가
          </button>
        </div>

        {relations.length === 0 ? (
          <div className="rounded-lg bg-white/5 p-6 text-center">
            <p className="text-sm text-text-tertiary">아직 관계가 없습니다</p>
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
                      {rel.target!.names?.[0] || "이름 없음"}
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
// #endregion

// #region 편집 뷰
interface EditViewProps {
  character: CharacterInfo;
  onUpdate: (id: string, updates: Partial<CharacterInfo>) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

function EditView({ character, onUpdate, onDelete, onClose }: EditViewProps) {
  const names = character.names || [""];

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-text-primary">인물 편집</h3>
        <button
          onClick={onClose}
          className="rounded-lg bg-white/5 px-3 py-2 text-sm text-text-secondary hover:bg-white/10"
        >
          완료
        </button>
      </div>

      <div className="space-y-4">
        {/* 조직 정보 */}
        <div className="rounded-lg bg-white/5 p-3 space-y-3">
          <p className="text-xs font-semibold text-text-secondary">조직 정보</p>

          <div>
            <label className="mb-1 block text-xs text-text-tertiary">소속 조직</label>
            <input
              type="text"
              value={character.group || ""}
              onChange={(e) => onUpdate(character.id, { group: e.target.value })}
              placeholder="예: 조선군, 왜군"
              className="w-full rounded-lg bg-white/5 px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs text-text-tertiary">세부 조직</label>
            <input
              type="text"
              value={character.subgroup || ""}
              onChange={(e) => onUpdate(character.id, { subgroup: e.target.value })}
              placeholder="예: 이순신 휘하, 권율 휘하"
              className="w-full rounded-lg bg-white/5 px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs text-text-tertiary">직급/계급</label>
            <input
              type="text"
              value={character.rank || ""}
              onChange={(e) => onUpdate(character.id, { rank: e.target.value })}
              placeholder="예: 장군, 병사, 수령"
              className="w-full rounded-lg bg-white/5 px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
        </div>

        {/* 성별 */}
        <div>
          <label className="mb-2 block text-xs font-medium text-text-secondary">성별</label>
          <div className="flex gap-2">
            {GENDER_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => onUpdate(character.id, { gender: opt.value })}
                className={`flex-1 rounded-lg border py-2 text-xs font-medium transition-colors ${
                  character.gender === opt.value
                    ? opt.color
                    : "border-border bg-white/5 text-text-tertiary hover:bg-white/10"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* 이름 */}
        <div>
          <label className="mb-2 block text-xs font-medium text-text-secondary">
            이름 / 호칭
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
                  placeholder={i === 0 ? "대표 이름" : "별명/호칭"}
                  className="flex-1 rounded-lg bg-white/5 px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent"
                />
                {names.length > 1 && (
                  <button
                    onClick={() =>
                      onUpdate(character.id, { names: names.filter((_, idx) => idx !== i) })
                    }
                    className="rounded-lg p-2 text-text-tertiary hover:bg-white/5 hover:text-text-primary"
                  >
                    <X className="size-4" />
                  </button>
                )}
              </div>
            ))}
            <button
              onClick={() => onUpdate(character.id, { names: [...names, ""] })}
              className="w-full rounded-lg border border-dashed border-border py-2 text-xs text-text-tertiary hover:border-accent hover:text-accent"
            >
              + 이름 추가
            </button>
          </div>
        </div>

        {/* 설명 */}
        <div>
          <label className="mb-2 block text-xs font-medium text-text-secondary">설명</label>
          <textarea
            value={character.description || ""}
            onChange={(e) => onUpdate(character.id, { description: e.target.value })}
            placeholder="인물에 대한 설명을 입력하세요..."
            className="w-full resize-none rounded-lg bg-white/5 p-3 text-sm leading-relaxed text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent"
            rows={4}
          />
        </div>

        {/* 삭제 */}
        <button
          onClick={() => {
            if (confirm("정말 이 인물을 삭제하시겠습니까?")) {
              onDelete(character.id);
              onClose();
            }
          }}
          className="w-full rounded-lg bg-red-500/10 py-2.5 text-sm font-medium text-red-500 hover:bg-red-500/20"
        >
          <div className="flex items-center justify-center gap-2">
            <Trash2 className="size-4" />
            인물 삭제
          </div>
        </button>
      </div>
    </div>
  );
}
// #endregion
