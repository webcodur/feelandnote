import * as cheerio from 'cheerio';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function fetchWithRetry(url, options = {}, retries = 3, delayMs = 1000) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, options);
      if (res.ok) return res;
    } catch (e) {
      if (i === retries - 1) throw e;
    }
    await new Promise(r => setTimeout(r, delayMs * (i + 1)));
  }
  return null;
}

// ==========================================
// 1. 한국어 (KO) 도서 수집 소스
// ==========================================
const KO_BOOK_CATEGORIES = [
  { key: 'ALL', name: '종합', cid: '0', bestType: 'Bestseller' },
  { key: 'HUMANITIES', name: '인문', cid: '656', bestType: 'Bestseller' },
  { key: 'BUSINESS', name: '경제경영', cid: '170', bestType: 'Bestseller' },
  { key: 'FICTION', name: '소설·시', cid: '1', bestType: 'Bestseller' },
  { key: 'STEADY', name: '스테디셀러', cid: '0', bestType: 'SteadySeller' },
];

async function getKakaoMeta(title, kakaoKey) {
  try {
    let cleanTitle = title
      .replace(/\(.*?\)/g, '')
      .replace(/\[.*?\]/g, '')
      .replace(/한정판.*$/, '')
      .replace(/세트.*$/, '')
      .replace(/전\d+권.*$/, '')
      .trim();

    if (!cleanTitle) cleanTitle = title;

    const res = await fetchWithRetry(`https://dapi.kakao.com/v3/search/book?query=${encodeURIComponent(cleanTitle)}&size=1`, {
      headers: { Authorization: `KakaoAK ${kakaoKey}` }
    });
    if (!res || !res.ok) return null;
    const data = await res.json();
    return data.documents?.[0] || null;
  } catch {
    return null;
  }
}

async function scrapeKoBookCategory(cat, kakaoKey) {
  const url = `https://www.aladin.co.kr/shop/common/wbest.aspx?BestType=${cat.bestType}&BranchType=1&CID=${cat.cid}`;
  console.log(`📡 [KO 도서] 알라딘 ${cat.name} 차트 수집 중...`);
  
  const res = await fetchWithRetry(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
  });
  if (!res) return [];
  const html = await res.text();
  const $ = cheerio.load(html);

  const rawItems = [];
  $('div.ss_book_box').each((_, el) => {
    const title = $(el).find('a.bo3').first().text().trim();
    let directCover = $(el).find('img.front_cover, img.cover, td img').first().attr('src');
    if (directCover && directCover.startsWith('//')) directCover = 'https:' + directCover;
    if (directCover) {
      directCover = directCover.replace(/\/coversum\//, '/cover500/').replace(/\/cover200\//, '/cover500/');
    }

    if (title && !rawItems.some(item => item.title === title)) {
      rawItems.push({ title, directCover });
    }
  });

  const topItems = rawItems.slice(0, 18);
  const items = [];
  for (let i = 0; i < topItems.length; i++) {
    const raw = topItems[i];
    const rank = i + 1;
    const meta = kakaoKey ? await getKakaoMeta(raw.title, kakaoKey) : null;

    let coverUrl = meta?.thumbnail || raw.directCover || null;
    if (coverUrl && coverUrl.includes('fname=')) {
      const match = coverUrl.match(/fname=(http[^&]+)/);
      if (match) coverUrl = decodeURIComponent(match[1]).replace(/^http:/, 'https:');
    }

    const titleKo = meta?.title || raw.title;
    const creatorKo = meta?.authors?.join(', ') || '저자 미상';

    // 번역서인지 확인 (역자가 있거나 외서인 경우)
    const isTranslated = (meta?.translators && meta.translators.length > 0);
    let titleEn = null;
    let creatorEn = null;
    let thumbnailEn = null;

    if (isTranslated) {
      try {
        const cleanAuthor = creatorKo.split(',')[0].trim();
        const searchQ = encodeURIComponent(`${cleanAuthor} ${titleKo.split(/[-:(]/)[0].trim()}`);
        const olRes = await fetchWithRetry(`https://openlibrary.org/search.json?q=${searchQ}&limit=1`, {}, 2, 500);
        if (olRes && olRes.ok) {
          const olData = await olRes.json();
          const doc = olData.docs?.[0];
          if (doc && doc.title && !/[\uac00-\ud7af]/.test(doc.title)) {
            titleEn = doc.title;
            creatorEn = doc.author_name?.[0] || null;
            if (doc.cover_i) {
              thumbnailEn = `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`;
            }
          }
        }
      } catch {}
    }

    const description = meta?.contents || `${titleKo} - ${creatorKo} 저. 알라딘 실시간 ${cat.name} 베스트셀러 집계 작품.`;

    items.push({
      id: `bestseller-book-ko-${cat.key.toLowerCase()}-${rank}`,
      rank,
      title: titleKo,
      creator: creatorKo,
      publisher: meta?.publisher || null,
      thumbnail_url: coverUrl,
      thumbnail_en: thumbnailEn || coverUrl,
      title_ko: titleKo,
      title_en: titleEn,
      creator_en: creatorEn,
      published_date: meta?.datetime ? meta.datetime.slice(0, 10) : null,
      isbn: meta?.isbn || null,
      description,
      type: 'BOOK',
      category_key: cat.key,
    });
  }

  return items;
}

// ==========================================
// 2. 영어/글로벌 (EN) 도서 수집 소스 (OpenLibrary + Kakao 한글 매핑)
// ==========================================
async function fetchEnBookTrending(subject, key, kakaoKey) {
  console.log(`📡 [EN 도서] OpenLibrary ${key} 수집 중...`);
  try {
    let url = '';
    if (key === 'ALL') {
      url = 'https://openlibrary.org/trending/weekly.json?limit=18';
    } else {
      url = `https://openlibrary.org/subjects/${subject}.json?limit=18`;
    }

    const res = await fetchWithRetry(url, { headers: { 'User-Agent': 'FeelAndNote/1.0' } });
    if (!res || !res.ok) return [];
    const data = await res.json();
    const works = data.works || [];

    const items = [];
    for (let i = 0; i < works.slice(0, 18).length; i++) {
      const w = works[i];
      const coverId = w.cover_i || w.cover_id;
      const enCoverUrl = coverId ? `https://covers.openlibrary.org/b/id/${coverId}-L.jpg` : null;
      const enAuthor = w.author_name?.[0] || w.authors?.[0]?.name || 'Unknown Author';
      const enTitle = w.title;

      // 카카오 검색을 통한 한국어 번역판 매핑
      let koMeta = null;
      if (kakaoKey) {
        try {
          const cleanEnTitle = enTitle.replace(/[:(-].*$/, '').trim();
          const kRes = await fetchWithRetry(`https://dapi.kakao.com/v3/search/book?query=${encodeURIComponent(cleanEnTitle)}&size=1`, {
            headers: { Authorization: `KakaoAK ${kakaoKey}` }
          }, 2, 500);
          if (kRes && kRes.ok) {
            const kData = await kRes.json();
            koMeta = kData.documents?.[0] || null;
          }
        } catch {}
      }

      // OpenLibrary work description 조회
      let enDescription = null;
      if (w.key) {
        try {
          const workRes = await fetchWithRetry(`https://openlibrary.org${w.key}.json`, {}, 2, 500);
          if (workRes && workRes.ok) {
            const workData = await workRes.json();
            if (workData.description) {
              enDescription = typeof workData.description === 'object' ? workData.description.value : workData.description;
            }
          }
        } catch {}
      }

      if (!enDescription) {
        enDescription = `${enTitle} by ${enAuthor}. Featured on OpenLibrary ${key} bestseller trending.`;
      }

      let koCoverUrl = koMeta?.thumbnail || null;
      if (koCoverUrl && koCoverUrl.includes('fname=')) {
        const match = koCoverUrl.match(/fname=(http[^&]+)/);
        if (match) koCoverUrl = decodeURIComponent(match[1]).replace(/^http:/, 'https:');
      }

      const titleKo = koMeta?.title || null;
      const creatorKo = koMeta?.authors?.join(', ') || null;
      const finalThumb = enCoverUrl || koCoverUrl;

      items.push({
        id: `bestseller-book-en-${key.toLowerCase()}-${i + 1}`,
        rank: i + 1,
        title: enTitle,
        creator: enAuthor,
        publisher: 'OpenLibrary',
        thumbnail_url: koCoverUrl || finalThumb,
        thumbnail_en: enCoverUrl || finalThumb,
        title_ko: titleKo,
        title_en: enTitle,
        creator_en: enAuthor,
        published_date: w.first_publish_year ? String(w.first_publish_year) : null,
        isbn: w.availability?.isbn || koMeta?.isbn || null,
        description: enDescription,
        type: 'BOOK',
        category_key: key,
      });
    }

    return items;
  } catch (e) {
    console.error(`OpenLibrary ${key} 수집 에러:`, e.message);
    return [];
  }
}

// ==========================================
// 3. 영상 (TMDB - KO & EN)
// ==========================================
async function fetchVideoTrending(tmdbKey, locale = 'ko') {
  if (!tmdbKey) return [];
  const lang = locale === 'ko' ? 'ko-KR' : 'en-US';
  console.log(`📡 [${locale.toUpperCase()} 영상] TMDB 주간 트렌딩 (${lang}) 수집 중...`);
  try {
    const res = await fetchWithRetry(`https://api.themoviedb.org/3/trending/all/week?api_key=${tmdbKey}&language=${lang}`);
    if (!res || !res.ok) return [];
    const data = await res.json();
    const results = (data.results || []).slice(0, 18);

    return results.map((m, i) => {
      const titleKo = m.title || m.name || '제목 미상';
      const titleEn = m.original_title || m.original_name || titleKo;
      const date = m.release_date || m.first_air_date || null;
      const poster = m.poster_path ? `https://image.tmdb.org/t/p/w500${m.poster_path}` : null;
      const mediaType = m.media_type === 'tv' ? 'tv' : 'movie';
      const typeLabel = mediaType === 'tv' ? (locale === 'ko' ? '시리즈' : 'TV Series') : (locale === 'ko' ? '영화' : 'Movie');

      const desc = m.overview && m.overview.trim() 
        ? m.overview.trim() 
        : (locale === 'ko' 
            ? `${titleKo} (${date ? date.slice(0, 4) : '최신작'}) - TMDB 주간 인기 ${typeLabel}.`
            : `${titleEn} (${date ? date.slice(0, 4) : 'Latest'}) - TMDB Trending ${typeLabel}.`);

      return {
        id: `tmdb-${mediaType}-${m.id}`,
        rank: i + 1,
        title: locale === 'ko' ? titleKo : titleEn,
        creator: locale === 'ko' ? titleKo : titleEn,
        publisher: 'TMDB',
        thumbnail_url: poster,
        thumbnail_en: poster,
        title_ko: titleKo,
        title_en: titleEn,
        creator_en: titleEn,
        published_date: date,
        isbn: null,
        description: desc,
        type: 'VIDEO',
        category_key: 'VIDEO',
      };
    });
  } catch (e) {
    console.error(`TMDB ${locale} 수집 에러:`, e.message);
    return [];
  }
}

// ==========================================
// 4. 게임 (Steam - KO & EN)
// ==========================================
async function fetchGameTrending(locale = 'ko') {
  const lang = locale === 'ko' ? 'korean' : 'english';
  console.log(`📡 [${locale.toUpperCase()} 게임] Steam 실시간 인기 게임 (${lang}) 수집 중...`);
  try {
    const res = await fetchWithRetry(`https://store.steampowered.com/api/featuredcategories/?l=${lang}`, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    if (!res || !res.ok) return [];
    const data = await res.json();
    const items = (data.top_sellers?.items || []).slice(0, 18);

    const gameItems = [];
    for (let i = 0; i < items.length; i++) {
      const g = items[i];
      let desc = null;

      // Steam 상세 synopsis 조회
      try {
        const detailRes = await fetchWithRetry(`https://store.steampowered.com/api/appdetails?appids=${g.id}&l=${lang}`, {}, 2, 300);
        if (detailRes && detailRes.ok) {
          const detailData = await detailRes.json();
          desc = detailData[String(g.id)]?.data?.short_description || null;
        }
      } catch {}

      if (!desc) {
        desc = locale === 'ko' 
          ? `${g.name} - Steam 실시간 최고 인기 순위 집계 게임.`
          : `${g.name} - Top selling title on Steam global charts.`;
      }

      gameItems.push({
        id: `steam-game-${g.id}`,
        rank: i + 1,
        title: g.name,
        creator: 'Steam',
        publisher: 'Valve',
        thumbnail_url: g.header_image || `https://cdn.akamai.steamstatic.com/steam/apps/${g.id}/header.jpg`,
        thumbnail_en: g.header_image || `https://cdn.akamai.steamstatic.com/steam/apps/${g.id}/header.jpg`,
        title_ko: g.name,
        title_en: g.name,
        creator_en: 'Steam',
        published_date: null,
        isbn: null,
        description: desc,
        type: 'GAME',
        category_key: 'GAME',
      });
    }

    return gameItems;
  } catch (e) {
    console.error(`Steam ${locale} 수집 에러:`, e.message);
    return [];
  }
}

// ==========================================
// 5. 음악 (Apple Music - KR & US/Global)
// ==========================================
async function fetchMusicTrending(locale = 'ko') {
  const country = locale === 'ko' ? 'kr' : 'us';
  console.log(`📡 [${locale.toUpperCase()} 음악] Apple Music Top 차트 (${country.toUpperCase()}) 수집 중...`);
  try {
    const res = await fetchWithRetry(`https://rss.applemarketingtools.com/api/v2/${country}/music/most-played/18/songs.json`, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    }, 3, 1000);
    if (!res || !res.ok) return [];
    const data = await res.json();
    const results = (data.feed?.results || []).slice(0, 18);

    return results.map((s, i) => {
      let artwork = s.artworkUrl100 || null;
      if (artwork) artwork = artwork.replace(/100x100bb/, '600x600bb');

      const desc = locale === 'ko'
        ? `${s.artistName}의 인기 음원 '${s.name}'. ${s.releaseDate ? `${s.releaseDate.slice(0, 4)}년 발매.` : ''} Apple Music 주간 최다 스트리밍 차트 상위권 선정작.`
        : `Featured track '${s.name}' by ${s.artistName}. ${s.releaseDate ? `Released in ${s.releaseDate.slice(0, 4)}.` : ''} Ranked on Apple Music Most-Played charts.`;

      return {
        id: `apple-music-${country}-${s.id}`,
        rank: i + 1,
        title: s.name,
        creator: s.artistName,
        publisher: 'Apple Music',
        thumbnail_url: artwork,
        thumbnail_en: artwork,
        title_ko: s.name,
        title_en: s.name,
        creator_en: s.artistName,
        published_date: s.releaseDate || null,
        isbn: null,
        description: desc,
        type: 'MUSIC',
        category_key: 'MUSIC',
      };
    });
  } catch (e) {
    console.error(`Apple Music ${locale} 수집 에러:`, e.message);
    return [];
  }
}

async function main() {
  const envPath = path.resolve(__dirname, '../.env');
  const env = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
  const kakaoMatch = env.match(/KAKAO_REST_API_KEY=(.+)/);
  const kakaoKey = kakaoMatch ? kakaoMatch[1].trim() : '';

  const tmdbMatch = env.match(/TMDB_API_KEY=(.+)/);
  const tmdbKey = tmdbMatch ? tmdbMatch[1].trim() : '';

  const outFile = path.join(path.resolve(__dirname, '../src/constants/library'), 'bestsellers.json');
  let existingData = null;
  if (fs.existsSync(outFile)) {
    try { existingData = JSON.parse(fs.readFileSync(outFile, 'utf8')); } catch {}
  }

  const results = {
    updated_at: new Date().toISOString(),
    ko: { categories: {} },
    en: { categories: {} },
  };

  // --- KO 수집 ---
  for (const cat of KO_BOOK_CATEGORIES) {
    const items = await scrapeKoBookCategory(cat, kakaoKey);
    results.ko.categories[cat.key] = (items && items.length > 0) ? items : (existingData?.ko?.categories?.[cat.key] || []);
  }
  
  const koVideo = await fetchVideoTrending(tmdbKey, 'ko');
  results.ko.categories['VIDEO'] = koVideo.length > 0 ? koVideo : (existingData?.ko?.categories?.['VIDEO'] || []);

  const koGame = await fetchGameTrending('ko');
  results.ko.categories['GAME'] = koGame.length > 0 ? koGame : (existingData?.ko?.categories?.['GAME'] || []);

  const koMusic = await fetchMusicTrending('ko');
  results.ko.categories['MUSIC'] = koMusic.length > 0 ? koMusic : (existingData?.ko?.categories?.['MUSIC'] || []);

  // --- EN 수집 ---
  const enAll = await fetchEnBookTrending('', 'ALL', kakaoKey);
  results.en.categories['ALL'] = enAll.length > 0 ? enAll : (existingData?.en?.categories?.['ALL'] || []);

  const enHum = await fetchEnBookTrending('philosophy', 'HUMANITIES', kakaoKey);
  results.en.categories['HUMANITIES'] = enHum.length > 0 ? enHum : (existingData?.en?.categories?.['HUMANITIES'] || []);

  const enBus = await fetchEnBookTrending('business', 'BUSINESS', kakaoKey);
  results.en.categories['BUSINESS'] = enBus.length > 0 ? enBus : (existingData?.en?.categories?.['BUSINESS'] || []);

  const enFic = await fetchEnBookTrending('fiction', 'FICTION', kakaoKey);
  results.en.categories['FICTION'] = enFic.length > 0 ? enFic : (existingData?.en?.categories?.['FICTION'] || []);

  const enSte = await fetchEnBookTrending('classic_literature', 'STEADY', kakaoKey);
  results.en.categories['STEADY'] = enSte.length > 0 ? enSte : (existingData?.en?.categories?.['STEADY'] || []);

  const enVideo = await fetchVideoTrending(tmdbKey, 'en');
  results.en.categories['VIDEO'] = enVideo.length > 0 ? enVideo : (existingData?.en?.categories?.['VIDEO'] || []);

  const enGame = await fetchGameTrending('en');
  results.en.categories['GAME'] = enGame.length > 0 ? enGame : (existingData?.en?.categories?.['GAME'] || []);

  const enMusic = await fetchMusicTrending('en');
  results.en.categories['MUSIC'] = enMusic.length > 0 ? enMusic : (existingData?.en?.categories?.['MUSIC'] || []);

  // 하위 호환성
  results.categories = results.ko.categories;

  fs.writeFileSync(outFile, JSON.stringify(results, null, 2), 'utf8');

  console.log(`\n🎉 [KO/EN 100% Descriptions Guaranteed] 모든 매체(도서·영상·게임·음악) 소개값 완비 완료: ${outFile}`);
}

main().catch(console.error);
