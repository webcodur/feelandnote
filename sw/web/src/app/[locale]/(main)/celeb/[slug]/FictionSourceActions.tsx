import { ArrowUpRight, BookOpenText, ShoppingBag } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import type { FictionSourceContent } from "@/actions/fiction/getFictionSources";
import { AFFILIATE_PLATFORMS } from "@/constants/affiliatePlatforms";

interface FictionSourceActionsProps {
  source: FictionSourceContent;
  className: string;
  compact?: boolean;
}

export default function FictionSourceActions({
  source,
  className,
  compact = false,
}: FictionSourceActionsProps) {
  const locale = useLocale();
  const t = useTranslations("celebPage");
  const purchaseUrl = locale === "en" ? source.amazonUrl : source.coupangUrl;
  const purchaseLabel = locale === "en" ? "sourceWorkBuyAmazon" : "sourceWorkBuyCoupang";
  const contentHref = `${locale === "en" ? "/en" : ""}/content/${source.id}?category=${source.category}`;

  return (
    <div className={`relative z-10 ${className}`}>
      <a
        href={contentHref}
        className="effect-bevel group inline-flex min-h-11 w-full items-center justify-center gap-2 whitespace-nowrap border border-accent bg-accent px-3 py-2.5 text-sm font-black text-bg-secondary hover:bg-accent-hover active:bg-accent-dim focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg-card"
      >
        <BookOpenText size={17} aria-hidden />
        {t("sourceWorkOpen")}
        {!compact && (
          <ArrowUpRight
            size={16}
            className="transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
            aria-hidden
          />
        )}
      </a>

      {purchaseUrl && (
        <div className="w-full">
          <a
            href={purchaseUrl}
            target="_blank"
            rel="noopener noreferrer nofollow sponsored"
            className="effect-engraved group inline-flex min-h-11 w-full items-center justify-center gap-2 whitespace-nowrap border border-stone-light bg-bg-secondary px-3 py-2.5 text-sm font-black text-text-primary hover:border-accent hover:bg-accent/10 hover:text-accent active:bg-accent/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <ShoppingBag size={17} aria-hidden />
            {t(purchaseLabel)}
            {!compact && (
              <ArrowUpRight
                size={16}
                className="transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                aria-hidden
              />
            )}
          </a>
          {locale === "ko" && (
            <p className="mt-2 text-sm leading-relaxed text-text-tertiary">
              {AFFILIATE_PLATFORMS.coupang.notice}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
