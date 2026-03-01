import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { FOOTER_NAV_ITEMS, FOOTER_BRAND_LINKS, HOME_SECTIONS } from "@/constants/navigation";
import Logo from "@/components/ui/Logo";

const linkClassName = "block text-sm text-text-tertiary hover:text-white transition-colors duration-300 font-sans";
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
            <p className="text-text-tertiary/30 text-[11px] font-light tracking-wide">
              {t("layout.footer.tagline")}
            </p>
          </div>

          {/* Navigation */}
          <div className="grid grid-cols-5 gap-x-6 text-center">
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
                <p className={sectionTitleClassName}>
                  {HOME_SECTIONS[item.key]?.englishTitle ?? item.key}
                </p>
                <nav className="flex flex-col gap-2">
                  {item.subLinks!.map((link) => (
                    <Link key={link.href} href={link.href} className={linkClassName}>
                      {link.key ? t(`nav.sub.${link.key}`) : link.label}
                    </Link>
                  ))}
                </nav>
              </div>
            ))}
          </div>

          {/* Bottom: Pediment */}
          <div className="mt-10 pt-5 border-t border-white/[0.06] flex items-center justify-between">
            <Link href="/lab" className="font-cinzel text-[10px] text-accent/20 tracking-[0.3em] hover:text-accent/30 transition-colors">
              Neo Pantheon Archive
            </Link>
            <p className="text-[10px] text-text-tertiary/25 font-sans tracking-widest uppercase">
              &copy; {currentYear} FeelDT. All rights reserved.
            </p>
          </div>
        </div>
      </footer>

      {/* Mobile Footer */}
      <footer className="relative mt-20 w-full bg-[#090909] bg-texture-marble text-text-primary overflow-hidden md:hidden">
        <DecorativeBorder />

        <div className="relative mx-auto px-6 py-12 z-10">
          {/* Logo & Tagline */}
          <div className="flex flex-col items-center gap-2 mb-6">
            <Logo size="sm" variant="default" />
            <Link href="/lab" className="text-text-tertiary/40 text-[10px] font-light tracking-wide hover:text-text-tertiary/50 transition-colors">
              Archive of Taste
            </Link>
          </div>

          {/* Brand Links (inline dot-separated) */}
          <nav className="flex items-center justify-center gap-1.5 text-[11px] text-text-tertiary/50 mb-6">
            {FOOTER_BRAND_LINKS.map((link, i) => (
              <span key={link.href} className="flex items-center gap-1.5">
                {i > 0 && <span className="text-white/10">·</span>}
                <Link href={link.href} className="hover:text-white/70 transition-colors">
                  {t(`nav.footer.${link.key}`)}
                </Link>
              </span>
            ))}
          </nav>

          {/* Copyright */}
          <p className="text-center text-[10px] text-text-tertiary/25 font-sans tracking-widest uppercase">
            &copy; {currentYear} FeelDT
          </p>
        </div>
      </footer>
    </>
  );
}
