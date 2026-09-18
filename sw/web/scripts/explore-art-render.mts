/*
  탐색 바로가기 카드 그림을 브라우저 없이 PNG로 찍는다.
  사용: cd sw/web && npx tsx <이 파일> <variant> <출력 폴더>
  출력: <폴더>/<variant>-full.png(720×260 전체), -wide.png(3:1 잘림), -narrow.png(4:3 잘림, 3배 확대), -card.png·-phone.png(실제 카드 크기)
*/
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import sharp from "sharp";
import { mkdirSync } from "node:fs";
import path from "node:path";


const [variant, outDir] = process.argv.slice(2);
if (!variant || !outDir) { console.error("usage: render-explore-art <variant> <outDir>"); process.exit(1); }
mkdirSync(outDir, { recursive: true });

const ExploreCardArtwork = (await import(new URL("../src/app/[locale]/(main)/explore/ExploreCardArtwork.tsx", import.meta.url).href)).default;

const S = 3;
const W = 720, H = 260;
let svg = renderToStaticMarkup(createElement(ExploreCardArtwork, { variant }));
svg = svg.replace("<svg ", `<svg xmlns="http://www.w3.org/2000/svg" width="${W * S}" height="${H * S}" `).replace(/ class="[^"]*"/, "");
const bg = { r: 16, g: 17, b: 18 };

const base = sharp(Buffer.from(svg)).flatten({ background: bg });
const full = await base.clone().png().toBuffer();
const write = (name: string, img: sharp.Sharp) => img.png().toFile(path.join(outDir, `${variant}-${name}.png`));
await write("full", sharp(full));
// 3:1 — 세로 10~250 만 보인다
await write("wide", sharp(full).extract({ left: 0, top: 10 * S, width: W * S, height: 240 * S }));
// 4:3 — 가로 187~533 만 보인다
await write("narrow", sharp(full).extract({ left: Math.round(186.7 * S), top: 0, width: Math.round(346.7 * S), height: H * S }));
// 실제 카드 크기 — 넓은 화면 카드(670×223, 2배 픽셀)와 휴대폰 카드(172×129, 3배 픽셀)
await write("card", sharp(full).extract({ left: 0, top: 10 * S, width: W * S, height: 240 * S }).resize(1340, 446));
await write("phone", sharp(full).extract({ left: Math.round(186.7 * S), top: 0, width: Math.round(346.7 * S), height: H * S }).resize(516, 387));
console.log(`ok ${variant} → ${outDir}`);
