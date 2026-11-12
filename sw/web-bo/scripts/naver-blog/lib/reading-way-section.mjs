import {formattedPlainText} from './formatted-text.mjs';

// Warm reading-way text stays distinct from the green book reviews.
export const READING_WAY_STYLE=Object.freeze({titleColor:'#b05210',bodyColor:'#5e3a21'});

// Flattened article flow: the second label is the section heading, followed only
// by its body, one divider, and the first book. Reject uncertain boundaries.
export function readingWayBody(flow){
 const headings=flow.flatMap((op,i)=>op.kind==='text'&&op.text==='독서 방식'?[i]:[]);
 if(headings.length!==2)throw Error('Exactly one reading-way TOC entry and section required');
 const start=headings[1]+1,end=flow.findIndex((op,i)=>i>=start&&op.kind==='divider');
 const body=flow.slice(start,end),firstBooks=flow.filter(op=>op.kind==='text'&&/^01\s*·\s*『/.test(op.text));
 if(end<start||!body.length||body.some(op=>op.kind!=='text'||!op.text?.trim())||firstBooks.length!==1||flow[end+1]!==firstBooks[0])throw Error('Reading-way body must end at the divider immediately before the first book');
 const paragraphs=body.map(op=>op.text);
 if(paragraphs.some(text=>flow.filter(op=>op.kind==='text'&&op.text===text).length!==1))throw Error('Reading-way paragraphs must be unique selection targets');
 return{start,end,paragraphs};
}

// Remove the section, its added book divider, and its TOC entry only.
export function withoutReadingWay(flow){
 const range=readingWayBody(flow),next=flow.slice();
 next.splice(range.start-1,range.end-range.start+2);
 next.splice(next.findIndex(op=>op.kind==='text'&&op.text==='독서 방식'),1);
 return next;
}

export function readingWaySection(subject){
 const value=subject.readingWay;
 if(value===undefined)return [];
 if(typeof value?.text!=='string'||!value.text.trim()||value.source!=='celebs:'+subject.id+':reading_way')throw Error('Exact service reading way and provenance required');
 return [
  {kind:'text',text:'독서 방식',role:'heading',align:'center',bold:true,color:READING_WAY_STYLE.titleColor,anchor:'reading-way',gapBefore:false},
  ...value.text.replace(/\r\n/g,'\n').trim().split(/\n+/).map(text=>text.trim()).filter(Boolean).map(text=>({kind:'text',text:formattedPlainText(text),formattedText:true,role:'body',align:'left',bold:true,color:READING_WAY_STYLE.bodyColor,gapBefore:true})),
 ];
}
