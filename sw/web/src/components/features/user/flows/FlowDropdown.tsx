/*
  파일명: /components/features/user/flows/FlowDropdown.tsx
  기능: 플로우 드롭다운 메뉴
  책임: 콘텐츠 추가 시 플로우 선택 및 새 플로우 생성 진입점 제공
*/
"use client";

import { useState, useEffect, useRef } from "react";
import { Layers, Plus, ChevronRight } from "lucide-react";
import { getFlows } from "@/actions/flows";
import type { FlowSummary } from "@/types/database";
import Button from "@/components/ui/Button";
import { Z_INDEX } from "@/constants/zIndex";

interface FlowDropdownProps {
  onCreateNew: () => void;
  onSelectFlow: (flowId: string) => void;
}

export default function FlowDropdown({
  onCreateNew,
  onSelectFlow,
}: FlowDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [flows, setFlows] = useState<FlowSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 외부 클릭 감지
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // 드롭다운 열릴 때 목록 로드
  useEffect(() => {
    if (isOpen) {
      loadFlows();
    }
  }, [isOpen]);

  const loadFlows = async () => {
    setIsLoading(true);
    try {
      const data = await getFlows();
      setFlows(data);
    } catch (error) {
      console.error("플로우 로드 실패:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleButtonClick = () => {
    setIsOpen(!isOpen);
  };

  const handleCreateNew = () => {
    setIsOpen(false);
    onCreateNew();
  };

  const handleSelectFlow = (flowId: string) => {
    setIsOpen(false);
    onSelectFlow(flowId);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* 트리거 버튼 */}
      <Button
        unstyled
        onClick={handleButtonClick}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-bg-secondary hover:bg-bg-card text-text-primary text-sm font-medium rounded-lg border border-border"
      >
        <Layers size={16} />
        <span className="hidden sm:inline">플로우</span>
      </Button>

      {/* 드롭다운 메뉴 */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-bg-card border border-border rounded-xl shadow-lg overflow-hidden" style={{ zIndex: Z_INDEX.dropdown }}>
          {/* 새 플로우 만들기 */}
          <Button
            unstyled
            onClick={handleCreateNew}
            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-bg-secondary text-left border-b border-border"
          >
            <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center">
              <Plus size={18} className="text-accent" />
            </div>
            <span className="text-sm font-medium text-text-primary">
              새 플로우 만들기
            </span>
          </Button>

          {/* 플로우 목록 */}
          <div className="max-h-64 overflow-y-auto">
            {isLoading ? (
              <div className="px-4 py-6 text-center text-text-secondary text-sm">
                로딩 중...
              </div>
            ) : flows.length === 0 ? (
              <div className="px-4 py-6 text-center text-text-secondary text-sm">
                아직 플로우가 없습니다
              </div>
            ) : (
              flows.map((flow) => (
                <Button
                  unstyled
                  key={flow.id}
                  onClick={() => handleSelectFlow(flow.id)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-bg-secondary text-left group"
                >
                  <div className="w-8 h-8 rounded-lg bg-bg-secondary flex items-center justify-center">
                    <Layers size={16} className="text-text-secondary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">
                      {flow.name}
                    </p>
                    <p className="text-xs text-text-secondary">
                      {flow.node_count}개 · {flow.stage_count}단계
                    </p>
                  </div>
                  <ChevronRight
                    size={16}
                    className="text-text-secondary opacity-0 group-hover:opacity-100"
                  />
                </Button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
