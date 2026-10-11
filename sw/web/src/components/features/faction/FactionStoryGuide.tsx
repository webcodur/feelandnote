import Image from 'next/image';
import { useTranslations } from 'next-intl';
import type { StoryGuide } from './storyBoundaries';

export default function FactionStoryGuide({ guide, url, onLoad }: { guide: StoryGuide; url: string; onLoad: (event: React.SyntheticEvent<HTMLImageElement>) => void }) {
  const t = useTranslations('explore.hub.myth');
  const phase = t(guide.phase === 'opening' ? 'storyGuideOpening' : 'storyGuideClosing');
  return (
    <section data-story-guide={guide.phase} aria-label={`${guide.title} · ${phase}`} className="relative h-full">
      <Image src={url} alt="" fill unoptimized draggable={false} onLoad={onLoad} className="object-contain opacity-30 select-none" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/35 to-black/30" />
      <div className="pointer-events-none relative mx-auto flex min-h-full max-w-3xl flex-col items-center justify-center px-14 py-10 text-center sm:px-20">
        <p className="mb-5 text-sm text-accent">{phase}</p>
        <h3 className="whitespace-pre-line break-keep text-2xl font-semibold leading-relaxed text-white md:text-balance md:text-4xl">{guide.title}</h3>
      </div>
    </section>
  );
}
