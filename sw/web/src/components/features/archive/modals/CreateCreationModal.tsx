"use client";

import { useState } from "react";
import { X, Lightbulb, Film as FilmIcon, Music as MusicIcon, Plus, Trash2 } from "lucide-react";
import { Button, Card } from "@/components/ui";
import { Z_INDEX } from "@/constants/zIndex";

interface CreateCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  contentTitle?: string;
}

const WHATIF_TYPES = [
  { id: "ending", label: "다른 결말" },
  { id: "choice", label: "다른 선택" },
  { id: "era", label: "시대 변경" },
  { id: "setting", label: "배경 변경" },
  { id: "perspective", label: "시점 전환" },
  { id: "prequel", label: "프리퀄" },
  { id: "spinoff", label: "외전" },
  { id: "sequel", label: "속편" },
];

const MEDIA_TYPES = [
  { id: "movie", label: "영화", icon: "🎬" },
  { id: "drama", label: "드라마", icon: "📺" },
  { id: "theater", label: "연극", icon: "🎭" },
  { id: "webtoon", label: "웹툰", icon: "📚" },
  { id: "audiobook", label: "오디오북", icon: "🎧" },
  { id: "game", label: "게임", icon: "🎮" },
];

export default function CreateCreationModal({ isOpen, onClose, contentTitle = "선택한 작품" }: CreateCreationModalProps) {
  const [creationType, setCreationType] = useState<"whatif" | "media" | "ost" | null>(null);
  const [whatifType, setWhatifType] = useState<string>("");
  const [whatifContent, setWhatifContent] = useState("");
  const [mediaType, setMediaType] = useState<string>("");
  const [castings, setCastings] = useState<{ role: string; actor: string }[]>([{ role: "", actor: "" }]);
  const [direction, setDirection] = useState("");
  const [ostTracks, setOstTracks] = useState<{ scene: string; song: string; reason: string }[]>([
    { scene: "", song: "", reason: "" },
  ]);
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
    // 실제로는 API 호출
    console.log("창작물 저장:", { creationType, whatifType, whatifContent, mediaType, castings, direction, ostTracks, ostDirection });
    handleClose();
  };

  const addCasting = () => {
    setCastings([...castings, { role: "", actor: "" }]);
  };

  const removeCasting = (index: number) => {
    setCastings(castings.filter((_, i) => i !== index));
  };

  const updateCasting = (index: number, field: "role" | "actor", value: string) => {
    const newCastings = [...castings];
    newCastings[index][field] = value;
    setCastings(newCastings);
  };

  const addOstTrack = () => {
    setOstTracks([...ostTracks, { scene: "", song: "", reason: "" }]);
  };

  const removeOstTrack = (index: number) => {
    setOstTracks(ostTracks.filter((_, i) => i !== index));
  };

  const updateOstTrack = (index: number, field: "scene" | "song" | "reason", value: string) => {
    const newTracks = [...ostTracks];
    newTracks[index][field] = value;
    setOstTracks(newTracks);
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

          {/* What If Form */}
          {creationType === "whatif" && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold mb-3">What If 유형 선택 *</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {WHATIF_TYPES.map((type) => (
                    <Button
                      unstyled
                      key={type.id}
                      onClick={() => setWhatifType(type.id)}
                      className={`py-2 px-4 rounded-lg text-sm font-medium
                        ${
                          whatifType === type.id
                            ? "bg-accent text-white"
                            : "bg-bg-main border border-border text-text-secondary hover:border-accent"
                        }`}
                    >
                      {type.label}
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">상상 시나리오 *</label>
                <textarea
                  value={whatifContent}
                  onChange={(e) => setWhatifContent(e.target.value)}
                  placeholder="만약 ~했다면 어떤 이야기가 펼쳐질까요? 상상력을 마음껏 펼쳐보세요."
                  className="w-full h-64 px-4 py-3 bg-bg-main border border-border rounded-lg outline-none resize-none focus:border-accent"
                  maxLength={10000}
                />
                <div className="text-xs text-text-secondary text-right mt-1">
                  {whatifContent.length} / 10,000자
                </div>
              </div>
            </div>
          )}

          {/* Media Conversion Form */}
          {creationType === "media" && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold mb-3">매체 선택 *</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {MEDIA_TYPES.map((type) => (
                    <Button
                      unstyled
                      key={type.id}
                      onClick={() => setMediaType(type.id)}
                      className={`py-4 px-4 rounded-lg text-sm font-medium flex items-center gap-2 justify-center
                        ${
                          mediaType === type.id
                            ? "bg-accent text-white"
                            : "bg-bg-main border border-border text-text-secondary hover:border-accent"
                        }`}
                    >
                      <span className="text-xl">{type.icon}</span>
                      {type.label}
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-semibold">캐스팅 제안</label>
                  <Button
                    unstyled
                    onClick={addCasting}
                    className="text-sm text-accent flex items-center gap-1 hover:underline"
                  >
                    <Plus size={14} /> 추가
                  </Button>
                </div>
                <div className="space-y-3">
                  {castings.map((casting, index) => (
                    <div key={index} className="flex gap-3">
                      <input
                        type="text"
                        placeholder="역할"
                        value={casting.role}
                        onChange={(e) => updateCasting(index, "role", e.target.value)}
                        className="flex-1 px-4 py-3 bg-bg-main border border-border rounded-lg outline-none focus:border-accent"
                      />
                      <input
                        type="text"
                        placeholder="배우/성우"
                        value={casting.actor}
                        onChange={(e) => updateCasting(index, "actor", e.target.value)}
                        className="flex-1 px-4 py-3 bg-bg-main border border-border rounded-lg outline-none focus:border-accent"
                      />
                      {castings.length > 1 && (
                        <Button
                          unstyled
                          onClick={() => removeCasting(index)}
                          className="w-10 h-10 flex items-center justify-center rounded-lg bg-white/5 text-text-secondary hover:bg-red-500/20 hover:text-red-400"
                        >
                          <Trash2 size={16} />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">제작 방향성</label>
                <textarea
                  value={direction}
                  onChange={(e) => setDirection(e.target.value)}
                  placeholder="어떤 방향으로 제작되면 좋을지 자유롭게 작성해보세요."
                  className="w-full h-32 px-4 py-3 bg-bg-main border border-border rounded-lg outline-none resize-none focus:border-accent"
                />
              </div>
            </div>
          )}

          {/* OST Imagination Form */}
          {creationType === "ost" && (
            <div className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-semibold">장면별 OST</label>
                  <Button
                    unstyled
                    onClick={addOstTrack}
                    className="text-sm text-accent flex items-center gap-1 hover:underline"
                  >
                    <Plus size={14} /> 추가
                  </Button>
                </div>
                <div className="space-y-4">
                  {ostTracks.map((track, index) => (
                    <Card key={index} className="p-4">
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-semibold text-text-secondary">트랙 {index + 1}</span>
                          {ostTracks.length > 1 && (
                            <Button
                              unstyled
                              onClick={() => removeOstTrack(index)}
                              className="text-text-secondary hover:text-red-400"
                            >
                              <Trash2 size={16} />
                            </Button>
                          )}
                        </div>
                        <input
                          type="text"
                          placeholder="장면/챕터 (예: 오프닝, 클라이맥스)"
                          value={track.scene}
                          onChange={(e) => updateOstTrack(index, "scene", e.target.value)}
                          className="w-full px-4 py-2 bg-bg-main border border-border rounded-lg outline-none focus:border-accent"
                        />
                        <input
                          type="text"
                          placeholder="곡 제목 - 아티스트"
                          value={track.song}
                          onChange={(e) => updateOstTrack(index, "song", e.target.value)}
                          className="w-full px-4 py-2 bg-bg-main border border-border rounded-lg outline-none focus:border-accent"
                        />
                        <textarea
                          placeholder="선곡 이유"
                          value={track.reason}
                          onChange={(e) => updateOstTrack(index, "reason", e.target.value)}
                          className="w-full h-20 px-4 py-2 bg-bg-main border border-border rounded-lg outline-none resize-none focus:border-accent"
                        />
                      </div>
                    </Card>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">전체 OST 방향성</label>
                <textarea
                  value={ostDirection}
                  onChange={(e) => setOstDirection(e.target.value)}
                  placeholder="전체적인 음악 방향성에 대한 의견을 작성해보세요."
                  className="w-full h-32 px-4 py-3 bg-bg-main border border-border rounded-lg outline-none resize-none focus:border-accent"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-8 py-4 border-t border-border bg-bg-secondary flex justify-between">
          {creationType ? (
            <Button
              unstyled
              onClick={() => setCreationType(null)}
              className="text-sm text-text-secondary hover:text-text-primary"
            >
              ← 유형 다시 선택
            </Button>
          ) : (
            <div />
          )}
          <div className="flex gap-3">
            <Button variant="secondary" onClick={handleClose}>
              취소
            </Button>
            {creationType && (
              <Button variant="primary" onClick={handleSubmit}>
                상상 공유하기
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

