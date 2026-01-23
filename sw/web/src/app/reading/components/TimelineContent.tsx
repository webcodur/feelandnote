/*
  파일명: /app/reading/components/TimelineContent.tsx
  기능: 타임라인 섹션 컴포넌트
  책임: 시간순 이벤트를 시각화하여 표시
*/ // ------------------------------

"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2, Calendar } from "lucide-react";
import type { TimelineEvent } from "../types";

interface Props {
  events: TimelineEvent[];
  onUpdate: (events: TimelineEvent[]) => void;
}

// 카테고리별 색상
const CATEGORY_COLORS: Record<string, string> = {
  정치: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  경제: "bg-green-500/20 text-green-400 border-green-500/30",
  사회: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  문화: "bg-pink-500/20 text-pink-400 border-pink-500/30",
  전쟁: "bg-red-500/20 text-red-400 border-red-500/30",
  기타: "bg-gray-500/20 text-gray-400 border-gray-500/30",
};

const getEventColor = (category?: string) =>
  category ? CATEGORY_COLORS[category] || CATEGORY_COLORS.기타 : CATEGORY_COLORS.기타;

export default function TimelineContent({ events, onUpdate }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<TimelineEvent>>({});

  const selectedEvent = events.find((e) => e.id === selectedId);
  const editingEvent = events.find((e) => e.id === editingId);

  const handleAdd = () => {
    const newEvent: TimelineEvent = {
      id: `event-${Date.now()}`,
      date: "",
      title: "새 이벤트",
      description: "",
      category: "기타",
    };
    onUpdate([...events, newEvent]);
    setSelectedId(newEvent.id);
    setEditingId(newEvent.id);
    setEditForm(newEvent);
  };

  const handleEdit = (event: TimelineEvent) => {
    setEditingId(event.id);
    setEditForm({ ...event });
  };

  const handleSave = () => {
    if (!editingId || !editForm.date || !editForm.title) return;

    onUpdate(
      events.map((e) =>
        e.id === editingId ? { ...e, ...editForm } as TimelineEvent : e
      )
    );
    setEditingId(null);
    setEditForm({});
  };

  const handleCancel = () => {
    if (editingEvent && !editingEvent.date && !editingEvent.title) {
      onUpdate(events.filter((e) => e.id !== editingId));
      setSelectedId(null);
    }
    setEditingId(null);
    setEditForm({});
  };

  const handleDelete = (id: string) => {
    if (!confirm("이 이벤트를 삭제하시겠습니까?")) return;
    onUpdate(events.filter((e) => e.id !== id));
    if (selectedId === id) setSelectedId(null);
    if (editingId === id) {
      setEditingId(null);
      setEditForm({});
    }
  };

  // 날짜순 정렬
  const sortedEvents = [...events].sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div className="flex h-full gap-3">
      {/* 왼쪽: 타임라인 리스트 */}
      <div className="flex-1 flex flex-col gap-2 overflow-y-auto custom-scrollbar">
        <button
          onClick={handleAdd}
          className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-accent/30 bg-accent/5 py-2 text-xs font-medium text-accent hover:border-accent/50 hover:bg-accent/10"
        >
          <Plus className="size-3.5" />
          이벤트 추가
        </button>

        {sortedEvents.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center">
            <Calendar className="size-8 text-text-tertiary/30" />
            <p className="text-xs text-text-secondary">이벤트가 없습니다</p>
          </div>
        ) : (
          <div className="space-y-2">
            {sortedEvents.map((event, idx) => {
              const colorClass = getEventColor(event.category);
              const isSelected = selectedId === event.id;

              return (
                <div key={event.id} className="flex gap-2">
                  {/* 타임라인 바 */}
                  <div className="flex flex-col items-center pt-1">
                    <div className={`size-2 rounded-full ${colorClass} border`} />
                    {idx < sortedEvents.length - 1 && (
                      <div className="w-px flex-1 bg-border mt-1" />
                    )}
                  </div>

                  {/* 이벤트 카드 */}
                  <button
                    onClick={() => setSelectedId(event.id)}
                    className={`flex-1 rounded-lg border p-2 text-left transition-all ${
                      isSelected
                        ? "border-accent bg-accent/10"
                        : "border-border bg-white/5 hover:border-white/20 hover:bg-white/10"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <span className="text-xs text-text-secondary">{event.date}</span>
                      {event.category && (
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-medium border ${colorClass}`}
                        >
                          {event.category}
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-medium text-text-primary line-clamp-1">
                      {event.title}
                    </p>
                    {event.description && (
                      <p className="mt-1 text-xs text-text-secondary line-clamp-2">
                        {event.description}
                      </p>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 오른쪽: 상세/편집 뷰 */}
      <div className="w-64 flex flex-col rounded-lg border border-border bg-[#1a1f27] p-3 overflow-y-auto custom-scrollbar">
        {!selectedEvent ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center">
            <Calendar className="size-8 text-text-tertiary/30" />
            <p className="text-xs text-text-secondary">
              이벤트를 선택하여
              <br />
              상세 정보를 확인하세요
            </p>
          </div>
        ) : editingId === selectedEvent.id ? (
          // 편집 모드
          <div className="flex flex-col gap-3">
            <p className="text-xs font-semibold text-text-secondary">이벤트 편집</p>

            <div className="space-y-2">
              <label className="text-[11px] text-text-secondary">날짜/시점</label>
              <input
                type="text"
                value={editForm.date || ""}
                onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                placeholder="예: 1592년 4월"
                className="w-full rounded-lg border border-border bg-black/30 px-2 py-1.5 text-xs text-text-primary placeholder:text-text-tertiary/30 focus:border-accent focus:outline-none"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[11px] text-text-secondary">제목</label>
              <input
                type="text"
                value={editForm.title || ""}
                onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                placeholder="이벤트 제목"
                className="w-full rounded-lg border border-border bg-black/30 px-2 py-1.5 text-xs text-text-primary placeholder:text-text-tertiary/30 focus:border-accent focus:outline-none"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[11px] text-text-secondary">설명</label>
              <textarea
                value={editForm.description || ""}
                onChange={(e) =>
                  setEditForm({ ...editForm, description: e.target.value })
                }
                placeholder="상세 설명"
                rows={4}
                className="w-full resize-none rounded-lg border border-border bg-black/30 px-2 py-1.5 text-xs text-text-primary placeholder:text-text-tertiary/30 focus:border-accent focus:outline-none custom-scrollbar"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[11px] text-text-secondary">카테고리</label>
              <select
                value={editForm.category || "기타"}
                onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                className="w-full rounded-lg border border-border bg-black/30 px-2 py-1.5 text-xs text-text-primary focus:border-accent focus:outline-none"
              >
                {Object.keys(CATEGORY_COLORS).map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={handleSave}
                disabled={!editForm.date || !editForm.title}
                className="flex-1 rounded-lg bg-accent py-2 text-xs font-medium text-white hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed"
              >
                저장
              </button>
              <button
                onClick={handleCancel}
                className="flex-1 rounded-lg border border-border bg-white/5 py-2 text-xs font-medium text-text-primary hover:bg-white/10"
              >
                취소
              </button>
            </div>
          </div>
        ) : (
          // 상세 보기 모드
          <div className="flex flex-col gap-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs text-text-secondary mb-1">{selectedEvent.date}</p>
                <h3 className="text-base font-bold text-text-primary">
                  {selectedEvent.title}
                </h3>
              </div>
              {selectedEvent.category && (
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-medium border ${getEventColor(
                    selectedEvent.category
                  )}`}
                >
                  {selectedEvent.category}
                </span>
              )}
            </div>

            {selectedEvent.description && (
              <div className="rounded-lg bg-white/5 p-2">
                <p className="text-xs text-text-secondary leading-relaxed whitespace-pre-wrap">
                  {selectedEvent.description}
                </p>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => handleEdit(selectedEvent)}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-border bg-white/5 py-2 text-xs font-medium text-text-primary hover:bg-white/10"
              >
                <Pencil className="size-3" />
                편집
              </button>
              <button
                onClick={() => handleDelete(selectedEvent.id)}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 py-2 text-xs font-medium text-red-400 hover:bg-red-500/20"
              >
                <Trash2 className="size-3" />
                삭제
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
