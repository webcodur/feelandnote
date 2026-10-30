import test from 'node:test';import assert from 'node:assert/strict';import {unchangedEditorBody} from './unchanged-editor-body.mjs';
test('제목과 로딩 치수 외에 사진·링크·본문 순서·대표 지정 변경은 검출한다',()=>{
 const before={title:'old',text:['본문'],flow:[{kind:'image',src:'https://img/1'}],links:[{text:'원문',href:'https://source/'}],images:[{src:'https://img/1',width:'200',height:'300',displayWidth:200,displayHeight:300,naturalWidth:400,naturalHeight:600,representative:true}]};
 const after=structuredClone(before);after.title='new';after.images[0].naturalWidth=0;after.images[0].displayWidth=0;assert.deepEqual(unchangedEditorBody(before),unchangedEditorBody(after));
 for(const change of [s=>s.text[0]='다른 본문',s=>s.images[0].src='https://img/2',s=>s.images[0].width='220',s=>s.images[0].representative=false,s=>s.links[0].href='https://other/',s=>s.flow.reverse().push({kind:'text'})]){const changed=structuredClone(after);change(changed);assert.notDeepEqual(unchangedEditorBody(before),unchangedEditorBody(changed));}
 assert.equal(before.title,'old');assert.equal(before.images[0].naturalWidth,400);
});
