/*
  파일명: /app/(policy)/about/page.tsx
  기능: 서비스 소개 페이지
  책임: Feel&Note가 무엇을 만들려는 곳인지, 어떤 서비스인지, 콘텐츠를 어떻게 만드는지,
        운영 주체와 연락 수단(구 /contact 흡수, #contact 앵커)을 안내한다.

  화면 원칙: 정보 나열이 아니라 한 장씩 넘겨 보는 판으로 짠다. 글자는 크게, 색은 또렷하게
  (code-rules.md — 작고 흐린 글씨는 고급이 아니다). 장식은 globals.css의 석판 계열을 쓴다.
*/

import { getTranslations, getLocale } from "next-intl/server";
import Link from "next/link";
import { getLocalizedAlternates } from "@/lib/seo";
import Image from "next/image";
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

/** 구획 머리 — 금색 눈금과 큰 제목으로 판이 바뀌는 것을 알린다 */
function SectionHead({ title, lead }: { title: string; lead?: string }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <span aria-hidden className="w-1.5 h-1.5 rotate-45 bg-accent shadow-glow-sm" />
        <span aria-hidden className="h-px flex-1 bg-gradient-to-r from-accent-dim to-transparent" />
      </div>
      <h2 className="font-serif text-2xl md:text-3xl text-text-primary">{title}</h2>
      {lead && <p className="text-base md:text-lg leading-relaxed text-text-secondary">{lead}</p>}
    </div>
  );
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
    <div className="space-y-20 md:space-y-28 text-text-primary">
      {/* 들머리 */}
      <header className="pt-4 pb-2 text-center space-y-6">
        <h1 className="font-serif text-4xl md:text-5xl text-3d-gold leading-tight">
          {t("aboutTitle")}
        </h1>
        <div className="flex items-center justify-center gap-4">
          <span aria-hidden className="h-px w-16 md:w-24 bg-gradient-to-r from-transparent to-accent-dim" />
          <span aria-hidden className="w-2 h-2 rotate-45 bg-accent shadow-glow" />
          <span aria-hidden className="h-px w-16 md:w-24 bg-gradient-to-l from-transparent to-accent-dim" />
        </div>
        <p className="text-base md:text-lg leading-relaxed text-text-secondary max-w-2xl mx-auto">
          {t("aboutDescription")}
        </p>
      </header>

      {/* 지향점 — 네 갈래를 한 장씩 세운다 */}
      <section className="space-y-8">
        <SectionHead title={t("aboutVisionTitle")} lead={t("aboutVisionLead")} />

        <ol className="space-y-6">
          {([1, 2, 3, 4] as const).map((n) => (
            <li key={n} className="card-sarcophagus p-5 md:p-8 space-y-4">
              <div className="flex items-baseline gap-4">
                <span
                  aria-hidden
                  className="font-cinzel text-3xl md:text-4xl text-3d-gold leading-none shrink-0"
                >
                  {String(n).padStart(2, "0")}
                </span>
                <h3 className="font-serif text-xl md:text-2xl text-text-primary">
                  {t(`aboutVision${n}Title`)}
                </h3>
              </div>
              <p className="text-base leading-relaxed text-text-secondary">
                {t(`aboutVision${n}Body`)}
              </p>
              <VisionShowcase index={n} data={showcase} labels={showcaseLabels} />
            </li>
          ))}
        </ol>
      </section>

      {/* 현황 — 글로 적은 규모는 이내 사실과 어긋나므로 수치는 저장소에서 읽어 세운다 */}
      <section className="space-y-8">
        <SectionHead title={t("aboutWhatTitle")} />

        <div className="grid grid-cols-3 gap-3 md:gap-4">
          {(
            [
              [showcase.counts.celebs, t("aboutCountCelebs")],
              [showcase.counts.records, t("aboutCountRecords")],
              [showcase.counts.factions, t("aboutCountFactions")],
            ] as const
          ).map(([value, label]) => (
            <div key={label} className="engraved-plate rounded-lg px-3 py-6 md:py-8 text-center">
              <div className="font-cinzel text-3xl md:text-5xl text-3d-gold-bright leading-none">
                {value.toLocaleString(locale)}
              </div>
              <div className="mt-3 text-sm md:text-base text-text-secondary">{label}</div>
            </div>
          ))}
        </div>
        <p className="text-sm text-text-secondary">{t("aboutCountNote")}</p>

        <div className="space-y-4">
          <p className="text-base leading-relaxed text-text-secondary">{t("aboutWhatBody1")}</p>
          <p className="text-base leading-relaxed text-text-secondary">{t("aboutWhatBody2")}</p>
        </div>
      </section>

      {/* 제작 방식 — 말로만 두지 않고 실제 기록 한 건을 근거째로 세운다 */}
      <section className="space-y-8">
        <SectionHead title={t("aboutContentTitle")} lead={t("aboutContentBody")} />

        <ul className="space-y-4">
          {[t("aboutContentItem1"), t("aboutContentItem2"), t("aboutContentItem3")].map((item) => (
            <li key={item} className="flex gap-3">
              <span aria-hidden className="mt-2.5 w-1.5 h-1.5 rotate-45 bg-accent-dim shrink-0" />
              <span className="text-base leading-relaxed text-text-secondary">{item}</span>
            </li>
          ))}
        </ul>

        {showcase.evidence && (
          <figure className="card-sarcophagus p-5 md:p-7 space-y-4">
            <div className="flex items-center gap-3">
              <span className="relative block w-12 h-12 rounded-full overflow-hidden border border-accent-dim shrink-0">
                <Image
                  src={showcase.evidence.avatarUrl}
                  alt={showcase.evidence.celebName}
                  fill
                  sizes="48px"
                  className="object-cover"
                />
              </span>
              <span className="text-base text-text-primary font-medium">
                {showcase.evidence.celebName}
                <span className="text-text-secondary font-normal">
                  {" · "}
                  {showcase.evidence.workTitle}
                </span>
              </span>
            </div>

            <blockquote className="border-l-2 border-accent-dim pl-4 text-base leading-relaxed text-text-secondary">
              {showcase.evidence.excerpt}
            </blockquote>

            <figcaption className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-text-secondary">
              <span className="text-accent">{t("aboutEvidenceSource")}</span>
              <a
                href={showcase.evidence.sourceUrl}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="text-accent hover:text-accent-hover underline break-all"
              >
                {showcase.evidence.sourceHost}
              </a>
              <span className="w-full">{t("aboutEvidenceCaption")}</span>
            </figcaption>
          </figure>
        )}
      </section>

      {/* 운영 안내 · 문의 */}
      <section id="contact" className="space-y-6 scroll-mt-24">
        <SectionHead title={t("aboutOperatorTitle")} lead={t("aboutOperatorBody")} />

        <a
          href="mailto:feelandnote@gmail.com"
          className="engraved-plate rounded-lg px-5 py-4 flex items-center justify-center text-base md:text-lg text-accent hover:text-accent-hover font-medium tracking-wide"
        >
          feelandnote@gmail.com
        </a>

        <div className="space-y-3">
          <h3 className="font-serif text-lg text-text-primary">{t("contactFeedback")}</h3>
          <p className="text-base leading-relaxed text-text-secondary">{t("contactFeedbackDesc")}</p>
          <Link
            href="/agora/board/feedback"
            className="inline-block rounded-lg border border-accent-dim px-5 py-3 text-base text-accent hover:text-accent-hover hover:border-accent font-medium"
          >
            {t("contactFeedbackLink")}
          </Link>
        </div>
      </section>

      {/* 유튜브 채널 — 설명 없이 표시 하나로 둔다 */}
      <section className="flex justify-center pb-4">
        <a
          href={getYoutubeChannel(locale).url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={t("aboutActivityTitle")}
          title={t("aboutActivityTitle")}
          className="text-text-secondary hover:text-accent"
        >
          <Youtube size={40} strokeWidth={1.5} aria-hidden />
        </a>
      </section>
    </div>
  );
}
