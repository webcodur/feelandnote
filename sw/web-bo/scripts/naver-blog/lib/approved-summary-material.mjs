import crypto from 'node:crypto';

const hash=value=>crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');

// A cached summary is reusable only for the same book metadata and source text.
export function withApprovedSummaries(material,cache){
  const result=structuredClone(material);
  if(!result.books?.length||result.selection?.method==='pending'||result.books.length>5)throw Error('Explicit book selection is not ready');
  for(const book of result.books){
    const summary=cache[book.content_id],review=summary?.review;
    if(!review?.pass||!review.sourceSupported||!review.newSummary||!review.naturalKorean||review.issues?.length)throw Error('Approved new summary missing: '+book.content_id);
    if(summary.title!==book.title||summary.creator!==book.creator||summary.isbn!==(book.isbn??''))throw Error('Summary book metadata changed: '+book.content_id);
    if(summary.sourceDescriptionHash!==hash(String(book.description??'').trim()))throw Error('Summary source text changed: '+book.content_id);
    if(![4,5].includes(summary.lines?.length)||summary.lines.some(line=>typeof line!=='string'||!line.trim()||/[\r\n]/.test(line))||summary.text!==summary.lines.join(' '))throw Error('Summary text differs from reviewed lines: '+book.content_id);
    if(!summary.model||!summary.sourceHash||!summary.preparedAt)throw Error('Summary generation provenance missing: '+book.content_id);
    book.introduction=summary.text;
    book.introductionSource='agm-agy:'+book.content_id+':'+summary.sourceHash;
  }
  return result;
}
