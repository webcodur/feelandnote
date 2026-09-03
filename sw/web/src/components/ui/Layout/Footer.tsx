import { Link } from "@/i18n/navigation";
import { getTranslations, getLocale } from "next-intl/server";
import { Youtube } from "lucide-react";
import { FOOTER_SECTIONS } from "@/constants/navigation";
import { getYoutubeChannel } from "@/constants/youtube";
import Logo from "@/components/ui/Logo";
import LocaleSwitcher from "@/components/shared/LocaleSwitcher";

const linkClassName = "block text-[13px] text-text-secondary hover:text-white font-sans";

const DecorativeBorder = () => (
  <div className="absolute inset-x-0 top-0 z-20">
    <div
      className="w-full h-3"
      style={{
        background: "linear-gradient(to bottom, #000000, #050505 40%, transparent)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04), 0 1px 3px rgba(0,0,0,0.6)",
      }}
    />
    <div className="w-full h-px bg-gradient-to-r from-transparent via-accent/15 to-transparent" />
  </div>
);

/** 유튜브 채널 표시 — 언어에 맞는 채널로 새 창에서 연다 */
const YoutubeLink = ({ size, url, label }: { size: number; url: string; label: string }) => (
  <a
    href={url}
    target="_blank"
    rel="noopener noreferrer"
    aria-label={label}
    title={label}
    className="text-text-secondary hover:text-accent"
  >
    <Youtube size={size} strokeWidth={1.5} aria-hidden />
  </a>
);

export default async function Footer() {
  const t = await getTranslations();
  const currentYear = new Date().getFullYear();
  const locale = await getLocale();
  const youtube = { url: getYoutubeChannel(locale).url, label: t("policy.aboutActivityTitle") };

  const isDev = process.env.NODE_ENV !== "production";
  const isEn = locale === "en";
  const sectionTitleClassName = isEn
    ? "text-xs font-cinzel font-semibold tracking-[0.2em] text-accent/70 mb-3.5 block uppercase"
    : "text-xs font-sans font-semibold tracking-[0.06em] text-accent/75 mb-3.5 block";

  return (
    <>
      {/* PC Footer */}
      <footer className="relative mt-20 w-full bg-[#090909] bg-texture-marble text-text-primary overflow-hidden hidden md:block">
        <DecorativeBorder />

        {/* Background Typography (Watermark) */}
        <div className="absolute inset-0 pointer-events-none select-none flex items-center justify-center">
          <span
            className="font-cormorant font-bold text-[9vw] leading-none whitespace-nowrap text-[#111112]"
            style={{
              textShadow: "0 1px 0 rgba(255,255,255,0.02)",
            }}
          >
            FEEL & NOTE
          </span>
        </div>

        <div className="relative mx-auto px-8 pt-14 pb-10 max-w-4xl z-10">
          {/* Top: Logo & Tagline */}
          <div className="flex flex-col items-center gap-2.5 mb-10 text-center">
            <Logo size="sm" variant="default" />
            <p className="text-xs text-text-secondary font-light tracking-wide">
              {t("layout.footer.tagline")}
            </p>
          </div>

          {/* Navigation - 4 Balanced Columns */}
          <div className="grid grid-cols-4 gap-x-8 text-left">
            {FOOTER_SECTIONS.map((section) => (
              <div key={section.key}>
                {section.href ? (
                  <Link href={section.href} className="inline-block hover:opacity-80">
                    <span className={sectionTitleClassName}>
                      {t(section.titleKey)}
                    </span>
                  </Link>
                ) : (
                  <span className={sectionTitleClassName}>
                    {t(section.titleKey)}
                  </span>
                )}
                <nav className="flex flex-col gap-2">
                  {section.links.map((link) => (
                    <Link key={link.href} href={link.href} className={linkClassName}>
                      {t(`nav.footer.${link.key}`)}
                    </Link>
                  ))}
                </nav>
              </div>
            ))}
          </div>

          {/* Bottom: Pediment */}
          <div className="mt-12 pt-5 border-t border-white/[0.06] flex items-center justify-between">
            {isDev ? (
              <Link
                href="/lab"
                className="text-[11px] font-sans tracking-wider text-text-muted hover:text-text-secondary"
                title="Lab"
              >
                &copy; {currentYear} {t("layout.footer.copyright")}
              </Link>
            ) : (
              <p className="text-[11px] font-sans tracking-wider text-text-muted">
                &copy; {currentYear} {t("layout.footer.copyright")}
              </p>
            )}
            <div className="flex items-center gap-5">
              <YoutubeLink size={18} url={youtube.url} label={youtube.label} />
              <LocaleSwitcher variant="text" />
            </div>
          </div>
        </div>
      </footer>

      {/* Mobile Footer */}
      <footer className="relative mt-16 w-full bg-[#090909] bg-texture-marble text-text-primary overflow-hidden md:hidden">
        <DecorativeBorder />

        <div className="relative mx-auto px-6 pt-10 pb-24 z-10">
          {/* Logo */}
          <div className="flex flex-col items-center mb-8 text-center">
            <Logo size="sm" variant="hero" />
          </div>

          {/* Navigation Sections - 2x2 Grid */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-8 text-center mb-8">
            {FOOTER_SECTIONS.map((section) => (
              <div key={section.key} className="flex flex-col items-center">
                {section.href ? (
                  <Link href={section.href} className="inline-block hover:opacity-80">
                    <span className={sectionTitleClassName}>
                      {t(section.titleKey)}
                    </span>
                  </Link>
                ) : (
                  <span className={sectionTitleClassName}>
                    {t(section.titleKey)}
                  </span>
                )}
                <nav className="flex flex-col gap-2 items-center">
                  {section.links.map((link) => (
                    <Link key={link.href} href={link.href} className={linkClassName}>
                      {t(`nav.footer.${link.key}`)}
                    </Link>
                  ))}
                </nav>
              </div>
            ))}
          </div>

          {/* Language / Social / Copyright */}
          <div className="flex flex-col items-center gap-3 pt-6 border-t border-white/[0.06]">
            <div className="flex items-center gap-5">
              <YoutubeLink size={20} url={youtube.url} label={youtube.label} />
              <LocaleSwitcher variant="text" />
            </div>
            {isDev ? (
              <Link
                href="/lab"
                className="text-[10px] font-sans tracking-wider text-text-muted hover:text-text-secondary"
                title="Lab"
              >
                &copy; {currentYear} {t("layout.footer.copyright")}
              </Link>
            ) : (
              <p className="text-[10px] font-sans tracking-wider text-text-muted">
                &copy; {currentYear} {t("layout.footer.copyright")}
              </p>
            )}
          </div>
        </div>
      </footer>
    </>
  );
}

