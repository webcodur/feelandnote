"use client";

import { ChevronRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import FactionSceneText from './FactionSceneText';
import type { ArtworkSlide } from './artworkSlides';

interface Props {
  slides: ArtworkSlide[];
  activeIndex: number;
  onContinue: (index: number) => void;
  onClose: () => void;
}

/** 화면 밖의 도입·마무리도 마운트해 번역된 본문을 장면 이동 뒤에 보존한다. */
export default function FactionStoryCards({ slides, activeIndex, onContinue, onClose }: Props) {
  const t = useTranslations('explore.hub.myth');
  return slides.map((item, index) => item.card && (
    <div key={`card-${index}`} data-scene-ending={item.cardKind === 'ending' || undefined}
      data-scene-opening={item.cardKind === 'opening' || undefined} data-wheel-pass aria-hidden={activeIndex !== index || undefined}
      className="absolute top-0 h-full w-full overflow-y-auto overscroll-contain"
      style={{ left: activeIndex === index ? 0 : '200%' }}>
      <article className="mx-auto flex min-h-full w-full max-w-2xl flex-col justify-center px-6 py-10 text-center sm:px-10">
        <p className="mb-5 text-xs tracking-[0.2em] text-accent">{t(item.cardKind === 'opening' ? 'storyOpening' : 'storyEnding')}</p>
        <h3 className="mb-8 break-keep text-2xl font-bold text-text-primary sm:text-3xl md:text-balance">{item.card.title}</h3>
        <div className="space-y-5 break-keep text-sm leading-7 text-text-primary sm:text-base sm:leading-8">
          {item.card.text.split(/\n\s*\n/).map((paragraph, paragraphIndex) => <p key={paragraphIndex} className="md:text-balance"><FactionSceneText text={paragraph} /></p>)}
        </div>
        <button type="button" data-story-continue onClick={() => index + 1 < slides.length ? onContinue(index + 1) : onClose()}
          tabIndex={activeIndex === index ? 0 : -1}
          className="mx-auto mt-9 inline-flex min-h-11 items-center gap-2 rounded-lg border border-accent/40 bg-accent/10 px-5 py-2 text-sm text-accent outline-none hover:border-accent hover:bg-accent/20 focus-visible:ring-2 focus-visible:ring-accent">
          {t(item.cardKind === 'opening' ? 'startStory' : index + 1 < slides.length ? 'nextStory' : 'closeStory')}
          <ChevronRight size={16} aria-hidden />
        </button>
      </article>
    </div>
  ));
}
