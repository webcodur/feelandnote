/*
  파일명: /app/[locale]/layout.tsx
  기능: Locale 레이아웃
  책임: metadata, NextIntlClientProvider, Footer, GA를 제공한다.
*/ // ------------------------------

import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { setRequestLocale, getMessages, getTranslations, getLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { getAlternates } from "@/lib/seo";
import Footer from "@/components/ui/Layout/Footer";
import { GoogleAnalytics } from "@next/third-parties/google";
import { GlobalDialogueProvider } from "@/components/features/game/shared/providers/GlobalDialogueProvider";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("site");
  const locale = await getLocale();
  const ogLocale = locale === "ko" ? "ko_KR" : "en_US";

  return {
    metadataBase: new URL("https://feelandnote.com"),
    title: {
      default: t("title"),
      template: "%s | Feel&Note",
    },
    description: t("description"),
    alternates: getAlternates("/"),
    openGraph: {
      title: t("title"),
      description: t("description"),
      url: "https://feelandnote.com",
      siteName: "Feel&Note",
      locale: ogLocale,
      alternateLocale: locale === "ko" ? "en_US" : "ko_KR",
      type: "website",
      images: [
        {
          url: "/opengraph-image",
          width: 1200,
          height: 630,
          alt: "Feel&Note",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: "Feel&Note",
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
    keywords: ["감상 기록", "셀럽 추천 책", "셀럽 추천 영화", "독서 목록", "문화 아카이브", "책 추천", "영화 추천", "음악 추천", "감상 철학", "필앤노트", "feelandnote", "book", "movie", "music", "game", "celebrity"],
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
  const messages = await getMessages();

  return (
    <NextIntlClientProvider messages={messages}>
      <GlobalDialogueProvider>
        {children}
        <Footer />
        <GoogleAnalytics gaId="G-LMVY8KTJ7T" />
      </GlobalDialogueProvider>
    </NextIntlClientProvider>
  );
}
