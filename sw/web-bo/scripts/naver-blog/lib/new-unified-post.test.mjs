import test from 'node:test';import assert from 'node:assert/strict';
import {validateNewUnifiedMaterial,finalizeNewUnifiedMaterial} from './new-unified-post.mjs';
const material=()=>({logNo:'0',kind:'celeb',title:'게임 유튜버 인물이 읽은 7권의 책 (Person)',serviceUrl:'https://feelandnote.com/celeb/person',libraryFunnel:true,subject:{id:'person-id',name:'인물',imageUrl:'https://example.com/person.jpg',introduction:'서비스 인물 안내입니다.',introductionSource:'celeb_explanations:person-id:plain_text'},selection:{method:'new-reviewed-selection',totalServiceBooks:7,eligibleBooks:7},newPost:{slug:'person',profession:'influencer',category:'인플루엔서',tags:['필앤노트','책추천','인물'],reviewed:true},books:Array.from({length:5},(_,i)=>({id:'review'+i,content_id:'book'+i,title:'책'+i,creator:'작가',coverUrl:'https://example.com/'+i+'.jpg',introduction:'검수한 새 책 소개입니다.',introductionSource:'agm-agy:book'+i+':hash',review:'이 인물은 책을 접하게 된 개인적인 경험과 읽은 뒤 느낀 변화를 직접 이야기했다. 작품을 고른 상황과 구체적인 반응이 서비스의 원문 감상에 함께 담겨 있다. '.repeat(3),source_url:'https://example.com/source/'+i}))});
test('공개·예약·미발행 초안의 URL과 slug를 모두 중복 검사한다',()=>{for(const row of [{kind:'celeb',slug:'person',link:'ok'},{kind:'celeb',url:'https://feelandnote.com/celeb/person',link:'check'}])assert.throws(()=>validateNewUnifiedMaterial(material(),{posts:[row],drafts:[]}),/already/);assert.throws(()=>validateNewUnifiedMaterial(material(),{posts:[],drafts:[{target:'/celeb/person'}]}),/already/);assert.doesNotThrow(()=>validateNewUnifiedMaterial(material(),{posts:[],drafts:[]}));});
test('신규 글은 검수·분류가 필요하고 실제 발행 번호를 받은 뒤에만 최종 해시를 만든다',()=>{const m=material(),draft=validateNewUnifiedMaterial(m,{posts:[],drafts:[]}),final=finalizeNewUnifiedMaterial(m,'224500000001');assert.notEqual(draft.articleHash,final.article.articleHash);assert.equal(final.article.logNo,'224500000001');assert.equal(final.material.books[0].review,m.books[0].review);assert.throws(()=>finalizeNewUnifiedMaterial(m,'0'),/Actual/);m.newPost.category='배우';assert.throws(()=>validateNewUnifiedMaterial(m,{posts:[],drafts:[]}),/category/);m.newPost.category='인플루엔서';m.newPost.reviewed=false;assert.throws(()=>validateNewUnifiedMaterial(m,{posts:[],drafts:[]}),/Reviewed/);});

test('짧은 서비스 감상도 그대로 발행할 수 있지만 빈 감상은 차단한다',()=>{
  const m=material();m.books[3].review='이 책을 좋아한다고 밝혔다.';
  const original=m.books[3].review;
  assert.doesNotThrow(()=>validateNewUnifiedMaterial(m,{posts:[],drafts:[]}));
  assert.equal(m.books[3].review,original);
  m.books[3].review=' ';
  assert.throws(()=>validateNewUnifiedMaterial(m,{posts:[],drafts:[]}),/Missing service review: 책3/);
});
