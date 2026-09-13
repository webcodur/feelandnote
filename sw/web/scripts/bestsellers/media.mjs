import { fetchWithRetry, mapTwo } from './http.mjs';

export async function collectMedia(locale, key, tmdbKey) {
  const collectors = { VIDEO: () => videos(locale, tmdbKey), GAME: () => games(locale), MUSIC: () => music(locale) };
  return collectors[key]();
}

async function videos(locale, key) {
  if (!key) throw new Error('TMDB_API_KEY is required for video charts');
  const language = locale === 'ko' ? 'ko-KR' : 'en-US';
  const res = await fetchWithRetry(`https://api.themoviedb.org/3/trending/all/week?api_key=${key}&language=${language}`);
  const data = await res.json();
  if (!Array.isArray(data.results)) throw new Error('Invalid TMDB response');
  return data.results.filter(item => ['tv', 'movie'].includes(item.media_type)).slice(0, 18).map((item, index) => {
    const title = item.title || item.name;
    const cover = item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : null;
    return {
      id: `tmdb-${item.media_type}-${item.id}`, rank: index + 1, title, creator: '', publisher: 'TMDB',
      thumbnail_url: cover, thumbnail_en: cover, title_ko: locale === 'ko' ? title : null,
      title_en: locale === 'en' ? title : null, creator_en: null,
      published_date: item.release_date || item.first_air_date || null, isbn: null,
      description: item.overview || (locale === 'ko' ? 'TMDB 주간 인기 영상.' : 'TMDB weekly trending title.'),
      type: 'VIDEO', category_key: 'VIDEO',
    };
  });
}

async function games(locale) {
  const language = locale === 'ko' ? 'korean' : 'english';
  const country = locale === 'ko' ? 'KR' : 'US';
  const res = await fetchWithRetry(`https://store.steampowered.com/api/featuredcategories/?l=${language}&cc=${country}`, {
    headers: { 'User-Agent': 'Mozilla/5.0' },
  });
  const data = await res.json();
  if (!Array.isArray(data.top_sellers?.items)) throw new Error('Invalid Steam response');
  const seen = new Set();
  const unique = data.top_sellers.items.filter(item => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
  // 차트의 type:0에는 하드웨어도 포함된다. 앱 상세의 명시적 분류로만 제외한다.
  const checked = await mapTwo(unique, async item => {
    if (item.type !== 0) return item;
    const details = await fetchWithRetry(`https://store.steampowered.com/api/appdetails?appids=${item.id}&l=${language}&cc=${country}`);
    const result = (await details.json())[String(item.id)];
    if (!result?.success || typeof result.data?.type !== 'string') throw new Error('Invalid Steam app details');
    return result.data.type === 'hardware' ? null : item;
  });
  return checked.filter(Boolean).slice(0, 18).map((item, index) => ({
    id: `steam-game-${item.id}`, rank: index + 1, title: item.name, creator: '', publisher: 'Steam',
    thumbnail_url: item.header_image || null, thumbnail_en: item.header_image || null,
    title_ko: locale === 'ko' ? item.name : null, title_en: locale === 'en' ? item.name : null,
    creator_en: null, published_date: null, isbn: null,
    description: locale === 'ko' ? 'Steam 인기 판매 게임.' : 'A top selling title on Steam.',
    type: 'GAME', category_key: 'GAME',
  }));
}

async function music(locale) {
  const country = locale === 'ko' ? 'kr' : 'us';
  const res = await fetchWithRetry(`https://rss.applemarketingtools.com/api/v2/${country}/music/most-played/18/songs.json`);
  const data = await res.json();
  if (!Array.isArray(data.feed?.results)) throw new Error('Invalid Apple Music response');
  return data.feed.results.slice(0, 18).map((item, index) => {
    const cover = item.artworkUrl100?.replace('100x100bb', '600x600bb') || null;
    return {
      id: `apple-music-${country}-${item.id}`, rank: index + 1, title: item.name,
      creator: item.artistName || '', publisher: 'Apple Music', thumbnail_url: cover, thumbnail_en: cover,
      title_ko: item.name, title_en: item.name, creator_en: item.artistName || null,
      published_date: item.releaseDate || null, isbn: null,
      description: locale === 'ko' ? 'Apple Music 최다 재생 차트 수록곡.' : 'Featured on Apple Music’s most-played chart.',
      type: 'MUSIC', category_key: 'MUSIC',
    };
  });
}
