/*
  파일명: /app/(main)/about/AboutBody.tsx
  기능: 서비스 소개 본문(지향점·등록 현황·제작 방식)
  책임: /about 페이지 본문을 그린다. 첫인사 액자는 홈(HomeIntroPanel)이 맡으므로 여기 없다.
        운영·문의 구획도 상설 페이지(/about) 쪽 파일에 따로 있다.
*/

import { getTranslations, getLocale } from "next-intl/server";
import CelebAvatarImage from "@/components/ui/CelebAvatarImage";
import type { AboutShowcase } from "@/actions/policy/getAboutShowcase";
import { Link } from "@/i18n/navigation";
import { ChevronRight } from "lucide-react";
import VisionShowcase from "./VisionShowcase";
import InfoPeek from "./InfoPeek";

/** 구획 머리 — 제목이 새 판의 시작을 알린다. 장식선은 앞 구획의 마감(SectionClose)이 맡는다 */
function SectionHead({
  title,
  lead,
  breakLead,
}: {
  title: string;
  lead?: string;
  /** 머리글을 문장마다 줄 바꿔 세운다 */
  breakLead?: boolean;
}) {
  return (
    <div className="space-y-4 text-center">
      <h2 className="font-serif text-2xl md:text-3xl text-text-primary">{title}</h2>
      {lead && (
        <p className="text-base md:text-lg leading-relaxed text-text-secondary max-w-2xl mx-auto">
          {breakLead
            ? lead.split(/(?<=[.!?])\s+/).map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))
            : lead}
        </p>
      )}
    </div>
  );
}

/** 구획 마감선 — 끝난 구획 바로 아래 붙는 장식 없는 긴 수평선. 다음 제목과는 큰 여백으로 떨어진다 */
function SectionClose() {
  return <div aria-hidden className="h-px w-full bg-border mt-2" />;
}

/** 지향점 각 갈래가 실제로 사는 화면. 이야기가 끝난 자리의 문이 여기로 열린다 */
const VISION_DOORS: Record<1 | 2 | 3 | 4, string> = {
  1: "/explore/figures",
  2: "/explore/faction",
  3: "/explore/today",
  4: "/login",
};

export default async function AboutBody({ showcase }: { showcase: AboutShowcase }) {
  const t = await getTranslations("policy");
  const locale = await getLocale();
  const tNav = await getTranslations("shared.hubSection");
  const showcaseLabels = {
    facesNote: t("aboutVisionFacesNote"),
    yourSlot: t("aboutVisionYourSlot"),
    prev: tNav("previous"),
    next: tNav("next"),
  };
  // 첫인사 액자는 홈(HomeIntroPanel)이 맡는다. 여기서는 표어만 받아 페이지 끝에 찍는다
  const introSub = (await getTranslations("home.ui.intro"))("introSub");

  return (
    <div className="space-y-20 md:space-y-28 text-text-primary">
      {/* 지향점 — 네 갈래를 한 장씩 세운다 */}
      <section className="space-y-8">
        <SectionHead title={t("aboutVisionTitle")} />

        <ol className="space-y-6">
          {([1, 2, 3, 4] as const).map((n) => (
            <li key={n} className="card-sarcophagus p-5 md:p-8 space-y-4">
              <div className="flex items-baseline justify-center gap-4">
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
              {/* 03은 문 없이 이야기로만 둔다 */}
              {n !== 3 && (
                <div className="pt-2 text-right">
                  <Link
                    href={VISION_DOORS[n]}
                    className="group inline-flex items-center gap-1 text-sm text-accent hover:text-accent-hover font-medium"
                  >
                    {t(`aboutVision${n}Link`)}
                    <ChevronRight size={15} strokeWidth={2} aria-hidden />
                  </Link>
                </div>
              )}
            </li>
          ))}
        </ol>
        <SectionClose />
      </section>

      {/* 현황 — 글로 적은 규모는 이내 사실과 어긋나므로 수치는 저장소에서 읽어 세운다 */}
      <section className="space-y-8">
        <SectionHead title={t("aboutWhatTitle")} />

        <div className="grid grid-cols-3 gap-3 md:gap-4">
          {(
            [
              [showcase.counts.celebs, t("aboutCountCelebs"), t("aboutCountCelebsDesc")],
              [showcase.counts.records, t("aboutCountRecords"), t("aboutCountRecordsDesc")],
              [showcase.counts.factions, t("aboutCountFactions"), t("aboutCountFactionsDesc")],
            ] as const
          ).map(([value, label, desc]) => (
            <InfoPeek
              key={label}
              info={{ heading: label, facts: [], body: desc }}
              className="engraved-plate rounded-lg px-3 py-6 md:py-8"
            >
              <span className="block text-center">
                <span className="block font-cinzel text-3xl md:text-5xl text-3d-gold-bright leading-none">
                  {value.toLocaleString(locale)}
                </span>
                <span className="mt-3 block text-sm md:text-base text-text-secondary">{label}</span>
              </span>
            </InfoPeek>
          ))}
        </div>
        <SectionClose />
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
                <CelebAvatarImage
                  src={showcase.evidence.avatarUrl}
                  alt={showcase.evidence.celebName}
                  sizes="48px"
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
        <SectionClose />
      </section>


      {/* 마지막 초대 — 소개의 진짜 끝. 운영·문의는 이 아래 부록으로 가라앉는다 */}
      <section className="text-center space-y-7">
        <h2 className="font-serif text-2xl md:text-3xl text-text-primary">{t("aboutInviteTitle")}</h2>
        <div className="flex flex-wrap items-center justify-center gap-3 md:gap-4">
          <Link
            href="/explore/figures"
            className="rounded-lg border border-accent-dim px-6 py-3 text-base text-accent hover:text-accent-hover hover:border-accent font-medium"
          >
            {t("aboutInviteFigures")}
          </Link>
          <Link
            href="/explore/faction"
            className="rounded-lg border border-accent-dim px-6 py-3 text-base text-accent hover:text-accent-hover hover:border-accent font-medium"
          >
            {t("aboutInviteFaction")}
          </Link>
        </div>

        {/* 표어 — 마무리 도장. 끝나는 느낌은 여기서만 난다 */}
        <div className="pt-4 flex flex-col items-center gap-5">
          <div aria-hidden className="flex items-center gap-4">
            <span className="h-[1px] w-16 md:w-24 bg-gradient-to-r from-transparent via-accent/50 to-accent/80" />
            <span className="w-1.5 h-1.5 md:w-2 md:h-2 rotate-45 bg-accent shadow-[0_0_10px_theme(colors.accent)]" />
            <span className="h-[1px] w-16 md:w-24 bg-gradient-to-l from-transparent via-accent/50 to-accent/80" />
          </div>
          <p className="flex flex-col items-center gap-2 text-center drop-shadow-sm tracking-[0.2em]">
            {introSub.split("\n").map((line, i) => (
              <span
                key={line}
                className={
                  i === 0
                    ? "text-[13.5px] md:text-base text-text-primary font-medium"
                    : "text-[13.5px] md:text-base text-[#E6D5A7] font-medium"
                }
              >
                {line}
              </span>
            ))}
          </p>
        </div>
      </section>
    </div>
  );
}

export { SectionHead, SectionClose };
