/*
  파일명: /components/ui/Layout/Footer.tsx
  기능: 사이트 풋터
  책임: 브랜드·구매 진입점·섹션 링크·언어·저작권을 한 벌로 그린다. 브랜드는 가운데, 구매 진입점은 메뉴 아래 좌우 두 칸에 둔다. 링크는 폭에 따라
        칸 배치만 바뀐다(휴대폰 2열 가운데 → md 4열). 같은 링크를 두 번 그리지 않는다.
        휴대폰·태블릿에서는 하단 고정층(하단 탭 + 도크에 붙는 목차 띠) 높이만큼 아래를 더 비운다.
*/ // ------------------------------

import { Link } from "@/i18n/navigation";
import { getTranslations, getLocale } from "next-intl/server";
import { Youtube } from "lucide-react";
import { FOOTER_SECTIONS, getSupportShopLinks } from "@/constants/navigation";
import { AFFILIATE_PLATFORMS } from "@/constants/affiliatePlatforms";
import { getYoutubeChannel } from "@/constants/youtube";
import Logo from "@/components/ui/Logo";
import LocaleSwitcher from "@/components/shared/LocaleSwitcher";

// 휴대폰에서 손가락으로 누를 수 있게 위아래 여백을 두고, 넓은 화면에서는 줄 간격만 남긴다
const LINK_CLASS = "block rounded-control py-1.5 text-sm md:py-1 md:text-[13px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent";
const SECTION_TITLE_CLASS = "mb-2 block text-[13px] font-semibold text-text-primary md:mb-3";
const META_CLASS = "text-xs text-text-tertiary";

export default async function Footer() {
  const t = await getTranslations();
  const currentYear = new Date().getFullYear();
  const locale = await getLocale();
  const commerceLinks = getSupportShopLinks(locale);
  const youtube = { url: getYoutubeChannel(locale).url, label: t("policy.aboutActivityTitle") };
  const isDev = process.env.NODE_ENV !== "production";
  const isEn = locale === "en";
  const copyright = `© ${currentYear} ${t("layout.footer.copyright")}`;

  return (
    <footer className="w-full border-t border-line bg-bg-secondary text-text-primary">
      <div className="mx-auto max-w-4xl px-6 pt-10 pb-[calc(var(--layer-bottom-chrome-h)+2rem)] md:px-8 md:pt-14 md:pb-[calc(var(--layer-bottom-chrome-h)+2.5rem)]">
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
                  <Link key={link.href} href={link.href} className={`${LINK_CLASS} text-text-secondary hover:text-text-primary`}>
                    {t(`nav.footer.${link.key}`)}
                  </Link>
                ))}
              </nav>
            </div>
          ))}
        </div>

        {commerceLinks.length > 0 && <nav aria-label={t("support.tabs.label")} className="mt-3 grid grid-cols-2 gap-4 text-center md:mt-4 md:gap-8">
          {commerceLinks.map((link) => (
            <Link key={link.href} href={link.href} className="flex min-h-11 flex-col justify-center rounded-control px-2 py-1 text-text-secondary hover:text-accent active:text-accent-dim focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
              <span className="text-sm font-semibold">{t(`nav.footer.${link.key}`)}</span>
              <span className="mt-1 text-xs">{t(link.key === "support" ? "support.productsTitle" : "support.shop.productsTitle")}</span>
            </Link>
          ))}
        </nav>}

        {/* 채널·언어 · 저작권 — 휴대폰은 가운데로 쌓고, 넓은 화면은 저작권 왼쪽·채널 오른쪽 */}
        <div className="mt-4 flex flex-col items-center gap-3 border-t border-line pt-4 md:mt-5 md:flex-row-reverse md:justify-between md:pt-5">
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
