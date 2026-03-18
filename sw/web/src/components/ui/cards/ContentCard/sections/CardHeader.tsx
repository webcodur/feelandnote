"use client";

import { Bookmark, ThumbsUp, Trash2 } from "lucide-react";
import DropdownMenu, { DropdownMenuItem } from "@/components/ui/DropdownMenu";
import { removeContent } from "@/actions/contents/removeContent";

import { EditionToggle } from "../slots";
import type { ContentCardProps } from "../types";
import type { ContentCardState } from "../useContentCardState";

interface CardHeaderProps {
  props: ContentCardProps;
  state: ContentCardState;
}

export default function CardHeader({ props, state }: CardHeaderProps) {
  const {
    topRightNode,
    deletable,
    onDelete,
    recommendable,
    addable,
    onAdd,
  } = props;

  const {
    ContentIcon,
    user,
    isCheckingAuth,
    internalSaved,
    internalUserContentId,
    setInternalSaved,
    setInternalUserContentId,
    setIsRecommendModalOpen,
    setIsTypeInfoOpen,
    showEditionToggle,
    editions,
    activeEdition,
    setActiveEdition,
    setShowAddConfirm,
  } = state;

  // 우측 액션 버튼
  let actionNode: React.ReactNode = null;
  if (topRightNode) {
    actionNode = topRightNode;
  } else if (!isCheckingAuth && user) {
    const menuItems: DropdownMenuItem[] = [];
    if (internalSaved) {
      if (recommendable !== false) {
        menuItems.push({
          label: "추천",
          icon: <ThumbsUp size={14} />,
          onClick: () => setIsRecommendModalOpen(true),
        });
      }
      if (deletable !== false) {
        menuItems.push({
          label: "삭제",
          icon: <Trash2 size={14} />,
          onClick: async () => {
            if (onDelete) {
              onDelete({ stopPropagation: () => {}, preventDefault: () => {} } as any);
            } else if (internalUserContentId) {
              await removeContent(internalUserContentId);
              setInternalSaved(false);
              setInternalUserContentId(undefined);
            }
          },
          variant: "danger",
        });
      }
    } else {
      menuItems.push({
        label: "서재에 담기",
        icon: <Bookmark size={14} />,
        onClick: () => {
          if (onAdd) {
            onAdd({ stopPropagation: () => {}, preventDefault: () => {} } as any);
          } else {
            setShowAddConfirm(true);
          }
        },
      });
    }
    actionNode = (
      <DropdownMenu
        items={menuItems}
        buttonClassName="w-6 h-6 flex items-center justify-center rounded hover:bg-white/[0.06] transition-colors text-text-secondary hover:text-text-primary"
        iconSize={14}
      />
    );
  }

  return (
    <div
      className="flex items-center justify-between px-1.5 py-1 bg-[#141414] border-b border-white/[0.04]"
      onClick={(e) => e.stopPropagation()}
    >
      {/* 좌: 카테고리 */}
      <button
        type="button"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsTypeInfoOpen(true); }}
        className="flex items-center justify-center w-6 h-6 rounded hover:bg-white/[0.06] transition-colors"
      >
        <ContentIcon size={13} className="text-accent/80" strokeWidth={1.8} />
      </button>

      {/* 중: 에디션 토글 */}
      <div className="flex-1 flex justify-center">
        {showEditionToggle && (
          <EditionToggle editions={editions!} activeEdition={activeEdition} onToggle={setActiveEdition} />
        )}
      </div>

      {/* 우: 액션 버튼 */}
      <div className="flex items-center">
        {actionNode}
      </div>
    </div>
  );
}
