import { getRequestConfig } from 'next-intl/server';
import { hasLocale } from 'next-intl';
import { routing } from './routing';

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;

  return {
    locale,
    messages: {
      ...(await import(`../../messages/${locale}/core.json`)).default,
      ...(await import(`../../messages/${locale}/nav.json`)).default,
      ...(await import(`../../messages/${locale}/home.json`)).default,
      ...(await import(`../../messages/${locale}/auth.json`)).default,
      ...(await import(`../../messages/${locale}/explore.json`)).default,
      ...(await import(`../../messages/${locale}/agora.json`)).default,
      ...(await import(`../../messages/${locale}/scriptures.json`)).default,
      ...(await import(`../../messages/${locale}/content.json`)).default,
      ...(await import(`../../messages/${locale}/profile.json`)).default,
      ...(await import(`../../messages/${locale}/celeb.json`)).default,
      ...(await import(`../../messages/${locale}/rest.json`)).default,
      ...(await import(`../../messages/${locale}/flow.json`)).default,
      ...(await import(`../../messages/${locale}/reading.json`)).default,
    }
  };
});
