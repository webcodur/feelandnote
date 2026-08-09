/*
  파일명: /app/[locale]/layout.tsx
  기능: Locale 레이아웃
  책임: metadata, NextIntlClientProvider, Footer, GA를 제공한다.
*/ // ------------------------------

import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { setRequestLocale, getMessages, getTranslations } from "next-intl/server";
import Footer from "@/components/ui/Layout/Footer";
import { GoogleAnalytics } from "@next/third-parties/google";
import { GlobalDialogueProvider } from "@/components/features/game/shared/providers/GlobalDialogueProvider";
import { GameAudioProvider } from "@/contexts/GameAudioContext";
import PortraitSharpenFilter from "@/components/shared/PortraitSharpenFilter";
import ServiceWorkerRegistrar from "@/components/pwa/ServiceWorkerRegistrar";
import UiXray from "@/components/shared/ui-xray/UiXray";
import {
  getOrganizationJsonLd,
  SITE_NAME,
  SITE_URL,
} from "@/lib/seo";
import "../globals.css";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "site" });
  const ogLocale = locale === "ko" ? "ko_KR" : "en_US";

  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: t("title"),
      template: t("titleTemplate"),
    },
    description: t("description"),
    // canonical/languages는 레이아웃에서 선언하지 않는다 — 자체 alternates 없는 모든 하위 페이지가 canonical=홈을 상속하는 결함. 각 page.tsx가 자기 경로로 선언한다.
    alternates: {
      types: {
        'application/rss+xml': 'https://feelandnote.com/feed.xml',
      },
    },
    openGraph: {
      title: t("title"),
      description: t("description"),
      url: SITE_URL,
      siteName: SITE_NAME,
      locale: ogLocale,
      alternateLocale: locale === "ko" ? "en_US" : "ko_KR",
      type: "website",
      images: [
        {
          url: "/opengraph-image",
          width: 1200,
          height: 630,
          alt: SITE_NAME,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: t("title"),
      description: t("twitterDescription"),
      images: ["/opengraph-image"],
    },
    verification: {
      google: "Rstp-6NcSTn3BTPnDH06HS5PN2goDih-CVNg",
      other: {
        "naver-site-verification": "693d325afc4dad4701aa2c7c4a29c78f2ee7e445",
      },
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
      },
    },
    keywords: t.raw("keywords") as string[],
    icons: {
      icon: { url: "/icon.png", type: "image/png", sizes: "192x192" },
      apple: "/apple-icon.png",
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const messages = await getMessages({ locale });
  const t = await getTranslations({ locale, namespace: "site" });
  const organizationJsonLd = getOrganizationJsonLd(t("description"));

  return (
    <html
      lang={locale}
      data-scroll-behavior="smooth"
    >
      <head>
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-3751045783335791"
          crossOrigin="anonymous"
        />
        <meta name="google-adsense-account" content="ca-pub-3751045783335791" />
      </head>
      <body>
        <NextIntlClientProvider messages={messages}>
          <GameAudioProvider>
            <GlobalDialogueProvider>
              <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
              />
              <PortraitSharpenFilter />
              <ServiceWorkerRegistrar />
              <UiXray />
              {children}
              <Footer />
              {process.env.NODE_ENV === "production" && (
                <GoogleAnalytics gaId="G-LMVY8KTJ7T" />
              )}
            </GlobalDialogueProvider>
          </GameAudioProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
