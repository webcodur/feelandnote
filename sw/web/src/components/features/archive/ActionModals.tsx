"use client";

import { useState, useEffect, useCallback } from "react";
import { Share2, Pin, History, CheckSquare, Construction, Link, Check } from "lucide-react";
import ActionModal from "./ActionModal";
import ActivityTimeline from "./ActivityTimeline";
import { getActivityLogs } from "@/actions/activity";
import type { ActivityLogWithContent } from "@/types/database";

// #region 공유 모달
interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ShareModal({ isOpen, onClose }: ShareModalProps) {
  const [copied, setCopied] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);

  const getShareUrl = () => typeof window !== "undefined" ? window.location.href : "";
  const getShareText = () => "내 라이브러리를 확인해보세요!";
  const getShareTitle = () => "Feelnnote - 내 라이브러리";

  const shareOptions: ShareOption[] = [
    {
      label: "X",
      icon: <XIcon />,
      bgColor: "#000000",
      handler: () => {
        const url = `https://twitter.com/intent/tweet?url=${encodeURIComponent(getShareUrl())}&text=${encodeURIComponent(getShareText())}`;
        window.open(url, "_blank", "width=550,height=420");
      },
    },
    {
      label: "Facebook",
      icon: <FacebookIcon />,
      bgColor: "#1877F2",
      handler: () => {
        const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(getShareUrl())}`;
        window.open(url, "_blank", "width=550,height=420");
      },
    },
    {
      label: "LinkedIn",
      icon: <LinkedInIcon />,
      bgColor: "#0A66C2",
      handler: () => {
        const url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(getShareUrl())}`;
        window.open(url, "_blank", "width=550,height=420");
      },
    },
    {
      label: "WhatsApp",
      icon: <WhatsAppIcon />,
      bgColor: "#25D366",
      handler: () => {
        const url = `https://wa.me/?text=${encodeURIComponent(`${getShareText()} ${getShareUrl()}`)}`;
        window.open(url, "_blank");
      },
    },
    {
      label: "Telegram",
      icon: <TelegramIcon />,
      bgColor: "#26A5E4",
      handler: () => {
        const url = `https://t.me/share/url?url=${encodeURIComponent(getShareUrl())}&text=${encodeURIComponent(getShareText())}`;
        window.open(url, "_blank");
      },
    },
    {
      label: "Email",
      icon: <EmailIcon />,
      bgColor: "#EA4335",
      handler: () => {
        const url = `mailto:?subject=${encodeURIComponent(getShareTitle())}&body=${encodeURIComponent(`${getShareText()}\n\n${getShareUrl()}`)}`;
        window.location.href = url;
      },
    },
  ];

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(getShareUrl());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setShareError("링크 복사에 실패했습니다");
    }
  };

  const handleClose = () => {
    setCopied(false);
    setShareError(null);
    onClose();
  };

  return (
    <ActionModal
      isOpen={isOpen}
      onClose={handleClose}
      icon={Share2}
      title="공유"
      description="현재 페이지 링크를 공유합니다."
    >
      {/* 현재 URL 표시 */}
      <div className="bg-surface/50 rounded-xl p-3 flex items-center gap-2 mb-4">
        {copied ? (
          <Check size={16} className="text-green-400 flex-shrink-0" />
        ) : (
          <Link size={16} className="text-text-tertiary flex-shrink-0" />
        )}
        <span className="text-sm text-text-secondary truncate">
          {getShareUrl()}
        </span>
      </div>

      {/* 공유 버튼 그리드 */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        {shareOptions.map((opt) => (
          <ShareButton key={opt.label} label={opt.label} icon={opt.icon} bgColor={opt.bgColor} onClick={opt.handler} />
        ))}
      </div>

      {/* 링크 복사 버튼 */}
      <button
        onClick={handleCopyLink}
        className={`w-full py-3 rounded-xl font-medium text-sm flex items-center justify-center gap-2 border ${
          copied
            ? "bg-green-500/10 border-green-500/30 text-green-400"
            : "bg-surface/50 border-border/50 text-text-secondary hover:bg-surface hover:border-border"
        }`}
      >
        {copied ? <Check size={16} /> : <Link size={16} />}
        {copied ? "복사됨!" : "링크 복사"}
      </button>

      {/* 에러 메시지 */}
      {shareError && (
        <p className="mt-3 text-xs text-red-400 text-center">{shareError}</p>
      )}
    </ActionModal>
  );
}

// #region 공유 버튼 타입 및 컴포넌트
interface ShareOption {
  label: string;
  icon: React.ReactNode;
  bgColor: string;
  handler: () => void;
}

function ShareButton({ label, icon, bgColor, onClick }: { label: string; icon: React.ReactNode; bgColor: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="group flex flex-col items-center gap-2 p-3 rounded-xl bg-surface/30 hover:bg-surface/60 border border-border/30 hover:border-border/60"
    >
      <div
        className="w-11 h-11 rounded-full flex items-center justify-center text-white shadow-lg group-hover:scale-105"
        style={{ backgroundColor: bgColor }}
      >
        {icon}
      </div>
      <span className="text-xs text-text-secondary group-hover:text-text-primary">{label}</span>
    </button>
  );
}
// #endregion

// #region 소셜 아이콘
function XIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

function LinkedInIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

function WhatsAppIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

function TelegramIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
    </svg>
  );
}

function EmailIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z" />
    </svg>
  );
}
// #endregion
// #endregion

// #region 고정 모달
interface PinModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PinModal({ isOpen, onClose }: PinModalProps) {
  return (
    <ActionModal
      isOpen={isOpen}
      onClose={onClose}
      icon={Pin}
      title="고정"
      description="현재 주목해야 할 콘텐츠를 상단에 고정합니다. 고정된 콘텐츠는 월별 그룹과 별개로 '고정됨' 섹션에 항상 표시됩니다."
      actions={[
        {
          label: "준비 중인 기능입니다",
          onClick: onClose,
          variant: "secondary",
          disabled: true,
        },
      ]}
    >
      <div className="bg-surface/50 rounded-xl p-4 space-y-2">
        <p className="text-sm text-text-secondary">
          <span className="text-accent font-medium">Tip:</span> 고정은 최대 10개까지 가능하며, "이번 주에 끝낼 콘텐츠"처럼 단기 목표 관리에 활용하세요.
        </p>
      </div>
      <ComingSoonBadge />
    </ActionModal>
  );
}
// #endregion

// #region 히스토리 모달
interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function HistoryModal({ isOpen, onClose }: HistoryModalProps) {
  const [logs, setLogs] = useState<ActivityLogWithContent[]>([]);
  const [loading, setLoading] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  const loadLogs = useCallback(async (cursor?: string) => {
    setLoading(true);
    try {
      const result = await getActivityLogs({ limit: 20, cursor });
      setLogs((prev) => (cursor ? [...prev, ...result.logs] : result.logs));
      setNextCursor(result.nextCursor);
    } catch {
      console.error("[HistoryModal] Failed to load logs");
    } finally {
      setLoading(false);
    }
  }, []);

  // 모달 열릴 때 로드
  useEffect(() => {
    if (isOpen && !initialized) {
      loadLogs();
      setInitialized(true);
    }
  }, [isOpen, initialized, loadLogs]);

  // 모달 닫힐 때 초기화
  const handleClose = () => {
    setLogs([]);
    setNextCursor(null);
    setInitialized(false);
    onClose();
  };

  return (
    <ActionModal
      isOpen={isOpen}
      onClose={handleClose}
      icon={History}
      title="히스토리"
      description="최근 90일간의 활동 내역입니다."
      size="md"
      actions={nextCursor ? [
        {
          label: loading ? "로딩 중..." : "더 보기",
          onClick: () => loadLogs(nextCursor),
          variant: "secondary",
          disabled: loading,
        },
      ] : []}
    >
      <div className="max-h-[50vh] overflow-y-auto -mx-2 px-2">
        <ActivityTimeline logs={logs} loading={loading && logs.length === 0} />
      </div>
    </ActionModal>
  );
}
// #endregion

// #region 배치 모드 모달
interface BatchModeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function BatchModeModal({ isOpen, onClose }: BatchModeModalProps) {
  return (
    <ActionModal
      isOpen={isOpen}
      onClose={onClose}
      icon={CheckSquare}
      title="배치 모드"
      description="여러 콘텐츠를 선택하여 일괄 작업을 수행합니다. 삭제, 상태 변경, 분류 이동 등을 한 번에 처리할 수 있습니다."
      actions={[
        {
          label: "준비 중인 기능입니다",
          onClick: onClose,
          variant: "secondary",
          disabled: true,
        },
      ]}
    >
      <div className="bg-surface/50 rounded-xl p-4 space-y-2">
        <p className="text-sm font-medium text-text-primary mb-2">지원 예정 작업:</p>
        <ul className="text-sm text-text-secondary space-y-1">
          <li>• 선택 콘텐츠 일괄 삭제</li>
          <li>• 상태 일괄 변경 (관심 → 완료 등)</li>
          <li>• 소분류 일괄 지정</li>
          <li>• 고정/해제 일괄 처리</li>
        </ul>
      </div>
      <ComingSoonBadge />
    </ActionModal>
  );
}
// #endregion

// #region 준비 중 뱃지
function ComingSoonBadge() {
  return (
    <div className="mt-4 flex items-center justify-center gap-2 py-2 px-4 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
      <Construction size={16} className="text-yellow-500" />
      <span className="text-xs font-medium text-yellow-500">개발 중인 기능입니다</span>
    </div>
  );
}
// #endregion
