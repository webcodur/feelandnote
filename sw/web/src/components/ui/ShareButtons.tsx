/*
  파일명: /components/ui/ShareButtons.tsx
  기능: SNS 공유 버튼
  책임: 현재 페이지의 정규 URL과 제목을 X·페이스북·링크 복사로 공유한다.
*/ // ------------------------------

"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Twitter, Facebook, Link2, Check, MessageCircle } from "lucide-react";

// #region 상수·타입
const BASE_URL = "https://feelandnote.com";

interface ShareButtonsProps {
  // 공유 텍스트(페이지 제목)
  title: string;
  // 로케일 prefix 없는 경로 (예: /celeb/shakespeare)
  path: string;
  className?: string;
  comfortable?: boolean;
}

const iconBtnStyle =
  "inline-flex items-center justify-center rounded-full bg-white/5 border border-white/10 text-text-secondary hover:text-accent hover:border-accent/30";
// #endregion

export default function ShareButtons({
  title,
  path,
  className = "",
  comfortable = false,
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
      Icon: Twitter,
      href: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedText}`,
    },
    {
      key: "facebook",
      label: "Facebook",
      Icon: Facebook,
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    },
  ];

  const handleCopy = async () => {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`flex flex-wrap items-center justify-end gap-2 ${className}`}>
      <span
        className={
          comfortable
            ? "text-base font-medium text-text-tertiary sm:text-lg"
            : "text-xs font-medium text-text-tertiary"
        }
      >
        {t("label")}
      </span>

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
