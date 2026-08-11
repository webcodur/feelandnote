import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

/** AGENTS.md를 기준으로 저장소 루트를 찾는다. */
export function repoRoot() {
  let current = process.cwd();
  while (true) {
    if (fs.existsSync(path.join(current, 'AGENTS.md'))) return current;
    const parent = path.dirname(current);
    if (parent === current) throw new Error('AGENTS.md가 있는 프로젝트 루트를 찾지 못했습니다.');
    current = parent;
  }
}

export function loadEnv(file) {
  if (!fs.existsSync(file)) throw new Error(`환경 파일 없음: ${file}`);
  for (const raw of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const match = raw.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (!match || process.env[match[1]]) continue;
    process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
  }
}

export function supabaseClient(root) {
  loadEnv(path.join(root, 'sw', 'web-bo', '.env'));
  const requireFromWebBo = createRequire(path.join(root, 'sw', 'web-bo', 'package.json'));
  const { createClient } = requireFromWebBo('@supabase/supabase-js');
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase service role 환경변수가 없습니다.');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export function factionRoster(root, episode) {
  const file = path.join(root, 'sw', 'remotion', 'public', 'factions', episode, 'faction-data.json');
  if (!fs.existsSync(file)) throw new Error(`팩션 데이터 없음: ${file}`);
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  return (data.groups ?? []).flatMap((group) =>
    (group.clusters ?? []).flatMap((cluster) => cluster.people ?? []),
  );
}
