/*
  파일명: /app/reading/components/SectionWindow.tsx
  기능: 드래그 & 리사이즈 가능한 섹션 윈도우
  책임: 각 섹션 타입별 콘텐츠를 표시하는 윈도우를 제공한다.
*/ // ------------------------------

"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { X, Maximize2, Minimize2, FileText, Users, Image, Calendar, Network, Table as TableIcon, BookText } from "lucide-react";
import CharacterContent from "./CharacterContent";
import TimelineContent from "./TimelineContent";
import ConceptMapContent from "./ConceptMapContent";
import ComparisonContent from "./ComparisonContent";
import GlossaryContent from "./GlossaryContent";
import type {
  Section,
  CharacterInfo,
  TimelineEvent,
  ConceptInfo,
  ComparisonItem,
  GlossaryTerm,
  TimelineSectionData,
  ConceptMapSectionData,
  ComparisonSectionData,
  GlossarySectionData,
} from "../types";

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

const MIN_SIZE = { width: 200, height: 150 };
const MAX_IMAGE_SIZE = 500 * 1024; // 500KB 제한

// 이미지 압축 함수
function compressImage(file: File, maxWidth: number, quality: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = document.createElement("img");
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let { width, height } = img;

        // 최대 너비 제한
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas context 생성 실패"));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        // 품질을 낮춰가며 크기 제한 맞추기
        let currentQuality = quality;
        let result = canvas.toDataURL("image/jpeg", currentQuality);

        while (result.length > MAX_IMAGE_SIZE && currentQuality > 0.1) {
          currentQuality -= 0.1;
          result = canvas.toDataURL("image/jpeg", currentQuality);
        }

        if (result.length > MAX_IMAGE_SIZE) {
          reject(new Error("이미지가 너무 큽니다. 더 작은 이미지를 사용해주세요."));
          return;
        }

        resolve(result);
      };
      img.onerror = () => reject(new Error("이미지 로드 실패"));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error("파일 읽기 실패"));
    reader.readAsDataURL(file);
  });
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
  const [isMaximized, setIsMaximized] = useState(false);
  const [prevState, setPrevState] = useState({
    size: section.size,
    position: section.position,
  });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState<string | null>(null);
  const dragStartRef = useRef({ x: 0, y: 0, posX: 0, posY: 0 });
  const resizeStartRef = useRef({ x: 0, y: 0, width: 0, height: 0, posX: 0, posY: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const { position, size } = section;

  // #region 드래그 핸들러
  const handleDragStart = useCallback(
    (e: React.MouseEvent) => {
      if (isMaximized) return;
      e.preventDefault();
      setIsDragging(true);
      dragStartRef.current = { x: e.clientX, y: e.clientY, posX: position.x, posY: position.y };
    },
    [isMaximized, position]
  );

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;
      onUpdate({
        position: { x: dragStartRef.current.posX + dx, y: dragStartRef.current.posY + dy },
      });
    };

    const handleMouseUp = () => setIsDragging(false);

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, onUpdate]);
  // #endregion

  // #region 리사이즈 핸들러
  const handleResizeStart = useCallback(
    (e: React.MouseEvent, corner: string) => {
      if (isMaximized) return;
      e.preventDefault();
      e.stopPropagation();
      setIsResizing(corner);
      resizeStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        width: size.width,
        height: size.height,
        posX: position.x,
        posY: position.y,
      };
    },
    [isMaximized, size, position]
  );

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - resizeStartRef.current.x;
      const dy = e.clientY - resizeStartRef.current.y;
      const { width, height, posX, posY } = resizeStartRef.current;

      let newWidth = width;
      let newHeight = height;
      let newX = posX;
      let newY = posY;

      if (isResizing.includes("e")) newWidth = Math.max(MIN_SIZE.width, width + dx);
      if (isResizing.includes("w")) {
        newWidth = Math.max(MIN_SIZE.width, width - dx);
        newX = posX + (width - newWidth);
      }
      if (isResizing.includes("s")) newHeight = Math.max(MIN_SIZE.height, height + dy);
      if (isResizing.includes("n")) {
        newHeight = Math.max(MIN_SIZE.height, height - dy);
        newY = posY + (height - newHeight);
      }

      onUpdate({
        size: { width: newWidth, height: newHeight },
        position: { x: newX, y: newY },
      });
    };

    const handleMouseUp = () => setIsResizing(null);

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing, onUpdate]);
  // #endregion

  // #region 최대화
  const handleMaximize = useCallback(() => {
    if (isMaximized) {
      onUpdate({ size: prevState.size, position: prevState.position });
      setIsMaximized(false);
    } else {
      setPrevState({ size, position });
      const parent = containerRef.current?.parentElement;
      if (parent) {
        onUpdate({
          size: { width: parent.clientWidth - 40, height: parent.clientHeight - 40 },
          position: { x: 20, y: 20 },
        });
      }
      setIsMaximized(true);
    }
  }, [isMaximized, size, position, prevState, onUpdate]);
  // #endregion

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
              alert("이미지 처리 중 오류가 발생했습니다.");
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
              title={isMaximized ? "복원" : "최대화"}
            >
              {isMaximized ? <Minimize2 className="size-3" /> : <Maximize2 className="size-3" />}
            </button>
            <button
              onClick={onClose}
              className="flex size-5 items-center justify-center rounded hover:bg-white/10"
              title="닫기"
            >
              <X className="size-3" />
            </button>
          </div>
        </div>

        {/* 본문 */}
        <div className="flex-1 overflow-y-auto p-3">
          {section.type === "basic" && (
            <BasicContent
              content={(section.data as { content: string }).content}
              onChange={(content) => onUpdate({ data: { type: "basic", content } })}
            />
          )}

          {section.type === "character" && (
            <CharacterContent
              characters={(section.data as { characters: CharacterInfo[] }).characters}
              onAdd={onAddCharacter!}
              onUpdate={onUpdateCharacter!}
              onDelete={onDeleteCharacter!}
            />
          )}

          {section.type === "image" && (
            <ImageContent imageUrl={(section.data as { imageUrl: string | null }).imageUrl} />
          )}

          {section.type === "timeline" && (
            <TimelineContent
              events={(section.data as TimelineSectionData).events}
              onUpdate={(events) => onUpdate({ data: { type: "timeline", events } })}
            />
          )}

          {section.type === "conceptMap" && (
            <ConceptMapContent
              concepts={(section.data as ConceptMapSectionData).concepts}
              onUpdate={(concepts) => onUpdate({ data: { type: "conceptMap", concepts } })}
            />
          )}

          {section.type === "comparison" && (
            <ComparisonContent
              items={(section.data as ComparisonSectionData).items}
              criteriaOrder={(section.data as ComparisonSectionData).criteriaOrder}
              onUpdate={(items, criteriaOrder) =>
                onUpdate({ data: { type: "comparison", items, criteriaOrder } })
              }
            />
          )}

          {section.type === "glossary" && (
            <GlossaryContent
              terms={(section.data as GlossarySectionData).terms}
              onUpdate={(terms) => onUpdate({ data: { type: "glossary", terms } })}
            />
          )}
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

// #region 기본 섹션 콘텐츠
function BasicContent({
  content,
  onChange,
}: {
  content: string;
  onChange: (content: string) => void;
}) {
  return (
    <textarea
      value={content}
      onChange={(e) => onChange(e.target.value)}
      placeholder="내용을 입력하세요..."
      className="h-full w-full resize-none bg-transparent text-sm leading-relaxed placeholder:text-text-tertiary focus:outline-none"
    />
  );
}
// #endregion

// #region 이미지 섹션 콘텐츠
function ImageContent({ imageUrl }: { imageUrl: string | null }) {
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0, startX: 0, startY: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const MIN_SCALE = 0.5;
  const MAX_SCALE = 3;

  // #region 드래그 핸들러
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!imageUrl) return;
    e.preventDefault();
    setIsPanning(true);
    panStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      startX: offset.x,
      startY: offset.y,
    };
  };

  useEffect(() => {
    if (!isPanning) return;

    const handleMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - panStartRef.current.x;
      const dy = e.clientY - panStartRef.current.y;
      setOffset({
        x: panStartRef.current.startX + dx,
        y: panStartRef.current.startY + dy,
      });
    };

    const handleMouseUp = () => setIsPanning(false);

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isPanning]);
  // #endregion

  // passive: false로 네이티브 이벤트 리스너 등록 (preventDefault 작동을 위해)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      setScale((prev) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, prev + delta)));
    };

    container.addEventListener("wheel", handleWheel, { passive: false });
    return () => container.removeEventListener("wheel", handleWheel);
  }, []);

  return (
    <div 
      ref={containerRef} 
      className={`flex h-full items-center justify-center overflow-hidden ${imageUrl ? "cursor-grab active:cursor-grabbing" : ""}`}
      onMouseDown={handleMouseDown}
    >
      {imageUrl ? (
        <img
          src={imageUrl}
          alt="붙여넣기된 이미지"
          className="rounded-lg object-contain transition-transform duration-75"
          style={{ 
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`, 
            transformOrigin: "center" 
          }}
          draggable={false}
        />
      ) : (
        <div className="text-center text-text-secondary">
          <Image className="mx-auto mb-2 size-8 opacity-50" />
          <p className="text-xs">Ctrl+V로 이미지를 붙여넣으세요</p>
          <p className="mt-1 text-[10px] text-text-tertiary">드래그로 이동 / 스크롤로 확대</p>
        </div>
      )}
    </div>
  );
}
// #endregion
