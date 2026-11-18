import assert from 'node:assert/strict';
import test from 'node:test';
import {captionTargets,relinkedSnapshot,serviceProduct,PRODUCT_TEXT,SEARCH_TEXT} from './relink-yes24-captions.mjs';

const id='0034c4d8-ce5f-4459-b58b-66e677ba19f8',other='ec744c9d-5669-46f1-82cf-bd85e8ad73bf';
const search='https://www.yes24.com/Product/Search?domain=BOOK&query=9788937462573';
const anchors=[
  {componentId:'img1',caption:true,text:'YES24에서 보기',href:'https://www.yes24.com/product/goods/1'},
  {componentId:'t1',caption:false,text:'작품 상세',href:`https://feelandnote.com/content/${other}?category=book`},
  {componentId:'img2',caption:true,text:SEARCH_TEXT,href:search},
  {componentId:'t2',caption:false,text:'감상 근거 · 원문',href:'https://example.com/source'},
  {componentId:'t2',caption:false,text:'작품 상세',href:`https://feelandnote.com/content/${id}?category=book`},
];

test('검색 설명란만 뒤따르는 작품 상세의 작품 번호와 짝짓는다',()=>{
  assert.deepEqual(captionTargets(anchors),[{componentId:'img2',index:2,searchHref:search,contentId:id}]);
});
test('작품 상세 없이 다음 표지로 넘어가면 짝짓지 않고 멈춘다',()=>{
  assert.throws(()=>captionTargets([anchors[2],anchors[0],anchors[1]]),/작품 상세/);
});
test('기대 상태는 대상 설명란의 글자와 주소만 바꾼다',()=>{
  const before={title:'t',text:['a'],dividers:1,flow:[],links:anchors.map(({text,href})=>({text,href})),images:[{id:'img1',caption:['YES24에서 보기']},{id:'img2',caption:[SEARCH_TEXT]}]};
  const product='https://www.yes24.com/product/goods/188603359';
  const next=relinkedSnapshot(before,anchors,[{componentId:'img2',index:2,productHref:product}]);
  assert.deepEqual(next.links[2],{text:PRODUCT_TEXT,href:product});
  assert.deepEqual(next.links.filter((_,i)=>i!==2),before.links.filter((_,i)=>i!==2));
  assert.deepEqual(next.images.map(i=>i.caption),[['YES24에서 보기'],[PRODUCT_TEXT]]);
  assert.throws(()=>relinkedSnapshot(before,anchors.slice(1),[]),/링크 목록/);
});
test('서비스 첫 응답이 검색이면 한 번 더 묻고 상품 주소만 받는다',async()=>{
  const answers=[search,'https://www.yes24.com/product/goods/188603359'];
  const fetcher=async()=>new Response(null,{status:307,headers:{location:answers.shift()}});
  assert.equal(await serviceProduct(id,{fetcher,wait:async()=>{}}),'https://www.yes24.com/product/goods/188603359');
  const never=async()=>new Response(null,{status:307,headers:{location:search}});
  assert.equal(await serviceProduct(id,{fetcher:never,wait:async()=>{}}),null);
  const foreign=async()=>new Response(null,{status:307,headers:{location:'https://evil.test/product/goods/1'}});
  assert.equal(await serviceProduct(id,{fetcher:foreign,wait:async()=>{}}),null);
});
