import fs from 'node:fs';
const p='frame.md';
let s=fs.readFileSync(p,'utf8');
fs.mkdirSync('_backup',{recursive:true});
fs.copyFileSync(p,'_backup/frame-preset.md');
s=s.replace(/paper: "[^"]+"/,'paper: "#121110"').replace(/paper-deep: "[^"]+"/,'paper-deep: "#1a1917"').replace(/ink: "[^"]+"/,'ink: "#e8e6e1"');
s+='\n브랜드 확정: 바탕 #121110, 글자 #e8e6e1, 강조 #d4af37. 밝은 종이 바탕을 서비스 먹색 바탕으로 조정한다. 로고는 서비스 LogoWordmark의 실제 세 span과 굵기·간격을 사용한다. 한국어 display는 Pretendard Variable 800, body는 500. assets/fonts.css가 실제 폰트를 제공한다.\n';
fs.writeFileSync(p,s);
