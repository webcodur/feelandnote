"use client";

import { useState, useEffect } from "react";
import { X, Save, Share2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui";
import { getMyContents, type UserContentWithContent } from "@/actions/contents";

interface CreateTierListModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface TierItem {
  id: string;
  title: string;
  coverColor: string;
  thumbnail_url?: string | null;
}

const TIERS = [
  { id: "S", label: "S", color: "#ffd700", textColor: "#000" },
  { id: "A", label: "A", color: "#b57cff", textColor: "#fff" },
  { id: "B", label: "B", color: "#4d9fff", textColor: "#fff" },
  { id: "C", label: "C", color: "#50c878", textColor: "#fff" },
  { id: "D", label: "D", color: "#808080", textColor: "#fff" },
];

// 썸네일이 없을 때 사용할 그라디언트 색상
const GRADIENT_COLORS = [
  "linear-gradient(135deg, #FF9A9E 0%, #FECFEF 100%)",
  "linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)",
  "linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%)",
  "linear-gradient(135deg, #e0c3fc 0%, #8ec5fc 100%)",
  "linear-gradient(135deg, #fbc2eb 0%, #a6c1ee 100%)",
  "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
  "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
  "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
];

function getGradientColor(index: number): string {
  return GRADIENT_COLORS[index % GRADIENT_COLORS.length];
}

function mapToTierItem(item: UserContentWithContent, index: number): TierItem {
  return {
    id: item.id,
    title: item.content.title,
    coverColor: getGradientColor(index),
    thumbnail_url: item.content.thumbnail_url,
  };
}

export default function CreateTierListModal({ isOpen, onClose }: CreateTierListModalProps) {
  const [listTitle, setListTitle] = useState("");
  const [listCategory, setListCategory] = useState("전체");
  const [tierItems, setTierItems] = useState<{ [key: string]: TierItem[] }>({
    S: [],
    A: [],
    B: [],
    C: [],
    D: [],
  });
  const [unassigned, setUnassigned] = useState<TierItem[]>([]);
  const [allContents, setAllContents] = useState<TierItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // 모달이 열릴 때 콘텐츠 로드
  useEffect(() => {
    if (isOpen) {
      loadContents();
    }
  }, [isOpen]);

  async function loadContents() {
    setIsLoading(true);
    try {
      const contents = await getMyContents();
      const items = contents.map(mapToTierItem);
      setAllContents(items);
      setUnassigned(items);
    } catch (error) {
      console.error("Failed to load contents:", error);
    } finally {
      setIsLoading(false);
    }
  }

  if (!isOpen) return null;

  const handleReset = () => {
    setListTitle("");
    setListCategory("전체");
    setTierItems({ S: [], A: [], B: [], C: [], D: [] });
    setUnassigned(allContents);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const handleSave = () => {
    // 실제로는 API 호출
    console.log("티어리스트 저장:", { listTitle, listCategory, tierItems });
    handleClose();
  };

  const moveToTier = (item: TierItem, tierId: string) => {
    // 기존 위치에서 제거
    setUnassigned((prev) => prev.filter((i) => i.id !== item.id));
    Object.keys(tierItems).forEach((tier) => {
      setTierItems((prev) => ({
        ...prev,
        [tier]: prev[tier].filter((i) => i.id !== item.id),
      }));
    });

    // 새 위치에 추가
    setTierItems((prev) => ({
      ...prev,
      [tierId]: [...prev[tierId], item],
    }));
  };

  const moveToUnassigned = (item: TierItem) => {
    // 기존 위치에서 제거
    Object.keys(tierItems).forEach((tier) => {
      setTierItems((prev) => ({
        ...prev,
        [tier]: prev[tier].filter((i) => i.id !== item.id),
      }));
    });

    // 미배치로 이동
    setUnassigned((prev) => [...prev, item]);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="relative w-full max-w-6xl max-h-[90vh] bg-bg-card rounded-2xl border border-border shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-6 border-b border-border bg-bg-secondary">
          <div className="flex-1">
            <input
              type="text"
              value={listTitle}
              onChange={(e) => setListTitle(e.target.value)}
              placeholder="티어리스트 제목을 입력하세요 (예: 2024년 최고의 SF 영화)"
              className="w-full text-2xl font-bold bg-transparent border-none outline-none placeholder:text-text-secondary"
            />
            <div className="flex gap-3 mt-3">
              {["전체", "도서", "영화", "드라마", "게임"].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setListCategory(cat)}
                  className={`text-sm px-3 py-1 rounded-full transition-all duration-200
                    ${
                      listCategory === cat
                        ? "bg-accent text-white"
                        : "bg-white/5 text-text-secondary hover:bg-white/10"
                    }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={handleClose}
            className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center transition-all duration-200 hover:bg-white/10"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-180px)] p-8">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 size={32} className="animate-spin text-accent" />
            </div>
          ) : allContents.length === 0 ? (
            <div className="text-center py-20 text-text-secondary">
              <p className="mb-2">등록된 콘텐츠가 없습니다.</p>
              <p className="text-sm">먼저 기록관에서 콘텐츠를 추가해 주세요.</p>
            </div>
          ) : (
            <>
              {/* Tier Rows */}
              <div className="space-y-3 mb-8">
                {TIERS.map((tier) => (
                  <div key={tier.id} className="flex gap-3">
                    <div
                      className="w-20 h-24 rounded-xl flex items-center justify-center text-3xl font-black shrink-0"
                      style={{ backgroundColor: tier.color, color: tier.textColor }}
                    >
                      {tier.label}
                    </div>
                    <div className="flex-1 min-h-[96px] bg-bg-main border-2 border-dashed border-border rounded-xl p-2 flex flex-wrap gap-2 content-start transition-all duration-200 hover:border-accent/50">
                      {tierItems[tier.id].length === 0 ? (
                        <div className="w-full h-full flex items-center justify-center text-text-secondary text-sm">
                          여기로 드래그하여 배치하세요
                        </div>
                      ) : (
                        tierItems[tier.id].map((item) => (
                          <div
                            key={item.id}
                            onClick={() => moveToUnassigned(item)}
                            className="w-16 h-20 rounded-lg cursor-pointer transition-all duration-200 hover:scale-105 hover:shadow-lg overflow-hidden"
                            style={{ background: item.thumbnail_url ? undefined : item.coverColor }}
                            title={`${item.title} (클릭하여 미배치로)`}
                          >
                            {item.thumbnail_url && (
                              <img src={item.thumbnail_url} alt={item.title} className="w-full h-full object-cover" />
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Unassigned Items */}
              <div className="border-t border-border pt-6">
                <h3 className="text-lg font-semibold mb-4">
                  미배치 작품 ({unassigned.length}개)
                </h3>
                <div className="bg-bg-main rounded-xl p-4 min-h-[120px]">
                  <div className="flex flex-wrap gap-3">
                    {unassigned.length === 0 ? (
                      <div className="w-full text-center py-8 text-text-secondary">
                        모든 작품이 배치되었습니다!
                      </div>
                    ) : (
                      unassigned.map((item) => (
                        <div key={item.id} className="group relative">
                          <div
                            className="w-20 h-28 rounded-lg cursor-pointer transition-all duration-200 hover:scale-105 hover:shadow-lg overflow-hidden"
                            style={{ background: item.thumbnail_url ? undefined : item.coverColor }}
                          >
                            {item.thumbnail_url && (
                              <img src={item.thumbnail_url} alt={item.title} className="w-full h-full object-cover" />
                            )}
                          </div>
                          <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-lg flex items-center justify-center">
                            <div className="flex flex-col gap-1">
                              {TIERS.map((tier) => (
                                <button
                                  key={tier.id}
                                  onClick={() => moveToTier(item, tier.id)}
                                  className="px-3 py-1 rounded text-xs font-bold"
                                  style={{ backgroundColor: tier.color, color: tier.textColor }}
                                >
                                  {tier.label}
                                </button>
                          ))}
                        </div>
                      </div>
                      <div className="text-xs text-center mt-1 text-text-secondary truncate w-20">
                        {item.title}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-8 py-4 border-t border-border bg-bg-secondary flex justify-between items-center">
          <div className="text-sm text-text-secondary">
            💡 미배치 작품에 마우스를 올리고 등급을 선택하세요
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={handleClose}>
              취소
            </Button>
            <Button variant="secondary" onClick={handleSave}>
              <Share2 size={14} /> 이미지로 저장
            </Button>
            <Button variant="primary" onClick={handleSave}>
              <Save size={14} /> 공유하기
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

