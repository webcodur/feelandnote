import { getRequestConfig } from 'next-intl/server';
import { hasLocale } from 'next-intl';
import { routing } from './routing';

/** 메시지 네임스페이스 — 추가 시 여기만 수정 */
const NAMESPACES = [
  'core', 'nav', 'home', 'auth', 'explore', 'agora',
  'scriptures', 'content', 'profile', 'celeb', 'rest', 'flow', 'reading',
] as const;

async function loadMessages(locale: string) {
  const bundles = await Promise.all(
    NAMESPACES.map(ns => import(`../../messages/${locale}/${ns}.json`).then(m => m.default))
  );
  return Object.assign({}, ...bundles);
}

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;

  return {
    locale,
    messages: await loadMessages(locale),
  };
});
