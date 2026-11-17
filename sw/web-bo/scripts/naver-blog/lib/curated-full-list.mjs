import fs from 'node:fs';
import {koreanListLabels} from '../korean-list-labels.mjs';
import {readableInKorean} from './person-full-list.mjs';

// 기관 글 「전체 선정 목록」 표의 칸 규칙. 수상 목록은 수상 연도, 순위 목록은 순위를 앞에 둔다.
// 둘 다 아닌 목록의 출간 연도는 일부만 채워져 빈칸이 생기므로 싣지 않는다.
// 작품명·저자명은 사람이 검수한 표기를 먼저 쓰고, 없으면 권차·세트·리커버판 상품명을 거르는 판정을 따른다.
export const REVIEWED_LABELS_FILE='D:/feelandnote/blog-assets/naver-blog/table-ko/reviewed-labels.json';
export function readReviewedLabels(file=REVIEWED_LABELS_FILE){return fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')):{};}

export function curatedFullList(list,items,localeOf,reviewed={}){
  const lead=list.is_annual?'연도':list.is_ranked?'순위':null,cell=v=>String(v??'').replace(/\s+/g,' ').trim();
  const columns=[...(lead?[lead]:[]),'작품','저자'];
  const rows=items.map(i=>{
    const row=reviewed.rows?.[i.raw_title],[title,creator]=koreanListLabels(i,localeOf(i.content_id),row);
    const labels=row?[title,creator]:[reviewed.titles?.[i.raw_title]??title,reviewed.authors?.[i.raw_creator]??creator];
    return [...(lead?[list.is_annual?i.year:i.rank]:[]),...labels].map(cell);
  });
  return {columns,rows};
}


// 국내에서 읽을 수 없는 작품(번역서 없음·절판)의 표시. 판정은 인물 전체 목록과 같은 readableInKorean을 쓴다.
// 표에서는 연도·순위 순서를 지키려고 줄을 옮기지 않고 제자리에서 회색으로 칠한다. 표지 자리 그림에는 사유를 적는다.
export const CURATED_UNAVAILABLE = Object.freeze({legend: '회색 글씨는 국내에 번역되지 않았거나 절판된 작품입니다.',
  // 한국 작품 목록(기관 국적 KR)은 번역이 아니라 단행본 유무다. 동인문학상에 번역 안내가 붙어 틀렸다(26.11.16).
  domesticLegend: '회색 글씨는 단행본으로 나오지 않았거나 절판된 작품입니다.', unpublished: '국내 미출간', outOfPrint: '절판'});
export const unavailableMark = ko => readableInKorean(ko) ? null : ko?.sources?.availability === 'out_of_print' ? CURATED_UNAVAILABLE.outOfPrint : CURATED_UNAVAILABLE.unpublished;
export const mutedRowIndexes = locales => locales.flatMap((ko, i) => unavailableMark(ko) ? [i] : []);
