import { BookOpenText } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import type { FictionSourceContent } from "@/actions/fiction/getFictionSources";
import ContentImage from "@/components/ui/ContentImage";
import FictionSourceActions from "./FictionSourceActions";
import FictionSourceIntroduction from "./FictionSourceIntroduction";

interface FictionSourceFeatureProps {
  source: FictionSourceContent;
  nickname: string;
}

function formatDate(value: string | null, locale: string): string | null {
  if (!value) return null;
  const date = new Date(`${value.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return value;
  if (locale !== "en") {
    const year = String(date.getUTCFullYear()).slice(-2).padStart(2, "0");
    const month = String(date.getUTCMonth() + 1).padStart(2, "0");
    const day = String(date.getUTCDate()).padStart(2, "0");
    return `${year}.${month}.${day}`;
  }
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export default function FictionSourceFeature({
  source,
  nickname,
}: FictionSourceFeatureProps) {
  const locale = useLocale();
  const t = useTranslations("celebPage");
  const releaseDate = formatDate(source.releaseDate, locale);
  const meta = [
    { label: t("sourceWorkPublisher"), value: source.publisher },
    { label: t("sourceWorkReleaseDate"), value: releaseDate },
    { label: "ISBN", value: source.isbn },
  ].filter((item): item is { label: string; value: string } => Boolean(item.value));

  return (
    <div className="relative grid grid-cols-[80px_minmax(0,1fr)] gap-x-3 bg-texture-marble px-3 py-4 sm:grid-cols-[132px_minmax(0,1fr)] sm:gap-x-6 sm:px-4 sm:py-5 md:px-6 lg:grid-cols-[168px_minmax(0,1fr)] lg:gap-x-7 lg:py-7">
      <span className="pointer-events-none absolute inset-y-0 start-0 w-1/3 bg-gradient-to-e from-transparent to-accent/[0.04]" aria-hidden />
      <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-e from-transparent via-accent-dim to-transparent" aria-hidden />

      <div className="relative w-full self-start md:row-span-2 lg:row-span-1">
        <span className="effect-engraved absolute -inset-2 border border-accent-dim/40 bg-stone-heavy" aria-hidden />
        <span className="absolute -bottom-4 -end-4 h-20 w-16 bg-accent/10" aria-hidden />
        <div className="effect-bevel relative aspect-[2/3] overflow-hidden border border-accent/50 bg-bg-secondary shadow-2xl">
          {source.thumbnailUrl ? (
            <ContentImage
              src={source.thumbnailUrl}
              alt={source.title}
              sizes="(max-width: 639px) 80px, (max-width: 1023px) 132px, 168px"
              className="object-cover"
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-accent">
              <BookOpenText size={36} strokeWidth={1.3} aria-hidden />
              <span className="px-4 text-center text-sm font-bold">{source.title}</span>
            </div>
          )}
        </div>
        <FictionSourceActions
          source={source}
          compact
          className="mt-5 hidden flex-col gap-2 lg:flex"
        />
      </div>

      <div className="contents lg:relative lg:block lg:min-w-0">
        <header className="col-start-2 min-w-0 self-center md:self-start">
          <h3 className="text-3d-gold max-w-3xl break-keep text-xl font-black leading-tight sm:text-2xl md:text-3xl">
            {source.title}
          </h3>
          {source.creator && (
            <p className="mt-2 text-sm font-semibold leading-6 text-text-secondary sm:text-base">
              {source.creator}
            </p>
          )}
        </header>

        <div className="col-span-2 min-w-0 md:col-span-1 md:col-start-2">
          <FictionSourceIntroduction
            key={source.id}
            description={source.description || t("sourceWorkIntroductionEmpty")}
            label={t("sourceWorkIntroduction")}
            sourceTitle={source.title}
          />
        </div>

        {meta.length > 0 && (
          <dl className="effect-engraved col-span-2 mt-5 border-s border-t border-stone-light bg-stone-heavy/70 lg:col-span-1">
            {meta.map(({ label, value }) => (
              <div
                key={label}
                className="grid min-h-11 grid-cols-[76px_minmax(0,1fr)] border-b border-e border-stone-light bg-bg-secondary/50 sm:grid-cols-[108px_minmax(0,1fr)]"
              >
                <dt className="effect-engraved flex items-center justify-center border-e border-stone-light px-3 py-2.5 text-center text-sm font-bold text-text-tertiary">
                  {label}
                </dt>
                <dd className="effect-bevel min-w-0 break-words px-4 py-2.5 text-sm font-semibold leading-relaxed text-text-primary">
                  {value}
                </dd>
              </div>
            ))}
          </dl>
        )}

        {source.appearanceDescription ? (
          <div className="col-span-2 mt-5 border-s-2 border-accent bg-accent/[0.06] px-4 py-3 lg:col-span-1">
            <p className="text-sm font-black tracking-[0.16em] text-accent">
              {t("sourceWorkCharacterAppearance", { name: nickname })}
            </p>
            <p className="mt-2 whitespace-pre-line text-base leading-7 text-text-primary">
              {source.appearanceDescription}
            </p>
          </div>
        ) : null}

        <FictionSourceActions
          source={source}
          className="col-span-2 mt-5 flex flex-col gap-2 sm:flex-row lg:hidden"
        />
      </div>
    </div>
  );
}
