import assert from 'node:assert/strict';
import test from 'node:test';
import {toTeamImages, serializeTeamImages, toSceneImages} from './faction-team-image.ts';

test('legacy images remain readable and invalid captions are omitted', () => {
  assert.deepEqual(toTeamImages(['legacy.png', null, {url:'art.png', caption:42, captionEn:'  '}]), [
    {url:'legacy.png'}, {url:'art.png'},
  ]);
});

test('only reviewed scenes with localized explanations appear, and editing preserves their selection', () => {
  const images = [
    {url:'group.png',label:'Group',caption:'A group photo.'},
    {url:'portrait.jpg',kind:'scene',label:'국문 장면',caption:'국문 해설'},
    {url:'wide.webp',kind:'scene',label:'다음 장면',caption:'다음 해설',labelEn:'Next scene',captionEn:'An explanation.'},
    {url:'unfinished.png',kind:'scene',label:'미완성'},
  ];
  const saved = serializeTeamImages(toTeamImages(images));
  assert.deepEqual(toSceneImages(saved, 'ko').map(image => image.url), ['portrait.jpg','wide.webp']);
  assert.deepEqual(toSceneImages(saved, 'en'), [{url:'wide.webp',kind:'scene',label:'Next scene',caption:'An explanation.'}]);
});

test('editing an image title preserves both scene captions and its people', () => {
  const [image] = toTeamImages([{url:'art.png',label:'Old',caption:' 장면 설명 ',captionEn:' A scene. ',celebIds:['person-1']}]);
  const saved = serializeTeamImages([{...image,label:'New'}]);
  assert.deepEqual(toTeamImages(saved), [{url:'art.png',label:'New',caption:'장면 설명',captionEn:'A scene.',celebIds:['person-1']}]);
});

test('editing the final scene preserves its ending and localizes it without mixing languages', () => {
  const ending = {title:'그 뒤의 이야기',text:'후속 이야기.',titleEn:'What followed',textEn:'The aftermath.'};
  const [image] = toTeamImages([{url:'last.png',kind:'scene',label:'마지막',caption:'설명',labelEn:'Last',captionEn:'Caption',ending}]);
  const saved = serializeTeamImages([{...image,label:'마지막 장면'}]);
  assert.deepEqual(saved[0].ending, ending);
  assert.deepEqual(toSceneImages(saved, 'ko')[0].ending, {title:ending.title,text:ending.text});
  assert.deepEqual(toSceneImages(saved, 'en')[0].ending, {title:ending.titleEn,text:ending.textEn});
  const untranslated = [{...saved[0],ending:{title:ending.title,text:ending.text}}];
  assert.equal(toSceneImages(untranslated, 'en')[0].ending, undefined);
  assert.equal(toSceneImages([{...saved[0],ending:{title:'Incomplete'}}], 'ko')[0].ending, undefined);
});
