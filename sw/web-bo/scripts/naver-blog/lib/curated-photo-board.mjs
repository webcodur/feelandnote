import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import sharp from 'sharp';

// 기관 글 「관련 이미지」 구획의 사진 낱장. 사진마다 이름과 역할을 아래에 적어 한 장으로 만든다.
// 여러 장을 한 판에 합치면 휴대폰에서 한 장씩 눌러 볼 수 없어(26.11.15 사용자 지적), 낱장을 편집기 나란히 놓기로 한 줄 2장씩 묶는다.
// 나란히 2장은 휴대폰에서 장당 약 170px로 줄어든다(0.28배). font는 줄어든 뒤 이름 약 15px·역할 약 13px가 되게 잡았다.
// 글씨는 Noto Sans KR(설치 글꼴). 맑은 고딕 굵은 글씨가 흉하다는 지적으로 바꿨다(26.11.16): 흰 바탕, 이름 반굵기 진회색, 역할 보통 굵기 옅은 회색.
export const PHOTO_TILE = Object.freeze({width: 600, textHeight: 112, background: '#ffffff', family: 'Noto Sans KR', font: Object.freeze({name: 30, role: 24}), color: Object.freeze({name: '#1f1f1f', role: '#7a7a7a'})});

const esc = s => String(s).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));

/** tile: {file, name, role} → 정사각 사진 아래 이름·역할을 적은 낱장. 반환: {file, sha256} */
export async function renderPhotoTile(tile, outFile) {
  const g = PHOTO_TILE, W = g.width, H = W + g.textHeight;
  const photo = await sharp(fs.readFileSync(tile.file)).resize(W, W, {fit: 'cover', position: tile.position ?? 'attention'}).toBuffer();
  // 긴 이름은 타일 폭을 넘지 않게 글자 크기를 줄인다(한글 1자 ≈ 글자 크기, 그 밖 ≈ 0.55배).
  const nameUnits = [...tile.name].reduce((n, c) => n + (/[가-힣]/.test(c) ? 1 : 0.55), 0), nameSize = Math.min(g.font.name, Math.floor((W - 24) / nameUnits));
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><rect width="100%" height="100%" fill="${g.background}"/>`
    + `<text x="${W / 2}" y="${W + g.font.name + 22}" font-family="${g.family}" font-weight="600" letter-spacing="-0.5" font-size="${nameSize}" fill="${g.color.name}" text-anchor="middle">${esc(tile.name)}</text>`
    + `<text x="${W / 2}" y="${W + g.font.name + g.font.role + 36}" font-family="${g.family}" font-weight="400" font-size="${g.font.role}" fill="${g.color.role}" text-anchor="middle">${esc(tile.role)}</text></svg>`;
  const bytes = await sharp(Buffer.from(svg)).composite([{input: photo, left: 0, top: 0}]).jpeg({quality: 88}).toBuffer();
  const sha256 = crypto.createHash('sha256').update(bytes).digest('hex'), file = outFile.replace(/\.jpg$/,`-${sha256.slice(0, 12)}.jpg`);
  fs.mkdirSync(path.dirname(file), {recursive: true});
  fs.writeFileSync(file, bytes);
  return {file, sha256};
}
