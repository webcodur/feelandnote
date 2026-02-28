const fs = require('fs');
const files = ['book.json', 'video.json', 'music.json', 'game.json'];
const path = './sw/web/src/constants/scriptures/';
files.forEach(f => {
  const data = JSON.parse(fs.readFileSync(path + f));
  console.log(`\n--- ${f} ---`);
  for (const key in data) {
    console.log(`[${key}]`);
    data[key].forEach(i => console.log(`  Name: ${i.name}  | Media: ${i.media}`));
  }
});
