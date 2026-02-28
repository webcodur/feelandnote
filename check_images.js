const fs = require('fs');
const files = ['book.json', 'game.json', 'music.json', 'video.json'];
const dir = 'sw/web/src/constants/scriptures';
const publicDir = 'sw/web/public';
let missing = [];

files.forEach(f => {
  const fileData = JSON.parse(fs.readFileSync(`${dir}/${f}`, 'utf8'));
  Object.keys(fileData).forEach(key => {
    const arr = fileData[key];
    if (Array.isArray(arr)) {
      arr.forEach(item => {
        if (!item.imageUrl) {
          missing.push({ file: f, category: key, title: item.name || item.id, prompt: item.description });
        } else if (!fs.existsSync(`${publicDir}${item.imageUrl}`)) {
          missing.push({ file: f, category: key, title: item.name || item.id, url: item.imageUrl, prompt: item.description });
        }
      });
    }
  });
});
fs.writeFileSync('missing.json', JSON.stringify(missing, null, 2));
console.log('Done writing missing.json with ' + missing.length + ' items');
