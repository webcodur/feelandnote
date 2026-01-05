/*
  파일명: /components/features/cards/CertificateCard.tsx
  기능: 자격증 콘텐츠 전용 카드 컴포넌트
  책임: 자격증 정보를 시각적으로 표시하고 상태 변경을 처리한다.
*/ // ------------------------------
"use client";

import { useRouter } from "next/navigation";

import { Check, Trash2, Calendar, CheckSquare, Square } from "lucide-react";

import { DropdownMenu } from "@/components/ui";
import Button from "@/components/ui/Button";

import { getFieldTheme, STATUS_CONFIG, BookOpen } from "./certificateThemes";

import type { UserContentWithContent } from "@/actions/contents/getMyContents";

// #region 타입
export interface CertificateCardProps {
  item: UserContentWithContent;
  onStatusChange?: (userContentId: string, status: "WANT" | "WATCHING" | "FINISHED") => void;
  onRecommendChange?: (userContentId: string, isRecommended: boolean) => void;
  onDelete?: (userContentId: string) => void;
  href?: string;
  // 배치 모드
  isBatchMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: () => void;
}
// #endregion

// #region 유틸
function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  const yy = String(d.getFullYear()).slice(2);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yy}.${mm}.${dd}`;
}
// #endregion

export default function CertificateCard({
  item,
  onStatusChange,
  onRecommendChange,
  onDelete,
  href,
  isBatchMode = false,
  isSelected = false,
  onToggleSelect,
}: CertificateCardProps) {
  // #region 훅
  const router = useRouter();
  // #endregion

  // #region 파생 값
  const content = item.content;
  const metadata = content.metadata as Record<string, string> | null;
  const addedDate = formatDate(item.created_at);
  const status = item.status || "WANT";
  const isComplete = status === "FINISHED";
  const isRecommended = item.is_recommended ?? false;
  const displayStatus = isComplete && isRecommended ? "RECOMMEND" : status;
  const statusStyle = STATUS_CONFIG[displayStatus as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.WISH;

  const qualificationType = metadata?.qualificationType || "국가자격";
  const series = metadata?.series || content.creator || "";
  const theme = getFieldTheme(content.title, series);
  const FieldIcon = theme.icon;
  // #endregion

  // #region 핸들러
  const handleClick = () => {
    if (isBatchMode && onToggleSelect) {
      onToggleSelect();
      return;
    }
    if (href) router.push(href);
  };

  const handleStatusClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isComplete && onRecommendChange) {
      onRecommendChange(item.id, !isRecommended);
    } else if (onStatusChange) {
      const nextStatus = status === "WANT" ? "WATCHING" : status === "WATCHING" ? "FINISHED" : "WANT";
      onStatusChange(item.id, nextStatus);
    }
  };
  // #endregion

  // #region 렌더링
  return (
    <div
      className="group cursor-pointer hover:-translate-y-1 hover:shadow-2xl relative"
      onClick={handleClick}
    >
      {/* 배치 모드 오버레이 */}
      {isBatchMode && (
        <div
          className="absolute inset-0 z-20 rounded-xl bg-black/40 flex items-center justify-center cursor-pointer hover:bg-black/30"
          onClick={(e) => {
            e.stopPropagation();
            onToggleSelect?.();
          }}
        >
          {isSelected ? (
            <CheckSquare size={32} className="text-accent drop-shadow-lg" />
          ) : (
            <Square size={32} className="text-white/70 hover:text-white drop-shadow-lg" />
          )}
        </div>
      )}
      <div className={`relative rounded-xl overflow-hidden shadow-xl h-full flex flex-col ring-2 ${isSelected ? "ring-accent" : statusStyle.ring}`}>
        {/* 상단: 그라데이션 배경 + 패턴 */}
        <div className={`relative h-28 bg-gradient-to-br ${theme.gradient} overflow-hidden`}>
          {/* 배경 패턴 */}
          <div
            className="absolute inset-0 opacity-100"
            style={{ backgroundImage: `url("${theme.pattern}")` }}
          />

          {/* 장식 원형들 */}
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-xl" />
          <div className="absolute -bottom-8 -left-8 w-24 h-24 bg-black/10 rounded-full blur-lg" />

          {/* 중앙 아이콘 */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="relative">
              <div className="absolute inset-0 bg-white/20 rounded-full blur-xl scale-150" />
              <div className="relative w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center shadow-lg">
                <FieldIcon size={32} className="text-white drop-shadow-lg" />
              </div>
            </div>
          </div>

          {/* 상단 배지들 */}
          <div className="absolute top-2 left-2 right-2 flex justify-between items-start">
            <span className="px-2 py-0.5 rounded-md bg-black/30 backdrop-blur-sm text-[10px] text-white font-medium">
              {qualificationType}
            </span>
            <Button
              unstyled
              className={`flex items-center gap-1 py-0.5 px-2 rounded-md text-[10px] font-bold text-white ${statusStyle.badge} backdrop-blur-sm hover:scale-105 ${
                onStatusChange || (isComplete && onRecommendChange) ? "" : "cursor-default"
              }`}
              onClick={handleStatusClick}
            >
              {isComplete && <Check size={10} />}
              {statusStyle.label}
            </Button>
          </div>

          {/* 취득 완료 골드 스탬프 */}
          {status === "FINISHED" && (
            <div className="absolute bottom-2 right-2">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400 via-amber-500 to-orange-500 flex items-center justify-center shadow-lg border-2 border-yellow-300/50">
                <Check size={20} className="text-white" strokeWidth={3} />
              </div>
            </div>
          )}
        </div>

        {/* 하단: 정보 영역 */}
        <div className="grow p-3 bg-bg-card flex flex-col">
          <h3 className="font-bold text-sm text-text-primary mb-1.5 line-clamp-2 min-h-10">
            {content.title}
          </h3>

          {series && (
            <div className="flex items-center gap-1.5 mb-auto">
              <BookOpen size={11} className="text-text-secondary" />
              <span className="text-[11px] text-text-secondary truncate">{series}</span>
            </div>
          )}

          <div className="flex items-center justify-between mt-3 pt-2 border-t border-white/5">
            <div className="flex items-center gap-1 text-[10px] text-text-secondary">
              <Calendar size={10} />
              <span>{addedDate}</span>
            </div>

            {onDelete && (
              <DropdownMenu
                items={[
                  {
                    label: "삭제",
                    icon: <Trash2 size={12} />,
                    variant: "danger",
                    onClick: () => {
                      if (confirm("이 자격증을 삭제하시겠습니까?")) {
                        onDelete(item.id);
                      }
                    },
                  },
                ]}
                iconSize={12}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
  // #endregion
}
