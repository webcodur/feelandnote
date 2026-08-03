/*
  파일명: /components/ui/ShareButtons.tsx
  기능: SNS 공유 버튼
  책임: 단일 공유 버튼을 열고, 모달에서 정규 URL의 공유 채널을 선택하게 한다.
*/ // ------------------------------

"use client";

import { useCallback, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Facebook, Link2, Check, Linkedin, Mail, Share2 } from "lucide-react";
import Modal, { ModalBody } from "./Modal";

// #region 상수·타입
const BASE_URL = "https://feelandnote.com";

interface ShareButtonsProps {
  // 공유 텍스트(페이지 제목)
  title: string;
  // 로케일 prefix 없는 경로 (예: /celeb/shakespeare)
  path: string;
  className?: string;
  comfortable?: boolean;
  /** 가로 정렬. 카드 본문 안에 넣을 때는 start·center를 쓴다 */
  align?: "start" | "center" | "end";
  /** 단일 공유 버튼의 '공유' 글자 노출 여부 */
  showLabel?: boolean;
}

const XIcon = ({ size = 14 }: { size?: number | string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);
// #endregion

export default function ShareButtons({
  title,
  path,
  className = "",
  comfortable = false,
  align = "end",
  showLabel = true,
}: ShareButtonsProps) {
  const t = useTranslations("share");
  const locale = useLocale();
  const [copied, setCopied] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  // 로케일 포함 정규 URL (ko는 prefix 없음, en은 /en)
  const shareUrl = `${BASE_URL}${locale === "en" ? "/en" : ""}${path}`;
  const encodedUrl = encodeURIComponent(shareUrl);
  const encodedText = encodeURIComponent(title);
  const iconSize = comfortable ? 16 : 14;

  const linkChannels = [
    {
      key: "x",
      label: "X",
      Icon: XIcon,
      href: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedText}`,
    },
    {
      key: "facebook",
      label: "Facebook",
      Icon: Facebook,
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    },
    {
      key: "linkedin",
      label: "LinkedIn",
      Icon: Linkedin,
      href: `https://www.linkedin.com/shareArticle?mini=true&url=${encodedUrl}&title=${encodedText}`,
    },
    {
      key: "mail",
      label: "Email",
      Icon: Mail,
      href: `mailto:?subject=${encodedText}&body=${encodedUrl}`,
    },
  ];

  const handleCopy = async () => {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  const closeModal = useCallback(() => setIsOpen(false), []);

  const alignClass =
    align === "start"
      ? "justify-start"
      : align === "center"
        ? "justify-center"
        : "justify-end";

  const optionStyle =
    "flex min-h-12 items-center gap-3 rounded-md border border-white/10 bg-white/[0.025] px-3 text-sm text-text-secondary hover:border-accent/45 hover:bg-white/[0.06] hover:text-accent active:bg-white/[0.09] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60";

  return (
    <>
      <div className={`flex items-center ${alignClass} ${className}`}>
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={isOpen}
          aria-label={t("label")}
          className={`inline-flex items-center justify-center gap-2 rounded-full border border-white/12 bg-transparent text-text-secondary hover:border-accent/50 hover:bg-white/[0.04] hover:text-accent active:bg-white/[0.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 ${
            comfortable
              ? showLabel
                ? "h-10 px-3.5 text-sm font-semibold"
                : "h-10 w-10"
              : showLabel
                ? "h-8 px-3 text-xs font-medium"
                : "h-8 w-8"
          }`}
        >
          <Share2 size={iconSize} />
          {showLabel ? <span>{t("label")}</span> : null}
        </button>
      </div>

      <Modal
        isOpen={isOpen}
        onClose={closeModal}
        title={t("chooseChannel")}
        icon={Share2}
        size="sm"
      >
        <ModalBody className="grid grid-cols-2 gap-2 p-4">
          {linkChannels.map(({ key, label, Icon, href }) => (
            <a
              key={key}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              onClick={closeModal}
              className={optionStyle}
            >
              <Icon size={18} />
              <span>{label}</span>
            </a>
          ))}

          <button
            type="button"
            onClick={() => void handleCopy()}
            className={`${optionStyle} col-span-2`}
          >
            {copied ? <Check size={18} /> : <Link2 size={18} />}
            <span>{copied ? t("copied") : t("copyLink")}</span>
          </button>
        </ModalBody>
      </Modal>
    </>
  );
}
