const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, 'src/constants/scriptures');
const publicDir = path.join(__dirname, 'public');

const files = ['book.json', 'video.json', 'music.json', 'game.json'];

let missingImagesList = [];

files.forEach(file => {
  const content = fs.readFileSync(path.join(dataDir, file), 'utf8');
  const data = JSON.parse(content);

  for (const key in data) {
    const arr = data[key];
    if (Array.isArray(arr)) {
      arr.forEach(item => {
        if (!item.imageUrl) {
           missingImagesList.push(`[Missing imageUrl Field] File: ${file}, List: ${key}, ID: ${item.id}, Name: ${item.name}`);
        } else {
           const imagePath = path.join(publicDir, item.imageUrl);
           if (!fs.existsSync(imagePath)) {
             missingImagesList.push(`[File Not Found] File: ${file}, List: ${key}, ID: ${item.id}, Name: ${item.name}, Path: ${item.imageUrl}`);
           }
        }
      });
    }
  }
});

fs.writeFileSync('missing_images_report.txt', missingImagesList.join('\n'));
