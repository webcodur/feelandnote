import test from 'node:test';
import assert from 'node:assert/strict';
import {options,validate,applySQL,paragraphBlocks,materialize,serialQueue,partitionChecked,matchingDownload} from './review-en-chatgpt.mjs';

const packet={request_id:'test-request',items:[{id:'row-id',celeb_id:'person-id',content_id:'book-id',review:'그는 이 책을 추천했다.\n\n-----\n\n나는 이 책을 두 번 읽었다.',original:{id:'row-id',review_en:null,review:'원문'}}]};
const result=()=>({request_id:'test-request',items:[{id:'row-id',review_en:'He recommended this book.\n\n-----\n\nI have read this book twice.',checked:true}]});

test('rejects missing, duplicated, foreign and mismatched responses',()=>{
  for(const change of [r=>r.request_id='other',r=>r.items=[],r=>r.items.push(r.items[0]),r=>r.items[0].id='other',r=>r.items[0].checked=false]){
    const r=result();change(r);assert.throws(()=>validate(packet,r));
  }
  assert.equal(validate(packet,result()).length,1);
});

test('rejects lost paragraphs, speaker separators and untranslated bodies',()=>{
  for(const body of ['This has been summarized.','He recommended this book.\n\nI have read this book twice.',packet.items[0].review]){
    const r=result();r.items[0].review_en=body;assert.throws(()=>validate(packet,r));
  }
});

test('SQL locks the exact relation and compares the original row before writing only English',()=>{
  const q=applySQL(packet,result());
  assert.match(q,/BEGIN; DO/);assert.match(q,/FOR UPDATE/);assert.match(q,/to_jsonb\(old_row\) IS DISTINCT FROM/);
  assert.match(q,/id='row-id' AND celeb_id='person-id' AND content_id='book-id'/);
  assert.match(q,/SET review_en=/);assert.doesNotMatch(q,/SET review=/);assert.match(q,/COMMIT;/);
  assert.match(q,/English already exists/);
  const refreshed=applySQL({...packet,refresh_existing:true},result());
  assert.doesNotMatch(refreshed,/English already exists/);assert.match(refreshed,/to_jsonb\(old_row\) IS DISTINCT FROM/);
});

test('default is read only and bulk application requires explicit options',()=>{
  assert.equal(options([]).translate,false);assert.equal(options([]).apply,false);
  assert.throws(()=>options(['--apply']));assert.throws(()=>options(['--batch','0']));
  assert.throws(()=>options(['--account','u1;something']));
  assert.equal(options(['--translate','--apply','--limit','40']).limit,40);
  assert.equal(options(['--concurrency','2']).concurrency,2);
  assert.throws(()=>options(['--concurrency','3']));
  assert.equal(options(['--refresh-since','2026-11-01']).refreshSince,'2026-11-01T00:00:00.000Z');
  assert.throws(()=>options(['--refresh-since','not-a-date']));
  assert.equal(options(['--created-before','2026-11-01T06:52:57.300Z']).createdBefore,'2026-11-01T06:52:57.300Z');
  assert.throws(()=>options(['--refresh-since','2026-11-02','--created-before','2026-11-01']));
  assert.equal(options(['--exclude-celeb-ids','2ee474d9-ae64-4218-9033-7d78bd7308df']).excludeCelebIds.length,1);
  assert.throws(()=>options(['--exclude-celeb-ids','not-an-id']));
});

test('an explicitly rejected source is excluded from SQL while approved peers remain guarded',()=>{
  const p={...packet,items:[...packet.items,{...packet.items[0],id:'bad-source'}]};
  const r=result();r.items.push({id:'bad-source',checked:false,issues:['The original omits its main subject.']});
  const accepted=partitionChecked(p,r);
  assert.equal(accepted.packet.items.length,1);assert.equal(accepted.flagged.length,1);
  assert.doesNotMatch(applySQL(accepted.packet,accepted.result),/bad-source/);
  assert.match(applySQL(accepted.packet,accepted.result),/FOR UPDATE/);
  const unexplained=structuredClone(r);delete unexplained.items[1].issues;assert.throws(()=>partitionChecked(p,unexplained));
  const missingVerdict=structuredClone(r);delete missingVerdict.items[1].checked;assert.throws(()=>partitionChecked(p,missingVerdict));
  const unknown=structuredClone(r);unknown.items[1].id='unknown';assert.throws(()=>partitionChecked(p,unknown));
});

test('numbered paragraphs preserve mixed-newline source boundaries and detect merged output',()=>{
  const p={request_id:'blocks',items:[{id:'r',review:'\r\n첫 문단\r\n\r\n-----\r\n\r\n둘째\r\n\r\n셋째\r\n\r\n'}]};
  const blocks=paragraphBlocks(p.items[0].review);
  assert.equal(blocks.length,4);
  const r={request_id:'blocks',items:[{id:'r',checked:true,paragraphs:[{id:'p0',text:'First paragraph'},{id:'p1',text:'-----'},{id:'p2',text:'Second paragraph'},{id:'p3',text:'Third paragraph'}]}]};
  const en=materialize(p,r);assert.doesNotThrow(()=>validate(p,en));
  const merged=structuredClone(r);merged.items[0].paragraphs.pop();assert.throws(()=>materialize(p,merged));
  const reordered=structuredClone(r);reordered.items[0].paragraphs.reverse();assert.throws(()=>materialize(p,reordered));
});

test('parallel download/write queues serialize side effects and recover after a rejected operation',async()=>{
  const queue=serialQueue(),events=[];let release;
  const gate=new Promise(r=>release=r);
  const first=queue(async()=>{events.push('start1');await gate;events.push('end1');throw Error('failure');});
  const second=queue(async()=>{events.push('start2');});
  await Promise.resolve();assert.deepEqual(events,['start1']);release();
  await assert.rejects(first);await second;assert.deepEqual(events,['start1','end1','start2']);
});

test('ignores another task download and validates only the selected request',async()=>{
  const ignored=[],received=[];let checked=0;
  const result=await matchingDownload({request_id:'ours'},async n=>{
    received.push(n);return {raw:Buffer.from(JSON.stringify(n===1?{person_id:'other-task'}:{request_id:'ours',items:[1]})),downloadPath:'download-'+n};
  },{decode:JSON.parse,check:value=>{checked++;assert.equal(value.request_id,'ours');},onMismatch:n=>ignored.push(n)});
  assert.deepEqual(received,[1,2]);assert.deepEqual(ignored,[1]);assert.equal(checked,1);assert.equal(result.downloadPath,'download-2');
  let decoded=0;
  await matchingDownload({request_id:'ours'},async n=>({raw:Buffer.from(n===1?'not JSON':JSON.stringify(n===2?{request_id:'someone-else',items:[{paragraphs:[{id:'foreign'}]}]}:{request_id:'ours'}))}),{decode:raw=>{decoded++;return JSON.parse(raw);},check:()=>{}});
  assert.equal(decoded,1);
  await assert.rejects(matchingDownload({request_id:'ours'},async()=>({raw:Buffer.from('{}')}),{decode:JSON.parse,check:()=>assert.fail(),attempts:2}),/bounded retries/);
  await assert.rejects(matchingDownload({request_id:'ours'},async()=>({raw:Buffer.from('{"request_id":"ours"}')}),{decode:JSON.parse,check:()=>{throw Error('invalid own result');}}),/invalid own result/);
});
