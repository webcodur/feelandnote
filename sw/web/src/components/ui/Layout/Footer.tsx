/*
  파일명: /components/ui/Layout/Footer.tsx
  기능: 사이트 풋터
  책임: 브랜드·섹션 링크·언어·저작권을 한 벌로 그린다. 브랜드는 가운데, 링크는 폭에 따라
        칸 배치만 바뀐다(휴대폰 2열 가운데 → md 4열). 같은 링크를 두 번 그리지 않는다.
        휴대폰에서는 하단 탭(64px)과 홈 표시줄 높이만큼 아래를 더 비운다.
*/ // ------------------------------

import { Link } from "@/i18n/navigation";
import { getTranslations, getLocale } from "next-intl/server";
import { Youtube } from "lucide-react";
import { FOOTER_SECTIONS } from "@/constants/navigation";
import { AFFILIATE_PLATFORMS } from "@/constants/affiliatePlatforms";
import { getYoutubeChannel } from "@/constants/youtube";
import Logo from "@/components/ui/Logo";
import LocaleSwitcher from "@/components/shared/LocaleSwitcher";

// 휴대폰에서 손가락으로 누를 수 있게 위아래 여백을 두고, 넓은 화면에서는 줄 간격만 남긴다
const LINK_CLASS = "block py-1.5 text-sm text-text-secondary hover:text-text-primary md:py-1 md:text-[13px]";
const SECTION_TITLE_CLASS = "mb-2 block text-[13px] font-semibold text-text-primary md:mb-3";
const META_CLASS = "text-xs text-text-tertiary";

export default async function Footer() {
  const t = await getTranslations();
  const currentYear = new Date().getFullYear();
  const locale = await getLocale();
  const youtube = { url: getYoutubeChannel(locale).url, label: t("policy.aboutActivityTitle") };
  const isDev = process.env.NODE_ENV !== "production";
  const isEn = locale === "en";
  const copyright = `© ${currentYear} ${t("layout.footer.copyright")}`;

  return (
    <footer className="w-full border-t border-line bg-bg-secondary text-text-primary">
      <div className="mx-auto max-w-4xl px-6 pt-10 pb-[calc(4rem+env(safe-area-inset-bottom)+2rem)] md:px-8 md:pt-14 md:pb-10">
        {/* 브랜드 — 가운데 */}
        <div className="mb-8 flex flex-col items-center gap-2 text-center md:mb-10">
          <Logo size="sm" variant="default" />
          <p className="text-sm text-text-secondary">{t("layout.footer.tagline")}</p>
        </div>

        {/* 섹션 링크 — 휴대폰 2열 가운데, 넓은 화면 4열 */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-8 text-center md:grid-cols-4 md:gap-x-8 md:text-left">
          {FOOTER_SECTIONS.map((section) => (
            <div key={section.key}>
              {section.href ? (
                <Link href={section.href} className={`${SECTION_TITLE_CLASS} hover:text-accent`}>
                  {t(section.titleKey)}
                </Link>
              ) : (
                <span className={SECTION_TITLE_CLASS}>{t(section.titleKey)}</span>
              )}
              <nav aria-label={t(section.titleKey)}>
                {section.links.map((link) => (
                  <Link key={link.href} href={link.href} className={LINK_CLASS}>
                    {t(`nav.footer.${link.key}`)}
                  </Link>
                ))}
              </nav>
            </div>
          ))}
        </div>

        {/* 채널·언어 · 저작권 — 휴대폰은 가운데로 쌓고, 넓은 화면은 저작권 왼쪽·채널 오른쪽 */}
        <div className="mt-6 flex flex-col items-center gap-3 border-t border-line pt-8 md:mt-8 md:flex-row-reverse md:justify-between md:pt-10">
          <div className="flex items-center gap-2">
            <a
              href={youtube.url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={youtube.label}
              title={youtube.label}
              className="flex size-11 items-center justify-center rounded-full text-text-secondary hover:bg-white/5 hover:text-text-primary"
            >
              <Youtube size={20} strokeWidth={1.5} aria-hidden />
            </a>
            <LocaleSwitcher variant="text" />
          </div>
          <div className="space-y-1 text-center md:text-left">
            {isDev ? (
              <Link href="/lab" className={`${META_CLASS} hover:text-text-secondary`} title="Lab">
                {copyright}
              </Link>
            ) : (
              <p className={META_CLASS}>{copyright}</p>
            )}
            {isEn && <p className={META_CLASS}>{AFFILIATE_PLATFORMS.amazon.notice}</p>}
          </div>
        </div>
      </div>
    </footer>
  );
}
