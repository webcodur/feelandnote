/*
  파일명: /components/features/user/modals/createCreation/MediaConversionForm.tsx
  기능: 매체 전환 창작물 폼
  책임: 영화/드라마 등 매체 유형, 캐스팅, 연출 방향 입력을 처리한다.
*/ // ------------------------------
"use client";

import { Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import Button from "@/components/ui/Button";

const MEDIA_TYPES = [
  { id: "movie", label: "영화", icon: "🎬" },
  { id: "drama", label: "드라마", icon: "📺" },
  { id: "theater", label: "연극", icon: "🎭" },
  { id: "webtoon", label: "웹툰", icon: "📚" },
  { id: "audiobook", label: "오디오북", icon: "🎧" },
  { id: "game", label: "게임", icon: "🎮" },
];

interface Casting {
  role: string;
  actor: string;
}

interface MediaConversionFormProps {
  mediaType: string;
  castings: Casting[];
  direction: string;
  onMediaTypeChange: (type: string) => void;
  onCastingsChange: (castings: Casting[]) => void;
  onDirectionChange: (direction: string) => void;
}

export default function MediaConversionForm({
  mediaType, castings, direction,
  onMediaTypeChange, onCastingsChange, onDirectionChange,
}: MediaConversionFormProps) {
  const t = useTranslations("creation.media");
  const addCasting = () => onCastingsChange([...castings, { role: "", actor: "" }]);

  const removeCasting = (index: number) => onCastingsChange(castings.filter((_, i) => i !== index));

  const updateCasting = (index: number, field: "role" | "actor", value: string) => {
    const newCastings = [...castings];
    newCastings[index][field] = value;
    onCastingsChange(newCastings);
  };

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-semibold mb-3">매체 선택 *</label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {MEDIA_TYPES.map((type) => (
            <Button
              unstyled
              key={type.id}
              onClick={() => onMediaTypeChange(type.id)}
              className={`py-4 px-4 rounded-lg text-sm font-medium flex items-center gap-2 justify-center
                ${mediaType === type.id
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
          <label className="block text-sm font-semibold">{t("castingLabel")}</label>
          <Button unstyled onClick={addCasting} className="text-sm text-accent flex items-center gap-1 hover:underline">
            <Plus size={14} /> {t("add")}
          </Button>
        </div>
        <div className="space-y-3">
          {castings.map((casting, index) => (
            <div key={index} className="flex gap-3">
              <input
                type="text"
                placeholder={t("rolePlaceholder")}
                value={casting.role}
                onChange={(e) => updateCasting(index, "role", e.target.value)}
                className="flex-1 px-4 py-3 bg-bg-main border border-border rounded-lg outline-none focus:border-accent"
              />
              <input
                type="text"
                placeholder={t("actorPlaceholder")}
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
        <label className="block text-sm font-semibold mb-2">{t("directionLabel")}</label>
        <textarea
          value={direction}
          onChange={(e) => onDirectionChange(e.target.value)}
          placeholder={t("directionPlaceholder")}
          className="w-full h-32 px-4 py-3 bg-bg-main border border-border rounded-lg outline-none resize-none focus:border-accent"
        />
      </div>
    </div>
  );
}
