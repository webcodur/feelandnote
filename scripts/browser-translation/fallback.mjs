export function environment({ ua = navigator.userAgent, platform = navigator.platform,
  touches = navigator.maxTouchPoints, api = typeof globalThis.Translator !== 'undefined' } = {}) {
  const ios = /iPhone|iPad|iPod/i.test(ua) || (platform === 'MacIntel' && touches > 1);
  const android = /Android/i.test(ua);
  const embedded = /MicroMessenger|FBAN|FBAV|Instagram|; wv\)/i.test(ua);
  const browser = /CriOS|Chrome\//i.test(ua) ? 'chrome' : 'other';
  return { api, kind: ios ? 'ios' : android ? 'android' : 'desktop', embedded, browser };
}

export function fallback(env) {
  if (env.kind === 'ios' && env.browser === 'chrome' && !env.embedded) return { key: 'iosChrome',
    url: 'https://support.google.com/chrome/answer/173424?co=GENIE.Platform%3DiOS', method: 'page-translation' };
  if (env.kind === 'ios') return { key: env.embedded ? 'iosApp' : 'ios',
    url: 'https://support.apple.com/guide/iphone/iph1fbef4daa/ios', method: 'page-translation' };
  if (env.kind === 'android') return { key: env.embedded ? 'androidApp' : 'android',
    url: 'https://support.google.com/chrome/answer/173424?co=GENIE.Platform%3DAndroid', method: 'page-translation' };
  return { key: 'desktop', url: 'https://support.google.com/chrome/answer/173424', method: 'page-translation' };
}
