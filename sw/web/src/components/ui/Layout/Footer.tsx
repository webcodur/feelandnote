import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import { FOOTER_NAV_ITEMS, FOOTER_BRAND_LINKS, FOOTER_MISC_LINKS } from "@/constants/navigation";
import Logo from "@/components/ui/Logo";
import LocaleSwitcher from "@/components/shared/LocaleSwitcher";

const linkClassName = "block text-sm  hover:text-white transition-colors duration-300 font-sans";
const sectionTitleClassName = "text-xs font-cinzel font-medium tracking-[0.2em] text-accent/50 mb-4";

export default async function Footer() {
  const t = await getTranslations();
  const currentYear = new Date().getFullYear();

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

  return (
    <>
      {/* PC Footer */}
      <footer className="relative mt-20 w-full bg-[#090909] bg-texture-marble text-text-primary overflow-hidden hidden md:block">
        <DecorativeBorder />

        {/* Background Typography (Watermark) */}
        <div className="absolute inset-0 pointer-events-none select-none flex items-center justify-center">
          <span
            className="font-cormorant font-bold text-[10vw] leading-none whitespace-nowrap text-[#111112]"
            style={{
              textShadow: "0 1px 0 rgba(255,255,255,0.03)",
            }}
          >
            FEEL & NOTE
          </span>
        </div>

        <div className="relative mx-auto px-10 pt-14 pb-10 max-w-4xl z-10">
          {/* Top: Logo & Tagline */}
          <div className="flex flex-col items-center gap-3 mb-10">
            <Logo size="sm" variant="default" />
            <p className="text-[11px] font-light tracking-wide">
              {t("layout.footer.tagline")}
            </p>
          </div>

          {/* Navigation */}
          <div className="grid grid-cols-4 gap-x-6 text-center">
            {/* Brand Links Column */}
            <div>
              <p className={sectionTitleClassName}>About</p>
              <nav className="flex flex-col gap-2">
                {FOOTER_BRAND_LINKS.map((link) => (
                  <Link key={link.href} href={link.href} className={linkClassName}>
                    {t(`nav.footer.${link.key}`)}
                  </Link>
                ))}
              </nav>
            </div>

            {/* Main Nav Columns */}
            {FOOTER_NAV_ITEMS.map((item) => (
              <div key={item.key}>
                <Link href={item.href} className="block">
                  <p className={sectionTitleClassName}>
                    {t(`home.${item.key}.englishTitle`)}
                  </p>
                </Link>
                <nav className="flex flex-col gap-2">
                  {item.subLinks!.map((link) => (
                    <Link key={link.href} href={link.href} className={linkClassName}>
                      {link.key ? t(`nav.sub.${link.key}`) : link.label}
                    </Link>
                  ))}
                </nav>
              </div>
            ))}

            {/* Misc Links Column */}
            <div>
              <p className={sectionTitleClassName}>{t("nav.footer.misc")}</p>
              <nav className="flex flex-col gap-2">
                {FOOTER_MISC_LINKS.map((link) => (
                  <Link key={link.href} href={link.href} className={linkClassName}>
                    {t(`nav.footer.${link.key}`)}
                  </Link>
                ))}
              </nav>
            </div>
          </div>

          {/* Bottom: Pediment */}
          <div className="mt-10 pt-5 border-t border-white/[0.06] flex items-center justify-between">
            <Link href="/lab" className="font-cinzel text-[10px] text-accent/20 tracking-[0.3em] hover:text-accent/30 transition-colors">
              {t("layout.footer.neoPantheon")}
            </Link>
            <div className="flex items-center gap-4">
              <LocaleSwitcher variant="text" />
              <p className="text-[10px] font-sans tracking-widest uppercase">
                &copy; {currentYear} {t("layout.footer.copyright")}
              </p>
            </div>
          </div>
        </div>
      </footer>

      {/* Mobile Footer */}
      <footer className="relative mt-20 w-full bg-[#090909] bg-texture-marble text-text-primary overflow-hidden md:hidden">
        <DecorativeBorder />

        <div className="relative mx-auto px-6 py-12 z-10">
          {/* Logo & Tagline */}
          <div className="flex flex-col items-center gap-2 mb-8">
            <Logo size="sm" variant="default" />
            <Link href="/lab" className="text-[10px] font-light tracking-wide hover: transition-colors">
              {t("layout.footer.archiveOfTaste")}
            </Link>
          </div>

          {/* Navigation Sections */}
          <div className="grid grid-cols-2 gap-6 mb-8">
            {/* Brand Links */}
            <div>
              <p className={sectionTitleClassName}>About</p>
              <nav className="flex flex-col gap-2">
                {FOOTER_BRAND_LINKS.map((link) => (
                  <Link key={link.href} href={link.href} className={linkClassName}>
                    {t(`nav.footer.${link.key}`)}
                  </Link>
                ))}
              </nav>
            </div>

            {/* Main Nav Columns */}
            {FOOTER_NAV_ITEMS.map((item) => (
              <div key={item.key}>
                <Link href={item.href} className="block">
                  <p className={sectionTitleClassName}>
                    {t(`home.${item.key}.englishTitle`)}
                  </p>
                </Link>
                <nav className="flex flex-col gap-2">
                  {item.subLinks!.map((link) => (
                    <Link key={link.href} href={link.href} className={linkClassName}>
                      {link.key ? t(`nav.sub.${link.key}`) : link.label}
                    </Link>
                  ))}
                </nav>
              </div>
            ))}

            {/* Misc Links */}
            <div>
              <p className={sectionTitleClassName}>{t("nav.footer.misc")}</p>
              <nav className="flex flex-col gap-2">
                {FOOTER_MISC_LINKS.map((link) => (
                  <Link key={link.href} href={link.href} className={linkClassName}>
                    {t(`nav.footer.${link.key}`)}
                  </Link>
                ))}
              </nav>
            </div>
          </div>

          {/* 언어 전환 + Copyright */}
          <div className="flex flex-col items-center gap-2 pt-5 border-t border-white/[0.06]">
            <LocaleSwitcher variant="text" />
            <p className="text-[10px] font-sans tracking-widest uppercase">
              &copy; {currentYear} FeelDT
            </p>
          </div>
        </div>
      </footer>
    </>
  );
}
