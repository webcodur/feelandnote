import type { CSSProperties } from 'react';
import { getTranslations } from 'next-intl/server';
import { CELEB_HERO_PHOTO_SPEC } from '@feelandnote/shared/constants/celeb-hero-photo';
import type { CelebIdentity } from '@/lib/celeb/identity';
import { resolveCelebWorld } from '@/lib/celeb/world';
import { getWorldStyle } from '@/lib/celeb/worldStyle';
import { getWorldBannerImages } from '@/lib/celeb/worldImages';
import CelebWorldBannerView from '@/components/features/celeb/CelebWorldBannerView';
import HubSection from '@/components/shared/HubSection';
import { PendingBlock } from '@/components/ui/pending';
import type { Locale } from '@/types/locale';
import HeroIdentity from './detail/hero/HeroIdentity';
import HeroPhoto from './detail/hero/HeroPhoto';
import styles from './CelebPageContent.module.css';

/** Real identity while the full document is generated; counts wait for their actual query. */
export default async function CelebPagePreview({ identity, locale }: { identity: CelebIdentity; locale: string }) {
  const t = await getTranslations('celebPage');
  const pending = await getTranslations('pending');
  const worldId = resolveCelebWorld({ nationality: identity.nationality, birthDate: identity.birth_date,
    deathDate: identity.death_date, reality: identity.celeb_reality });
  return (
    <div className={styles.page} data-page-identity>
      <HubSection id="introduction" title={t('serviceIntroduction')} index={0} total={1} hideDivider className={styles.opening}>
        <div className={styles.openingFrame}>
          <div className={styles.bannerStage}><CelebWorldBannerView worldId={worldId} images={getWorldBannerImages(worldId)} /></div>
          <div className={styles.identityPanel} style={{ '--celeb-hero-photo-width': `${CELEB_HERO_PHOTO_SPEC.desktopWidthPx}px` } as CSSProperties}>
            <div className={`${styles.heroColumn} ${identity.photo_url ? '' : styles.avatarHeroColumn}`}>
              <HeroPhoto profile={identity} nickname={identity.nickname} locale={locale as Locale}
                frame={getWorldStyle(worldId).frame} hasGreetingAudio={false} isVoiceActive={false} onGreet={undefined} />
            </div>
            <div className={styles.identityCopy}>
              <HeroIdentity profile={identity} locale={locale as Locale} preview />
              <div className={styles.identityNarrative}>{identity.bio && <p className={styles.bio}>{identity.bio}</p>}</div>
            </div>
          </div>
        </div>
      </HubSection>
      <PendingBlock variant="panel" label={pending('loading')} />
    </div>
  );
}
