import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';

export default async function NotFound() {
  const t = await getTranslations('notFound');

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 text-center">
      <div className="text-5xl mb-6 opacity-30">🏛️</div>

      <h2 className="font-serif text-xl sm:text-2xl text-text-primary mb-3">
        {t('title')}
      </h2>

      <p className="text-text-secondary text-sm sm:text-base mb-8 max-w-md">
        {t('description')}
      </p>

      <Link
        href="/"
        className="px-6 py-2.5 rounded-lg bg-accent/10 text-accent border border-accent/20 hover:bg-accent/20 font-serif text-sm"
      >
        {t('backHome')}
      </Link>
    </div>
  );
}
