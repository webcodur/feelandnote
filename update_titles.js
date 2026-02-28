const fs = require('fs');
const files = ['book.json', 'video.json', 'music.json', 'game.json'];
const path = './sw/web/src/constants/scriptures/';

const arraysToPreserve = [
  'CONTENT_HISTORY_TIMELINE',
  'WRITING_TOOL_HISTORY_TIMELINE',
  'VIDEO_HISTORY_TIMELINE',
  'MUSIC_HISTORY_TIMELINE',
  'GAME_HISTORY_TIMELINE'
];

files.forEach(f => {
  const data = JSON.parse(fs.readFileSync(path + f));
  for (const key in data) {
    if (arraysToPreserve.includes(key)) {
      continue; // leave these alone, they already have factual concise names
    }

    data[key].forEach(i => {
      // Create basic name from media string, stripping english parentheses
      let basicName = i.media.replace(/\s*\([^)]*\)/g, '').trim();
      
      // Additional small cleanups if necessary (e.g., removing trailing '의 정립')
      // but keeping it as extracted is usually fine.
      i.name = basicName;
    });
  }
  // Write the formatted JSON back
  fs.writeFileSync(path + f, JSON.stringify(data, null, 2) + '\n');
});

console.log('Successfully updated titles.');
