import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TMP_DIR = path.join(__dirname, 'tmp', 'celeb_dialogues');
const DATA_DIR = path.join(__dirname, 'docs', 'celeb-data', 'dialogue');

async function migrate() {
  const tmpFiles = fs.readdirSync(TMP_DIR);
  const dataFiles = [];

  function walk(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      if (fs.statSync(fullPath).isDirectory()) {
        walk(fullPath);
      } else if (file.endsWith('.json')) {
        dataFiles.push(fullPath);
      }
    }
  }

  walk(DATA_DIR);

  const idToPath = {};
  for (const filePath of dataFiles) {
    try {
      const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      if (content.celeb_id) {
        idToPath[content.celeb_id] = filePath;
      }
    } catch (e) {
      console.error(`Error reading ${filePath}:`, e.message);
    }
  }

  let count = 0;
  for (const tmpFile of tmpFiles) {
    const tmpPath = path.join(TMP_DIR, tmpFile);
    try {
      const tmpContent = JSON.parse(fs.readFileSync(tmpPath, 'utf-8'));
      const targetPath = idToPath[tmpContent.celeb_id];

      if (targetPath) {
        const targetContent = JSON.parse(fs.readFileSync(targetPath, 'utf-8'));
        
        // Update lines and other metadata
        targetContent.lines = tmpContent.lines;
        if (tmpContent.speech_tone) targetContent.speech_tone = tmpContent.speech_tone;
        
        fs.writeFileSync(targetPath, JSON.stringify(targetContent, null, 2), 'utf-8');
        fs.unlinkSync(tmpPath);
        console.log(`Migrated: ${tmpFile} -> ${path.basename(targetPath)}`);
        count++;
      } else {
        console.warn(`Target file not found for ${tmpFile} (ID: ${tmpContent.celeb_id})`);
      }
    } catch (e) {
      console.error(`Error migrating ${tmpFile}:`, e.message);
    }
  }

  console.log(`
Migration completed: ${count} files migrated.`);
}

migrate();
