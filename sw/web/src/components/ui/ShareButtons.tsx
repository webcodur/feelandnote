/*
  파일명: /components/ui/ShareButtons.tsx
  기능: SNS 공유 버튼
  책임: 현재 페이지의 정규 URL과 제목을 X·페이스북·링크 복사로 공유한다.
*/ // ------------------------------

"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Facebook, Link2, Check, MessageCircle, Linkedin, Mail } from "lucide-react";

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
  /** '공유' 글자 노출 여부. 끄면 아이콘만 남는다 */
  showLabel?: boolean;
}

const iconBtnStyle =
  "inline-flex items-center justify-center rounded-full bg-white/5 border border-white/10 text-text-secondary hover:text-accent hover:border-accent/30";

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

  // 로케일 포함 정규 URL (ko는 prefix 없음, en은 /en)
  const shareUrl = `${BASE_URL}${locale === "en" ? "/en" : ""}${path}`;
  const encodedUrl = encodeURIComponent(shareUrl);
  const encodedText = encodeURIComponent(title);
  const iconSize = comfortable ? 18 : 14;
  const iconButtonSize = comfortable ? "h-11 w-11" : "p-1.5";

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

  const alignClass =
    align === "start"
      ? "justify-start"
      : align === "center"
        ? "justify-center"
        : "justify-end";

  return (
    <div className={`flex flex-wrap items-center ${alignClass} gap-2 ${className}`}>
      {showLabel && (
        <span
          className={
            comfortable
              ? "text-base font-medium  sm:text-lg"
              : "text-xs font-medium "
          }
        >
          {t("label")}
        </span>
      )}

      {linkChannels.map(({ key, label, Icon, href }) => (
        <a
          key={key}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={label}
          className={`${iconBtnStyle} ${iconButtonSize}`}
        >
          <Icon size={iconSize} />
        </a>
      ))}

      {/* TODO: 카카오 공유 - JS SDK 앱키 필요 */}
      <button
        type="button"
        disabled
        aria-label={t("kakaoTalk")}
        className={`${iconBtnStyle} ${iconButtonSize} opacity-50 cursor-not-allowed`}
      >
        <MessageCircle size={iconSize} />
      </button>

      <button
        type="button"
        onClick={() => void handleCopy()}
        className={`inline-flex items-center gap-1.5 rounded-full bg-white/5 border ${
          comfortable
            ? "min-h-11 px-3 py-2 text-base sm:text-lg"
            : "px-2.5 py-1.5 text-xs"
        } ${
          copied
            ? "text-accent border-accent/30"
            : "text-text-secondary border-white/10 hover:text-accent hover:border-accent/30"
        }`}
      >
        {copied ? <Check size={iconSize} /> : <Link2 size={iconSize} />}
        <span>{copied ? t("copied") : t("copyLink")}</span>
      </button>
    </div>
  );
}
