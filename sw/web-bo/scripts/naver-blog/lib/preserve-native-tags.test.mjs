import test from 'node:test';import assert from 'node:assert/strict';import {appendedTagCount,sameSavedPublishSettings} from './preserve-native-tags.mjs';
test('원래 태그를 같은 순서로 보존하면서 뒤에 추가된 태그만 구별한다',()=>{
 assert.equal(appendedTagCount(['#BBC#빅리드100#책추천'],['#BBC','#빅리드100','#책추천','#1']),1);
 assert.equal(appendedTagCount(['#BBC#책추천'],['#BBC','#책추천']),0);
 assert.equal(appendedTagCount([],['#1']),1);
 for(const tags of [['#책추천','#BBC','#1'],['#BBC'],['#BBC','#다른태그']])assert.throws(()=>appendedTagCount(['#BBC#책추천'],tags));
});
test('검수한 책 제목의 숫자 표식에서 생성된 태그만 허용하고 원래 태그와 다른 설정은 보존한다',()=>{
 const expected={tags:['#BBC#책추천'],date:'2026.11.17'},article={operations:[{kind:'table',columns:['작품'],rows:[['걸스 #1']]}]};
 assert.equal(sameSavedPublishSettings({...expected,tags:['#BBC#책추천#1']},expected,article),true);
 for(const actual of [{...expected,tags:['#BBC#1']},{...expected,tags:['#BBC#책추천#2']},{...expected,tags:['#BBC#책추천#다른태그']},{...expected,date:'2026.11.18',tags:['#BBC#책추천#1']}])assert.equal(sameSavedPublishSettings(actual,expected,article),false);
 assert.equal(sameSavedPublishSettings({...expected,tags:['#BBC#책추천#1']},expected,{operations:[]}),false);
});
