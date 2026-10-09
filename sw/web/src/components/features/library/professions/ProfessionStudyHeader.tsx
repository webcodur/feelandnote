import Image from 'next/image'

const PLATES: Record<string, string> = {
  leader: 'leader-compass',
  politician: 'politician-balance',
  commander: 'commander-map',
  entrepreneur: 'entrepreneur-gears',
  investor: 'investor-growth',
  scientist: 'scientist-pendulum',
  humanities_scholar: 'humanities-folio',
  social_scientist: 'social-scientist-distribution',
  director: 'director-camera',
  musician: 'musician-score',
  visual_artist: 'visual-artist-perspective',
  author: 'author-nib',
  actor: 'actor-blocking',
  influencer: 'influencer-microphone',
  athlete: 'athlete-stopwatch',
}

export default function ProfessionStudyHeader({ profession, label, description, caption }: {
  profession: string; label: string; description?: string | null; caption?: string;
}) {
  const plate = PLATES[profession]
  return <div data-profession-study-header={profession}
    className="mx-auto flex w-full min-w-0 max-w-md flex-col items-center text-center">
    <h3 id="profession-overview-heading" className="text-xl font-semibold tracking-tight text-text-primary sm:text-2xl">{label}</h3>
    {description && <p className="mt-2 max-w-sm text-sm leading-7 text-text-secondary">{description}</p>}
    {plate && <figure className="mt-3 w-full max-w-[280px] sm:max-w-[320px] lg:max-w-[360px]">
      <Image src={`/images/library/professions/${plate}.svg`} alt="" width={500} height={280}
        sizes="(min-width: 1024px) 360px, (min-width: 640px) 320px, 280px" className="h-auto w-full" />
      {caption && <figcaption className="mt-1 text-center text-[11px] tracking-[0.08em] text-text-secondary/70 sm:text-xs">{caption}</figcaption>}
    </figure>}
  </div>
}
