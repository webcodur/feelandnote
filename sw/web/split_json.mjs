import fs from 'fs';
import path from 'path';

const map = {
  core: ["site", "notFound", "layout", "pages", "status", "title", "profession", "policy", "common", "shared", "notifications", "aboutPage"],
  nav: ["nav", "moreMenu", "contextHeader"],
  home: ["home", "banner", "todayFigure", "landing", "quickRecord"],
  auth: ["auth"],
  explore: ["explore", "searchResult", "searchPage", "archiveSearch"],
  agora: ["agora", "board"],
  scriptures: ["scriptures"],
  content: ["content", "contentDetail", "review", "musicPlayer", "customContent"],
  profile: ["userProfile", "profileSection", "userBio", "profilePage"],
  celeb: ["celebPage"],
  rest: ["rest", "agoraGame"],
  flow: ["recommendation", "note", "creation", "recordInteraction", "flowEditor", "flowDetail"]
};

for (const lang of ['ko', 'en']) {
  const commonPath = path.join('messages', lang, 'common.json');
  if (!fs.existsSync(commonPath)) continue;
  
  const original = JSON.parse(fs.readFileSync(commonPath, 'utf8'));
  
  for (const [file, keys] of Object.entries(map)) {
    const chunk = {};
    for (const k of keys) {
      if (original[k] !== undefined) {
        chunk[k] = original[k];
      }
    }
    fs.writeFileSync(path.join('messages', lang, `${file}.json`), JSON.stringify(chunk, null, 2) + '\n');
  }
  
  // Create an empty common.json or keep it for backward compat if anyone imports it directly?
  // We'll rename it
  fs.renameSync(commonPath, path.join('messages', lang, 'common_backup.json'));
}
console.log('Split complete.');
