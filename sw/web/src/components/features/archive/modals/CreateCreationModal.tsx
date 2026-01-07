/*
  파일명: /components/features/archive/modals/CreateCreationModal.tsx
  기능: 창작물 생성 모달
  책임: What If, 매체 전환, OST 상상 중 유형 선택 및 각 폼을 렌더링한다.
*/ // ------------------------------
"use client";

import { useState } from "react";
import { X, Lightbulb, Film as FilmIcon, Music as MusicIcon } from "lucide-react";
import { Button } from "@/components/ui";
import { Z_INDEX } from "@/constants/zIndex";
import WhatIfForm from "./createCreation/WhatIfForm";
import MediaConversionForm from "./createCreation/MediaConversionForm";
import OstImaginationForm from "./createCreation/OstImaginationForm";

interface CreateCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  contentTitle?: string;
}

type CreationType = "whatif" | "media" | "ost" | null;

export default function CreateCreationModal({ isOpen, onClose, contentTitle = "선택한 작품" }: CreateCreationModalProps) {
  const [creationType, setCreationType] = useState<CreationType>(null);
  const [whatifType, setWhatifType] = useState("");
  const [whatifContent, setWhatifContent] = useState("");
  const [mediaType, setMediaType] = useState("");
  const [castings, setCastings] = useState([{ role: "", actor: "" }]);
  const [direction, setDirection] = useState("");
  const [ostTracks, setOstTracks] = useState([{ scene: "", song: "", reason: "" }]);
  const [ostDirection, setOstDirection] = useState("");

  if (!isOpen) return null;

  const resetForm = () => {
    setCreationType(null);
    setWhatifType("");
    setWhatifContent("");
    setMediaType("");
    setCastings([{ role: "", actor: "" }]);
    setDirection("");
    setOstTracks([{ scene: "", song: "", reason: "" }]);
    setOstDirection("");
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = () => {
    console.log("창작물 저장:", { creationType, whatifType, whatifContent, mediaType, castings, direction, ostTracks, ostDirection });
    handleClose();
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm" style={{ zIndex: Z_INDEX.modal }}>
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-bg-card rounded-2xl border border-border shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-6 border-b border-border bg-bg-secondary">
          <div>
            <h2 className="text-2xl font-bold">창작하기</h2>
            <p className="text-sm text-text-secondary mt-1">{contentTitle}</p>
          </div>
          <Button
            unstyled
            onClick={handleClose}
            className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10"
          >
            <X size={20} />
          </Button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-180px)] p-8">
          {/* Type Selection */}
          {!creationType && (
            <div>
              <h3 className="text-lg font-semibold mb-6">창작 유형을 선택하세요</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button
                  unstyled
                  onClick={() => setCreationType("whatif")}
                  className="p-8 rounded-2xl bg-bg-main border-2 border-border hover:border-accent hover:bg-bg-secondary group"
                >
                  <Lightbulb size={40} className="mx-auto mb-4 text-yellow-400 group-hover:scale-110" />
                  <div className="text-lg font-bold mb-2">💭 What If</div>
                  <div className="text-sm text-text-secondary">만약 ~했다면? 상상의 시나리오</div>
                </Button>

                <Button
                  unstyled
                  onClick={() => setCreationType("media")}
                  className="p-8 rounded-2xl bg-bg-main border-2 border-border hover:border-accent hover:bg-bg-secondary group"
                >
                  <FilmIcon size={40} className="mx-auto mb-4 text-blue-400 group-hover:scale-110" />
                  <div className="text-lg font-bold mb-2">🎬 매체 전환</div>
                  <div className="text-sm text-text-secondary">다른 매체로 만든다면?</div>
                </Button>

                <Button
                  unstyled
                  onClick={() => setCreationType("ost")}
                  className="p-8 rounded-2xl bg-bg-main border-2 border-border hover:border-accent hover:bg-bg-secondary group"
                >
                  <MusicIcon size={40} className="mx-auto mb-4 text-purple-400 group-hover:scale-110" />
                  <div className="text-lg font-bold mb-2">🎵 OST 상상</div>
                  <div className="text-sm text-text-secondary">음악을 입힌다면?</div>
                </Button>
              </div>
            </div>
          )}

          {creationType === "whatif" && (
            <WhatIfForm
              whatifType={whatifType}
              whatifContent={whatifContent}
              onTypeChange={setWhatifType}
              onContentChange={setWhatifContent}
            />
          )}

          {creationType === "media" && (
            <MediaConversionForm
              mediaType={mediaType}
              castings={castings}
              direction={direction}
              onMediaTypeChange={setMediaType}
              onCastingsChange={setCastings}
              onDirectionChange={setDirection}
            />
          )}

          {creationType === "ost" && (
            <OstImaginationForm
              ostTracks={ostTracks}
              ostDirection={ostDirection}
              onTracksChange={setOstTracks}
              onDirectionChange={setOstDirection}
            />
          )}
        </div>

        {/* Footer */}
        <div className="px-8 py-4 border-t border-border bg-bg-secondary flex justify-between">
          {creationType ? (
            <Button unstyled onClick={() => setCreationType(null)} className="text-sm text-text-secondary hover:text-text-primary">
              ← 유형 다시 선택
            </Button>
          ) : (
            <div />
          )}
          <div className="flex gap-3">
            <Button variant="secondary" onClick={handleClose}>취소</Button>
            {creationType && <Button variant="primary" onClick={handleSubmit}>상상 공유하기</Button>}
          </div>
        </div>
      </div>
    </div>
  );
}
