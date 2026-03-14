const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const srcDir = 'C:\\Users\\webco\\.gemini\\antigravity\\brain\\d6ff4aec-9736-4e20-b8b9-704157402a47';
const destDir = 'C:\\Users\\webco\\바탕 화면\\윤시준\\PRJ\\feelandnote\\sw\\web\\public\\images\\scriptures\\video\\video-academy';

async function convert() {
  const files = fs.readdirSync(srcDir).filter(f => f.startsWith('video_') && f.endsWith('.png'));
  for (const file of files) {
    const srcPath = path.join(srcDir, file);
    // Remove the trailing timestamp (e.g. _1773489982569) and .png extension
    let baseName = file.replace(/_\d+\.png$/, '').replace(/\.png$/, '');
    // Replace underscores with hyphens
    baseName = baseName.replace(/_/g, '-');
    const destName = baseName + '.webp';
    const destPath = path.join(destDir, destName);
    console.log(`Converting ${file} to ${destName}...`);
    await sharp(srcPath).webp({ quality: 80 }).toFile(destPath);
  }
}

convert().catch(console.error);
