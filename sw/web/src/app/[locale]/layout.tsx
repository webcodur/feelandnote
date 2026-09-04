/*
  파일명: /app/[locale]/layout.tsx
  기능: Locale 레이아웃
  책임: metadata, NextIntlClientProvider, Footer, GA를 제공한다.
*/ // ------------------------------

import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { setRequestLocale, getMessages, getTranslations } from "next-intl/server";
import { BASE_MESSAGE_PATHS, pickMessages } from "@/i18n/message-scope";
import Footer from "@/components/ui/Layout/Footer";
import { GoogleAnalytics } from "@next/third-parties/google";
import { GlobalDialogueProvider } from "@/components/features/game/shared/providers/GlobalDialogueProvider";
import { GameAudioProvider } from "@/contexts/GameAudioContext";
import ServiceWorkerRegistrar from "@/components/pwa/ServiceWorkerRegistrar";
import DeploymentNotice from "@/components/layout/DeploymentNotice";
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
      // 두 개다. 앞은 원래 소유 계정, 뒤는 feelandnote@gmail.com 이 26.09.05 에 확인한 URL 접두어
      // 속성(https://feelandnote.com/). 도메인 속성은 DNS 로만 확인되어 그 계정에서는 화면이 안 열린다.
      google: [
        "Rstp-6NcSTn3BTPnDH06HS5PN2goDih-CVNg",
        "T7ZylbeabtPvV55la720kqhWakxGDQDgh6MJ3k4q6ms",
      ],
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
  // 번역 사전 전체(187KB)를 모든 화면에 실으면 ISR로 굳는 상세 한 장마다 HTML·RSC
  // 양쪽에 그대로 복사된다. 여기서는 공통 뼈대만 내리고 화면별 몫은 MessageScope가 덧댄다.
  const messages = pickMessages(await getMessages({ locale }), BASE_MESSAGE_PATHS);
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
              <ServiceWorkerRegistrar />
              <DeploymentNotice />
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
