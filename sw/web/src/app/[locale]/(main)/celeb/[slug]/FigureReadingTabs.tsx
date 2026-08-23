"use client";

import { useTranslations } from "next-intl";

import type { CelebBySlugProfile } from "@/actions/user/getCelebBySlug";

import type { ServiceItem } from "./celebServiceItems";

// 인물 탐구 닫음(2026-08-22). 안내만 보여준다.
// 생성 품질이 기준에 못 미쳐 화면에서 내렸다. DB의 interpretive_* 필드는 남아 있다.
// 되살릴 때는 celebServiceItems.ts의 person-explore 항목도 함께 푼다.

interface Props {
  item: ServiceItem;
  reading: CelebBySlugProfile["reading"];
  name: string;
  wikidataQid: string | null;
}

function Paragraphs({ text }: { text: string }) {
  return (
    // 위아래 여백도 구획 상자가 쥔다. 여기서 겹쳐 주면 글 위아래가 제각각 벌어진다
    <div className="mx-auto max-w-3xl space-y-4 font-serif text-[15px] leading-loose text-text-secondary break-keep md:text-base">
      {text.split(/\n\n+/).map((paragraph, index) => (
        <p key={index}>{paragraph}</p>
      ))}
    </div>
  );
}

export default function FigureReadingTabs({ reading, name, wikidataQid }: Props) {
  const t = useTranslations("celebPage");
  if (!reading) return null;

  return (
    <div>
      <Paragraphs text={reading.guide} />

      {wikidataQid && (
        <div className="mx-auto mt-5 max-w-3xl">
          <a
            href={`https://www.wikidata.org/wiki/${wikidataQid}`}
            target="_blank"
            rel="noopener noreferrer"
            title={t("wikipediaLink", { name })}
            aria-label={t("wikipediaLink", { name })}
            // hover 즉각 반응은 색이 쥔다. transition을 걸지 않는다
            className="inline-flex items-center gap-1.5 text-xs text-text-tertiary hover:text-text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4" fill="currentColor">
              <path d="M2.5 5.2h5.1v.9l-1 .2c-.3.1-.4.2-.3.5l2.6 6.6 1.7-4-1.2-2.9c-.2-.4-.3-.5-.7-.5l-.6-.1v-.8h4.6v.8l-.8.2c-.3.1-.4.2-.2.6l1 2.4 1-2.4c.2-.4.1-.5-.2-.6l-.7-.2v-.8h3.6v.8l-.6.1c-.4.1-.6.2-.8.6l-1.7 3.9 1.7 4.1 2.6-6.6c.1-.4 0-.5-.4-.6l-.9-.2v-.8h4.1v.8l-.7.2c-.4.1-.5.3-.7.7l-4 9.8h-1l-2.2-5.2-2.3 5.2h-1L3.7 7c-.2-.4-.3-.6-.7-.7l-.5-.2z" />
            </svg>
            <span>{t("wikipediaLink", { name })}</span>
          </a>
        </div>
      )}
    </div>
  );
}
