/*
  파일명: /components/features/user/modals/createCreation/OstImaginationForm.tsx
  기능: OST 상상 창작물 폼
  책임: 장면별 음악 선곡과 선곡 이유 입력을 처리한다.
*/ // ------------------------------
"use client";

import { Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button, Card } from "@/components/ui";

interface OstTrack {
  scene: string;
  song: string;
  reason: string;
}

interface OstImaginationFormProps {
  ostTracks: OstTrack[];
  ostDirection: string;
  onTracksChange: (tracks: OstTrack[]) => void;
  onDirectionChange: (direction: string) => void;
}

export default function OstImaginationForm({
  ostTracks, ostDirection, onTracksChange, onDirectionChange,
}: OstImaginationFormProps) {
  const t = useTranslations("creation.ost");
  const addTrack = () => onTracksChange([...ostTracks, { scene: "", song: "", reason: "" }]);

  const removeTrack = (index: number) => onTracksChange(ostTracks.filter((_, i) => i !== index));

  const updateTrack = (index: number, field: "scene" | "song" | "reason", value: string) => {
    const newTracks = [...ostTracks];
    newTracks[index][field] = value;
    onTracksChange(newTracks);
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="block text-sm font-semibold">{t("sceneLabel")}</label>
          <Button unstyled onClick={addTrack} className="text-sm text-accent flex items-center gap-1 hover:underline">
            <Plus size={14} /> {t("add")}
          </Button>
        </div>
        <div className="space-y-4">
          {ostTracks.map((track, index) => (
            <Card key={index} className="p-4">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold text-text-secondary">{t("trackLabel", { index: index + 1 })}</span>
                  {ostTracks.length > 1 && (
                    <Button unstyled onClick={() => removeTrack(index)} className="text-text-secondary hover:text-red-400">
                      <Trash2 size={16} />
                    </Button>
                  )}
                </div>
                <input
                  type="text"
                  placeholder={t("scenePlaceholder")}
                  value={track.scene}
                  onChange={(e) => updateTrack(index, "scene", e.target.value)}
                  className="w-full px-4 py-2 bg-bg-main border border-border rounded-lg outline-none focus:border-accent"
                />
                <input
                  type="text"
                  placeholder={t("songPlaceholder")}
                  value={track.song}
                  onChange={(e) => updateTrack(index, "song", e.target.value)}
                  className="w-full px-4 py-2 bg-bg-main border border-border rounded-lg outline-none focus:border-accent"
                />
                <textarea
                  placeholder={t("reasonPlaceholder")}
                  value={track.reason}
                  onChange={(e) => updateTrack(index, "reason", e.target.value)}
                  className="w-full h-20 px-4 py-2 bg-bg-main border border-border rounded-lg outline-none resize-none focus:border-accent"
                />
              </div>
            </Card>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold mb-2">{t("directionLabel")}</label>
        <textarea
          value={ostDirection}
          onChange={(e) => onDirectionChange(e.target.value)}
          placeholder={t("directionPlaceholder")}
          className="w-full h-32 px-4 py-3 bg-bg-main border border-border rounded-lg outline-none resize-none focus:border-accent"
        />
      </div>
    </div>
  );
}
