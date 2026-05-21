import fs from 'node:fs';
import path from 'node:path';

// --- 설정 및 상수 ---
const EPISODES_ROOT = path.resolve(process.cwd(), 'public/episodes');

interface ShortSummary {
  index: number;
  bookTitle: string;
  hook: string;
  segmentsCount: number;
  hasVoice: boolean;
}

interface BookSummary {
  index: number;
  title: string;
  creator: string;
  hasShorts: boolean;
}

interface EpisodeInfo {
  name: string;
  status: string;
  structure: 'New' | 'Legacy';
  books: BookSummary[];
  shorts: ShortSummary[];
}

/** CLI 매개변수 분석 */
function parseArgs() {
  const args = process.argv.slice(2);
  let episode: string | null = null;
  let locale: 'ko' | 'en' = 'ko';

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--episode' && args[i + 1]) {
      episode = args[i + 1];
      i++;
    } else if (args[i] === '--locale' && args[i + 1]) {
      locale = args[i + 1] === 'en' ? 'en' : 'ko';
      i++;
    }
  }
  return { episode, locale };
}

/** 특정 디렉토리의 활성 여부 확인 및 status 반환 */
function getEpisodeStatus(dirPath: string): string | null {
  const statusFile = path.join(dirPath, '_status.json');
  if (!fs.existsSync(statusFile)) return null;
  try {
    const data = JSON.parse(fs.readFileSync(statusFile, 'utf8'));
    return data.status || null;
  } catch {
    return null;
  }
}

/** 신구조 에피소드 분석 */
function scanNewStructure(dirPath: string, name: string, locale: 'ko' | 'en'): EpisodeInfo | null {
  const metaFile = path.join(dirPath, `meta.${locale}.json`);
  if (!fs.existsSync(metaFile)) return null;

  const booksDir = path.join(dirPath, 'books');
  if (!fs.existsSync(booksDir)) {
    return { name, status: 'live', structure: 'New', books: [], shorts: [] };
  }

  // 책 폴더 스캔 (01-xxx, 02-xxx 등)
  const bookDirs = fs.readdirSync(booksDir, { withFileTypes: true })
    .filter(e => e.isDirectory() && /^\d+/.test(e.name))
    .map(e => e.name)
    .sort();

  const books: BookSummary[] = [];
  const shorts: ShortSummary[] = [];
  let shortsIndexCounter = 1;

  bookDirs.forEach((bDir, i) => {
    const bookJsonPath = path.join(booksDir, bDir, `book.${locale}.json`);
    const shortsJsonPath = path.join(booksDir, bDir, `shorts.${locale}.json`);

    let title = bDir;
    let creator = 'Unknown';
    let hasShorts = false;

    if (fs.existsSync(bookJsonPath)) {
      try {
        const bookData = JSON.parse(fs.readFileSync(bookJsonPath, 'utf8'));
        title = bookData.title || title;
        creator = bookData.creator || creator;
      } catch {}
    }

    if (fs.existsSync(shortsJsonPath)) {
      hasShorts = true;
      try {
        const shortsData = JSON.parse(fs.readFileSync(shortsJsonPath, 'utf8'));
        const segments = shortsData.segments || [];
        const hookText = segments.find((s: any) => s.id === 'hook')?.text || '(No Hook Text)';
        
        // 음성 디렉토리 검증
        const voicePath = path.join(dirPath, 'voice', locale, `shorts-${shortsIndexCounter}`);
        const hasVoice = fs.existsSync(voicePath) && fs.readdirSync(voicePath).length > 0;

        shorts.push({
          index: shortsIndexCounter++,
          bookTitle: title,
          hook: hookText.replace(/\n/g, ' '),
          segmentsCount: segments.length,
          hasVoice
        });
      } catch (e) {
        // 파싱 에러 시 기본 정보 기록
        shorts.push({
          index: shortsIndexCounter++,
          bookTitle: title,
          hook: '(Parsing Error in shorts.json)',
          segmentsCount: 0,
          hasVoice: false
        });
      }
    }

    books.push({
      index: i + 1,
      title,
      creator,
      hasShorts
    });
  });

  return {
    name,
    status: getEpisodeStatus(dirPath) || 'live',
    structure: 'New',
    books,
    shorts
  };
}

/** 레거시 단일 파일 구조 에피소드 분석 */
function scanLegacyStructure(dirPath: string, name: string, locale: 'ko' | 'en'): EpisodeInfo | null {
  const jsonFile = path.join(dirPath, `${locale}.json`);
  const backupFile = path.join(dirPath, `${locale}.json.backup`);
  const targetFile = fs.existsSync(jsonFile) ? jsonFile : (fs.existsSync(backupFile) ? backupFile : null);

  if (!targetFile) return null;

  try {
    const data = JSON.parse(fs.readFileSync(targetFile, 'utf8'));
    const booksData = data.books || [];
    const books: BookSummary[] = booksData.map((b: any, i: number) => ({
      index: i + 1,
      title: b.title || `Book ${i + 1}`,
      creator: b.creator || 'Unknown',
      hasShorts: false // 레거시는 하위 개별 파일이 아님
    }));

    // 레거시 쇼츠 추출
    let rawShorts = data.shorts || [];
    if (rawShorts && !Array.isArray(rawShorts)) {
      rawShorts = [rawShorts];
    }

    const shorts: ShortSummary[] = rawShorts.map((s: any, i: number) => {
      const segments = s.segments || [];
      const hookText = segments.find((seg: any) => seg.id === 'hook')?.text || '(No Hook Text)';
      const bookIdx = typeof s.featuredBookIndex === 'number' ? s.featuredBookIndex : 0;
      const targetBookTitle = books[bookIdx]?.title || 'Unknown Book';
      
      const voicePath = path.join(dirPath, 'voice', locale, `shorts-${i + 1}`);
      const hasVoice = fs.existsSync(voicePath) && fs.readdirSync(voicePath).length > 0;

      // 해당 책에 쇼츠 매핑 체크
      if (books[bookIdx]) books[bookIdx].hasShorts = true;

      return {
        index: i + 1,
        bookTitle: targetBookTitle,
        hook: hookText.replace(/\n/g, ' '),
        segmentsCount: segments.length,
        hasVoice
      };
    });

    return {
      name,
      status: getEpisodeStatus(dirPath) || 'live',
      structure: 'Legacy',
      books,
      shorts
    };
  } catch {
    return null;
  }
}

/** 단일 에피소드 스캔 */
function scanEpisode(dirPath: string, name: string, locale: 'ko' | 'en'): EpisodeInfo | null {
  const isNew = fs.existsSync(path.join(dirPath, `meta.${locale}.json`));
  if (isNew) {
    return scanNewStructure(dirPath, name, locale);
  }
  return scanLegacyStructure(dirPath, name, locale);
}

/** 전체 에피소드 스캔 및 요약 리포팅 */
function reportSummary(locale: 'ko' | 'en') {
  if (!fs.existsSync(EPISODES_ROOT)) {
    console.error(`Error: Episodes root folder not found at ${EPISODES_ROOT}`);
    return;
  }

  // 1-depth 혹은 2-depth 구조 모두 탐색
  const candidates: { name: string; path: string }[] = [];
  const rootDirs = fs.readdirSync(EPISODES_ROOT, { withFileTypes: true });

  for (const entry of rootDirs) {
    if (!entry.isDirectory()) continue;
    const p1 = path.join(EPISODES_ROOT, entry.name);
    const status = getEpisodeStatus(p1);

    if (status === 'done' || status === 'live') {
      candidates.push({ name: entry.name, path: p1 });
    } else {
      // 2-depth 탐색 (예: done/abraham-lincoln 등)
      const subDirs = fs.readdirSync(p1, { withFileTypes: true });
      for (const sub of subDirs) {
        if (!sub.isDirectory()) continue;
        const p2 = path.join(p1, sub.name);
        const subStatus = getEpisodeStatus(p2);
        if (subStatus === 'done' || subStatus === 'live') {
          candidates.push({ name: sub.name, path: p2 });
        }
      }
    }
  }

  if (candidates.length === 0) {
    console.log('No active (done/live) episodes found.');
    return;
  }

  const list: any[] = [];
  candidates.sort((a, b) => a.name.localeCompare(b.name)).forEach(c => {
    const info = scanEpisode(c.path, c.name, locale);
    if (info) {
      list.push({
        'Episode Name': info.name,
        'Status': info.status,
        'Structure': info.structure,
        'Total Books': info.books.length,
        'Total Shorts': info.shorts.length,
        'Mapped Book Titles for Shorts': info.shorts.map(s => s.bookTitle).join(', ') || '(None)'
      });
    }
  });

  console.log(`\n=== Remotion Episodes Summary (Locale: ${locale.toUpperCase()}) ===`);
  console.table(list);
  console.log(`Total active episodes scanned: ${list.length}\n`);
}

/** 특정 에피소드 상세 조회 및 분석 */
function reportDetails(episodeName: string, locale: 'ko' | 'en') {
  if (!fs.existsSync(EPISODES_ROOT)) {
    console.error(`Error: Episodes root folder not found at ${EPISODES_ROOT}`);
    return;
  }

  // 타겟 경로 검색
  let targetPath: string | null = null;
  const rootDirs = fs.readdirSync(EPISODES_ROOT, { withFileTypes: true });

  for (const entry of rootDirs) {
    if (!entry.isDirectory()) continue;
    const p1 = path.join(EPISODES_ROOT, entry.name);
    if (entry.name === episodeName) {
      targetPath = p1;
      break;
    }
    // 2-depth 탐색
    const subDirs = fs.readdirSync(p1, { withFileTypes: true });
    const match = subDirs.find(sub => sub.isDirectory() && sub.name === episodeName);
    if (match) {
      targetPath = path.join(p1, match.name);
      break;
    }
  }

  if (!targetPath) {
    console.error(`Error: Episode "${episodeName}" not found or inactive.`);
    return;
  }

  const info = scanEpisode(targetPath, episodeName, locale);
  if (!info) {
    console.error(`Error: Failed to parse data for episode "${episodeName}" in locale "${locale}".`);
    return;
  }

  console.log(`\n==================================================`);
  console.log(`🎬 EPISODE DETAILS: ${info.name.toUpperCase()} (${locale.toUpperCase()})`);
  console.log(`==================================================`);
  console.log(`* Status    : ${info.status}`);
  console.log(`* Structure : ${info.structure} File System Layout`);
  console.log(`* Path      : ${targetPath}`);
  console.log(`==================================================\n`);

  console.log(`📚 BOOKS IN THIS EPISODE (${info.books.length} Books)`);
  info.books.forEach(b => {
    const shortsTag = b.hasShorts ? ' [Has Shorts 🎥]' : '';
    console.log(`  [Book ${b.index}] ${b.title} - ${b.creator}${shortsTag}`);
  });

  console.log(`\n🎥 SHORTS SCENARIOS (${info.shorts.length} Shorts)`);
  if (info.shorts.length === 0) {
    console.log('  (No shorts configured for this episode)');
  } else {
    info.shorts.forEach(s => {
      const voiceTag = s.hasVoice ? '✅ Voice Ready' : '❌ Voice Missing';
      console.log(`  [Shorts ${s.index}]`);
      console.log(`    - Target Book    : ${s.bookTitle}`);
      console.log(`    - Intro Hook     : "${s.hook}"`);
      console.log(`    - Segment Count  : ${s.segmentsCount} parts`);
      console.log(`    - Resource Status: ${voiceTag}`);
      console.log(`    ----------------------------------------------`);
    });
  }
  console.log();
}

// --- 실행 진입점 ---
const { episode, locale } = parseArgs();

if (episode) {
  reportDetails(episode, locale);
} else {
  reportSummary(locale);
}
