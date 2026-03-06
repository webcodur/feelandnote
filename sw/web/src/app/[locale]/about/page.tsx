import { getTranslations } from "next-intl/server";
import { getAlternates } from "@/lib/seo";
import Logo from "@/components/ui/Logo";

export async function generateMetadata() {
  const t = await getTranslations("pages.about");
  return { title: t("title"), description: t("description"), alternates: getAlternates("/about") };
}

export default async function AboutPage() {
  const t = await getTranslations("aboutPage");

  return (
    <main className="min-h-screen bg-bg-main text-text-primary selection:bg-accent/30 flex flex-col items-center">

      {/* 1. The Question (Title) */}
      <section className="relative flex min-h-[60vh] w-full flex-col items-center justify-center px-6 py-20 text-center">
        {/* Background Texture */}
        <div className="pointer-events-none absolute inset-0 bg-texture-noise opacity-[0.05]" />

        <div className="relative z-10 mb-12 animate-fade-in-up">
          <Logo size="lg" asLink={false} className="opacity-80" />
        </div>

        <h1 className="relative z-10 max-w-3xl animate-fade-in-up font-serif text-3xl font-light leading-relaxed text-text-primary md:text-5xl md:leading-tight [animation-delay:200ms]">
          {t("heroTitle1")}<br />
          {t("heroTitle2")}
        </h1>
      </section>

      {/* 2. The Narrative (Essay) */}
      <section className="relative w-full max-w-2xl px-6 pb-40">

        {/* Paragraph 1: The Problem */}
        <div className="mb-32 animate-fade-in-up [animation-delay:400ms]">
          <p className="font-serif text-lg leading-loose text-text-secondary md:text-xl md:leading-10">
            {t("p1Line1")}<br />
            {t("p1Line2")}<br />
            <br />
            {t("p1Line3")}<br />
            {t("p1Line4")}<br />
            {t("p1Line5")}<br />
            <br />
            <span className="text-text-primary">{t("p1Highlight")}</span>
          </p>
        </div>

        {/* Paragraph 2: The Solution (Feel & Note) */}
        <div className="mb-32">
          <div className="mb-12 flex flex-col gap-12 md:flex-row md:gap-20">
            <div className="flex-1">
              <h2 className="mb-4 font-serif text-2xl text-accent">{t("feelTitle")}</h2>
              <p className="text-sm leading-7 text-text-secondary md:text-base md:leading-8">
                {t("feelDesc1")}<br />
                {t("feelDesc2")}<br />
                {t("feelDesc3")}<br />
                {t("feelDesc4")}
              </p>
            </div>
            <div className="flex-1">
              <h2 className="mb-4 font-serif text-2xl text-accent">{t("noteTitle")}</h2>
              <p className="text-sm leading-7 text-text-secondary md:text-base md:leading-8">
                {t("noteDesc1")}<br />
                {t("noteDesc2")}<br />
                {t("noteDesc3")}<br />
                {t("noteDesc4")}
              </p>
            </div>
          </div>

          <p className="font-serif text-lg leading-loose text-text-primary md:text-xl md:leading-10 text-center">
            {t("promise1")}<br />
            {t("promise2")}<br />
            <span className="underline decoration-accent/30 underline-offset-8 decoration-1">{t("promiseHighlight")}</span>{t("promise3")}
          </p>
        </div>

        {/* Paragraph 3: The Promise (Epilogue) */}
        <div className="border-t border-white/10 pt-20 text-center">
          <p className="mb-12 text-sm leading-8 text-text-secondary md:text-base md:leading-9">
            {t("epilogue1")}<br />
            {t("epilogue2")}<br />
            {t("epilogue3")}<br />
            {t("epilogue4")}
          </p>

          <div className="flex flex-col items-center justify-center gap-2 opacity-60">
             <span className="font-cinzel text-xs tracking-[0.2em] text-accent">{t("fromBuilders")}</span>
             <span className="font-serif text-sm text-text-primary">{t("teamName")}</span>
          </div>
        </div>

      </section>
    </main>
  );
}
