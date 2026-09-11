/*
  파일명: /app/[locale]/layout.tsx
  기능: Locale 레이아웃
  책임: metadata, NextIntlClientProvider, Footer, GA를 제공한다.
*/ // ------------------------------

import type { Metadata } from "next";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
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
  if (!hasLocale(routing.locales, locale)) notFound();
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
  // 미들웨어 matcher가 .txt·.xml 같은 확장자 경로를 건너뛰므로 /llms.txt 가 locale="llms.txt"로
  // 여기까지 온다. 검증이 없으면 홈 HTML을 200으로 돌려주는 소프트 404가 된다(26.09.11 실측).
  if (!hasLocale(routing.locales, locale)) notFound();
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
      // ?instant=1 스크립트가 하이드레이션 전에 이 태그의 data-scroll-behavior·style을
      // 직접 고쳐놓는다. 이게 없으면 React가 하이드레이션 때 그 값을 SSR값(smooth)으로
      // 되돌려버려, 700ms 타임아웃이 끝나기도 전에 즉시 스크롤 자체가 무효화된다.
      suppressHydrationWarning
    >
      <head>
        {/* ?instant=1로 들어온 첫 스크롤(해시 이동)만 즉시로 강제한다 — 사이트 전역
            스무스 스크롤(html의 scroll-behavior CSS와 data-scroll-behavior 속성 둘 다)은
            건드리지 않고 이 한 번만 잠깐 꺼서 다시 켠다. head 맨 앞에 둬 본문이 채워지기
            전에, 브라우저·Next.js 어느 쪽이 스크롤을 옮기든 먼저 걸리게 한다.
            suppressHydrationWarning: adsbygoogle이 뜨면 자기 관리 스크립트(pagead/managed/js/...)를
            React가 하이드레이션하기 전에 head 맨 앞에 직접 꽂아 넣는다 — 이 자리가 밀리면서
            React가 이 태그와 속성을 비교해 불일치로 본다. 실제 동작(즉시 스크롤)은 하이드레이션과
            무관하게 이미 파싱 시점에 끝나 있어 경고만 끄면 된다. */}
        <script
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var p=new URLSearchParams(location.search);if(p.get('instant')!=='1')return;var h=document.documentElement;h.style.scrollBehavior='auto';var prevData=h.getAttribute('data-scroll-behavior');h.setAttribute('data-scroll-behavior','auto');setTimeout(function(){h.style.scrollBehavior='';if(prevData===null)h.removeAttribute('data-scroll-behavior');else h.setAttribute('data-scroll-behavior',prevData);p.delete('instant');var qs=p.toString();history.replaceState(null,'',location.pathname+(qs?'?'+qs:'')+location.hash);},700);}catch(e){}})();`,
          }}
        />
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
