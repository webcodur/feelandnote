/*
  파일명: /app/reading/components/SectionWindow/SectionWindow.tsx
  기능: 드래그 & 리사이즈 가능한 섹션 윈도우
  책임: 각 섹션 타입별 콘텐츠를 표시하는 윈도우를 제공한다.
*/ // ------------------------------

"use client";

import { useCallback } from "react";
import { useTranslations } from "next-intl";
import { X, Maximize2, Minimize2, FileText, Users, Image, Calendar, Network, Table as TableIcon, BookText } from "lucide-react";
import { compressImage } from "./compressImage";
import { useWindowControls } from "./useWindowControls";
import SectionBody from "./SectionBody";
import type { Section, CharacterInfo } from "../../types";

interface Props {
  section: Section;
  isActive?: boolean;
  onFocus?: () => void;
  onUpdate: (updates: Partial<Section>) => void;
  onClose: () => void;
  // 인물 섹션용
  onAddCharacter?: () => void;
  onUpdateCharacter?: (characterId: string, updates: Partial<CharacterInfo>) => void;
  onDeleteCharacter?: (characterId: string) => void;
}

export default function SectionWindow({
  section,
  isActive,
  onFocus,
  onUpdate,
  onClose,
  onAddCharacter,
  onUpdateCharacter,
  onDeleteCharacter,
}: Props) {
  const t = useTranslations("reading.section");
  const { position, size } = section;
  const { containerRef, isMaximized, handleDragStart, handleResizeStart, handleMaximize } =
    useWindowControls({ position, size, onUpdate });

  // #region 이미지 붙여넣기 (압축 적용)
  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      if (section.type !== "image") return;

      const items = e.clipboardData?.items;
      if (!items) return;

      for (const item of items) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) {
            compressImage(file, 800, 0.7).then((compressedUrl) => {
              onUpdate({
                data: { type: "image", imageUrl: compressedUrl },
              });
            }).catch((err) => {
              console.error("이미지 압축 실패:", err);
              alert(t("imageError"));
            });
          }
          break;
        }
      }
    },
    [section.type, onUpdate]
  );
  // #endregion

  const getIcon = () => {
    switch (section.type) {
      case "basic":
        return FileText;
      case "character":
        return Users;
      case "image":
        return Image;
      case "timeline":
        return Calendar;
      case "conceptMap":
        return Network;
      case "comparison":
        return TableIcon;
      case "glossary":
        return BookText;
    }
  };

  const Icon = getIcon();
  const resizeHandleClass = "absolute bg-transparent hover:bg-accent/30";

  return (
    <div
      ref={containerRef}
      className="absolute"
      style={{
        left: position.x,
        top: position.y,
        width: size.width,
        height: size.height,
        zIndex: isActive ? 50 : 10,
      }}
      onMouseDown={onFocus}
      onPaste={handlePaste}
    >
      <div className="flex h-full flex-col overflow-hidden rounded-xl border border-border bg-[#1a1f27] shadow-xl">
        {/* 헤더 */}
        <div
          onMouseDown={handleDragStart}
          onDoubleClick={handleMaximize}
          className={`flex h-9 shrink-0 items-center justify-between border-b border-border bg-secondary px-2 ${
            isMaximized ? "cursor-default" : "cursor-move"
          }`}
        >
          <div className="flex items-center gap-2 text-xs font-semibold">
            <div className={`flex size-6 shrink-0 items-center justify-center rounded-md ${
              section.type === "basic" ? "bg-amber-500/20 text-amber-500" :
              section.type === "character" ? "bg-blue-500/20 text-blue-400" :
              section.type === "image" ? "bg-emerald-500/20 text-emerald-500" :
              section.type === "timeline" ? "bg-purple-500/20 text-purple-400" :
              section.type === "conceptMap" ? "bg-pink-500/20 text-pink-400" :
              section.type === "comparison" ? "bg-orange-500/20 text-orange-400" :
              "bg-cyan-500/20 text-cyan-400"
            }`}>
              <Icon className="size-3.5" />
            </div>
            <span className="max-w-[150px] truncate">{section.title}</span>
          </div>
          <div className="flex items-center gap-0.5">
            <button
              onClick={handleMaximize}
              className="flex size-5 items-center justify-center rounded hover:bg-white/10"
              title={isMaximized ? t("restore") : t("maximize")}
            >
              {isMaximized ? <Minimize2 className="size-3" /> : <Maximize2 className="size-3" />}
            </button>
            <button
              onClick={onClose}
              className="flex size-5 items-center justify-center rounded hover:bg-white/10"
              title={t("close")}
            >
              <X className="size-3" />
            </button>
          </div>
        </div>

        {/* 본문 */}
        <div className="flex-1 overflow-y-auto p-3">
          <SectionBody
            section={section}
            onUpdate={onUpdate}
            onAddCharacter={onAddCharacter}
            onUpdateCharacter={onUpdateCharacter}
            onDeleteCharacter={onDeleteCharacter}
          />
        </div>
      </div>

      {/* 리사이즈 핸들 */}
      {!isMaximized && (
        <>
          <div onMouseDown={(e) => handleResizeStart(e, "nw")} className={`${resizeHandleClass} -start-1 -top-1 size-3 cursor-nw-resize`} />
          <div onMouseDown={(e) => handleResizeStart(e, "ne")} className={`${resizeHandleClass} -end-1 -top-1 size-3 cursor-ne-resize`} />
          <div onMouseDown={(e) => handleResizeStart(e, "sw")} className={`${resizeHandleClass} -bottom-1 -start-1 size-3 cursor-sw-resize`} />
          <div onMouseDown={(e) => handleResizeStart(e, "se")} className={`${resizeHandleClass} -bottom-1 -end-1 size-3 cursor-se-resize`} />
          <div onMouseDown={(e) => handleResizeStart(e, "n")} className={`${resizeHandleClass} -top-1 start-2 end-2 h-2 cursor-n-resize`} />
          <div onMouseDown={(e) => handleResizeStart(e, "s")} className={`${resizeHandleClass} -bottom-1 start-2 end-2 h-2 cursor-s-resize`} />
          <div onMouseDown={(e) => handleResizeStart(e, "w")} className={`${resizeHandleClass} -start-1 top-2 bottom-2 w-2 cursor-w-resize`} />
          <div onMouseDown={(e) => handleResizeStart(e, "e")} className={`${resizeHandleClass} -end-1 top-2 bottom-2 w-2 cursor-e-resize`} />
        </>
      )}
    </div>
  );
}
