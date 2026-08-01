/*
  파일명: /app/(policy)/about/page.tsx
  기능: 서비스 소개 페이지
  책임: Feel&Note가 무엇을 만들려는 곳인지, 어떤 서비스인지, 콘텐츠를 어떻게 만드는지,
        운영 주체와 연락 수단(구 /contact 흡수, #contact 앵커)을 안내한다.
*/

import { getTranslations, getLocale } from "next-intl/server";
import Link from "next/link";
import { getLocalizedAlternates } from "@/lib/seo";
import { Youtube } from "lucide-react";
import { getAboutShowcase } from "@/actions/policy/getAboutShowcase";
import { getYoutubeChannel } from "@/constants/youtube";
import VisionShowcase from "./VisionShowcase";

export async function generateMetadata() {
  const t = await getTranslations("policy");
  return {
    title: t("about"),
    description: t("aboutDescription"),
    alternates: await getLocalizedAlternates("/about"),
  };
}

export default async function AboutPage() {
  const t = await getTranslations("policy");
  const locale = await getLocale();
  const showcase = await getAboutShowcase(locale);
  const showcaseLabels = {
    facesNote: t("aboutVisionFacesNote"),
    yourSlot: t("aboutVisionYourSlot"),
  };

  return (
    <div className="space-y-10 text-text-primary">
      <header className="space-y-4 border-b border-border pb-6">
        <h1 className="text-3xl font-bold">{t("aboutTitle")}</h1>
        <p className="text-text-secondary">{t("aboutDescription")}</p>
      </header>

      {/* 지향점 */}
      <section className="space-y-5">
        <h2 className="text-xl font-bold">{t("aboutVisionTitle")}</h2>
        <p className="text-text-secondary leading-relaxed">
          {t("aboutVisionLead")}
        </p>
        <ol className="space-y-4">
          {([1, 2, 3, 4] as const).map((n) => (
            <li
              key={n}
              className="rounded-lg border border-border bg-bg-card/50 p-4 space-y-2"
            >
              <div className="flex items-baseline gap-3">
                <span className="text-accent-primary font-cormorant text-lg leading-none">
                  {String(n).padStart(2, "0")}
                </span>
                <h3 className="font-bold">{t(`aboutVision${n}Title`)}</h3>
              </div>
              <p className="text-text-secondary leading-relaxed">
                {t(`aboutVision${n}Body`)}
              </p>
              <VisionShowcase index={n} data={showcase} labels={showcaseLabels} />
            </li>
          ))}
        </ol>
      </section>

      {/* 서비스 정의 */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold">{t("aboutWhatTitle")}</h2>
        <p className="text-text-secondary leading-relaxed">
          {t("aboutWhatBody1")}
        </p>
        <p className="text-text-secondary leading-relaxed">
          {t("aboutWhatBody2")}
        </p>
      </section>

      {/* 콘텐츠 제작 방식 */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold">{t("aboutContentTitle")}</h2>
        <p className="text-text-secondary leading-relaxed">
          {t("aboutContentBody")}
        </p>
        <ul className="list-disc pl-5 space-y-2 text-text-secondary leading-relaxed">
          <li>{t("aboutContentItem1")}</li>
          <li>{t("aboutContentItem2")}</li>
          <li>{t("aboutContentItem3")}</li>
        </ul>
      </section>

      {/* 운영 안내 · 문의 */}
      <section id="contact" className="space-y-4 scroll-mt-24">
        <h2 className="text-xl font-bold">{t("aboutOperatorTitle")}</h2>
        <p className="text-text-secondary leading-relaxed">
          {t("aboutOperatorBody")}
        </p>
        <div className="rounded-lg bg-bg-card/50 p-4 border border-border">
          <a
            href="mailto:feelandnote@gmail.com"
            className="text-accent-primary hover:underline font-medium"
          >
            feelandnote@gmail.com
          </a>
        </div>
        <h3 className="text-base font-bold pt-2">{t("contactFeedback")}</h3>
        <p className="text-text-secondary leading-relaxed">
          {t("contactFeedbackDesc")}
        </p>
        <Link
          href="/agora/board/feedback"
          className="inline-block rounded-lg bg-bg-card/50 px-4 py-3 border border-border text-accent-primary hover:underline font-medium"
        >
          {t("contactFeedbackLink")}
        </Link>
      </section>

      {/* 유튜브 채널 — 설명 없이 표시 하나로 둔다 */}
      <section>
        <a
          href={getYoutubeChannel(locale).url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={t("aboutActivityTitle")}
          title={t("aboutActivityTitle")}
          className="inline-flex text-[#FF0000] hover:opacity-80"
        >
          <Youtube size={32} strokeWidth={1.5} aria-hidden />
        </a>
      </section>
    </div>
  );
}
