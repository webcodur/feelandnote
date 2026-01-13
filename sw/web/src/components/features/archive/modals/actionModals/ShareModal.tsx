/*
  파일명: /components/features/archive/modals/actionModals/ShareModal.tsx
  기능: 공유 모달
  책임: 콘텐츠를 SNS, 이메일, 링크 복사 등으로 공유하는 기능을 제공한다.
*/ // ------------------------------
"use client";

import { useState } from "react";
import { Share2, Link, Check } from "lucide-react";
import ActionModal from "../ActionModal";
import Button from "@/components/ui/Button";
import { XIcon, FacebookIcon, LinkedInIcon, WhatsAppIcon, TelegramIcon, EmailIcon } from "./SocialIcons";

interface ShareOption {
  label: string;
  icon: React.ReactNode;
  bgColor: string;
  handler: () => void;
}

function ShareButton({ label, icon, bgColor, onClick }: { label: string; icon: React.ReactNode; bgColor: string; onClick: () => void }) {
  return (
    <Button
      unstyled
      onClick={onClick}
      className="group flex flex-col items-center gap-1.5 p-2 rounded-xl bg-surface/30 hover:bg-surface/60 border border-border/30 hover:border-border/60 transition-colors"
    >
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center text-white shadow-sm group-hover:scale-110 transition-transform"
        style={{ backgroundColor: bgColor }}
      >
        <div className="transform scale-75">{icon}</div>
      </div>
      <span className="text-[11px] text-text-secondary group-hover:text-text-primary">{label}</span>
    </Button>
  );
}

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
    { label: "X", icon: <XIcon />, bgColor: "#000000", handler: () => window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(getShareUrl())}&text=${encodeURIComponent(getShareText())}`, "_blank", "width=550,height=420") },
    { label: "Facebook", icon: <FacebookIcon />, bgColor: "#1877F2", handler: () => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(getShareUrl())}`, "_blank", "width=550,height=420") },
    { label: "LinkedIn", icon: <LinkedInIcon />, bgColor: "#0A66C2", handler: () => window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(getShareUrl())}`, "_blank", "width=550,height=420") },
    { label: "WhatsApp", icon: <WhatsAppIcon />, bgColor: "#25D366", handler: () => window.open(`https://wa.me/?text=${encodeURIComponent(`${getShareText()} ${getShareUrl()}`)}`, "_blank") },
    { label: "Telegram", icon: <TelegramIcon />, bgColor: "#26A5E4", handler: () => window.open(`https://t.me/share/url?url=${encodeURIComponent(getShareUrl())}&text=${encodeURIComponent(getShareText())}`, "_blank") },
    { label: "Email", icon: <EmailIcon />, bgColor: "#EA4335", handler: () => { window.location.href = `mailto:?subject=${encodeURIComponent(getShareTitle())}&body=${encodeURIComponent(`${getShareText()}\n\n${getShareUrl()}`)}`; } },
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
    <ActionModal isOpen={isOpen} onClose={handleClose} icon={Share2} title="공유" description="현재 페이지 링크를 공유합니다.">
      <div className="bg-surface/50 rounded-xl p-2.5 flex items-center gap-2 mb-3">
        {copied ? <Check size={14} className="text-green-400 flex-shrink-0" /> : <Link size={14} className="text-text-tertiary flex-shrink-0" />}
        <span className="text-xs text-text-secondary truncate">{getShareUrl()}</span>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-3">
        {shareOptions.map((opt) => (
          <ShareButton key={opt.label} label={opt.label} icon={opt.icon} bgColor={opt.bgColor} onClick={opt.handler} />
        ))}
      </div>

      <Button
        unstyled
        onClick={handleCopyLink}
        className={`w-full py-2.5 rounded-xl font-medium text-xs flex items-center justify-center gap-2 border transition-colors ${
          copied ? "bg-green-500/10 border-green-500/30 text-green-400" : "bg-surface/50 border-border/50 text-text-secondary hover:bg-surface hover:border-border"
        }`}
      >
        {copied ? <Check size={14} /> : <Link size={14} />}
        {copied ? "복사됨!" : "링크 복사"}
      </Button>

      {shareError && <p className="mt-2 text-[10px] text-red-400 text-center">{shareError}</p>}
    </ActionModal>
  );
}
