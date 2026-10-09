import hubStyles from "@/components/shared/HubSection.module.css";
/*
  파일명: /app/(main)/about/page.tsx
  기능: 서비스 소개 페이지
  책임: feelandnote가 무엇을 만들려는 곳인지, 어떤 서비스인지, 콘텐츠를 어떻게 만드는지,
        운영 주체와 연락 수단(구 /contact 흡수, #contact 앵커)을 안내한다.

  화면 원칙: 정보 나열이 아니라 한 장씩 넘겨 보는 판으로 짠다. 글자는 크게, 색은 또렷하게
  (platform-02-code-rules.md — 작고 흐린 글씨는 고급이 아니다). 장식은 globals.css의 석판 계열을 쓴다.

  정책 묶음이 아니라 일반 화면 묶음에 둔다(2026-08-01). 약관·방침은 읽고 나가는 고지문이라
  최소 헤더가 맞지만, 이 화면은 읽고 나서 인물·서가로 들어가야 하므로 네비게이션이 필요하다.
  주소는 /about 그대로라 색인은 유지된다. 읽는 글이 많아 폭은 본문 기준으로 좁혀 둔다.
*/

import { getTranslations, getLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ArrowLeft } from "lucide-react";
import { getLocalizedAlternates } from "@/lib/seo";
import { getAboutShowcase } from "@/actions/policy/getAboutShowcase";
import AboutBody from "./AboutBody";
import AboutContact from "./AboutContact";
import Lane from "@/components/ui/pending/Lane";
import { PendingBlock } from "@/components/ui/pending";
import SupportCallout from "@/components/features/commerce/SupportCallout";
import AsyncIntlProvider from "@/components/shared/AsyncIntlProvider";
import AtlasNavSections from "@/components/shared/atlasNav/AtlasNavSections";
import { ABOUT_SECTIONS, aboutSection } from "./aboutSections";

async function AboutContent({ locale }: { locale: string }) {
  const t = await getTranslations("policy");
  const showcase = await getAboutShowcase(locale);

  // 문의 앵커를 본문과 함께 그려 지연 로딩 뒤에도 문의 위치가 바뀌지 않게 한다.
  return (
    <AsyncIntlProvider>
      <AboutBody showcase={showcase} />
      <AboutContact {...aboutSection(3, t)}>
        <div className="space-y-6">
          <p className="mx-auto max-w-2xl text-center text-base leading-relaxed text-text-secondary md:text-lg">{t("aboutOperatorBody")}</p>
          <SupportCallout />

          <a
            href="mailto:feelandnote@gmail.com"
            className="engraved-plate rounded-lg px-5 py-4 flex items-center justify-center text-base md:text-lg text-accent hover:text-accent-hover font-medium tracking-wide"
          >
            feelandnote@gmail.com
          </a>
        </div>
      </AboutContact>
    </AsyncIntlProvider>
  );
}

export async function generateMetadata() {
  const t = await getTranslations("policy");
  return {
    title: t("aboutMetaTitle"),
    description: t("aboutDescription"),
    alternates: await getLocalizedAlternates("/about"),
  };
}

export default async function AboutPage() {
  const t = await getTranslations("policy");
  const locale = await getLocale();
  return (
    <div className={`max-w-3xl mx-auto text-text-primary ${hubStyles.page}`}>
      <AsyncIntlProvider>
        <AtlasNavSections items={ABOUT_SECTIONS.map((section, index) => ({ key: section.id, sectionId: section.id, chapter: String(index + 1).padStart(2, "0"), label: t(section.titleKey) }))} />
      </AsyncIntlProvider>
      {/* 되돌아가기 — 단일 화면이라 배너·브레드크럼 대신 조용한 문 하나만 둔다 */}
      <div className="pt-2 mb-2">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-accent"
        >
          <ArrowLeft size={14} aria-hidden />
          {t("aboutBackHome")}
        </Link>
      </div>

      {/* 들머리 — 명패 하나로 연다. 첫인사 액자는 홈이 맡으므로 여기 없다.
          설명 문장은 검색용 메타로만 남긴다 */}
      <header className={`text-center space-y-5 ${hubStyles.intro}`}>
        <div aria-hidden className="flex items-center justify-center gap-3">
          <span className="h-px w-16 md:w-24 bg-gradient-to-r from-transparent to-accent-dim" />
          <span className="w-1.5 h-1.5 rotate-45 bg-accent shadow-glow-sm" />
          <span className="h-px w-16 md:w-24 bg-gradient-to-l from-transparent to-accent-dim" />
        </div>
        <h1 className="font-serif text-4xl md:text-5xl text-3d-gold leading-tight">
          {t("aboutTitle")}
        </h1>
      </header>

      <Lane fallback={<PendingBlock variant="panel" minHeight="min-h-80" />}><AboutContent locale={locale} /></Lane>
    </div>
  );
}
