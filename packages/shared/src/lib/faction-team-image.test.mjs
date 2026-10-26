import assert from 'node:assert/strict';
import test from 'node:test';
import {toTeamImages, serializeTeamImages, toSceneImages, toCoverImage, getCoverImageIndex, filterSceneVisibility, isSceneBundlePreparing} from './faction-team-image.ts';

test('a cover holds preparation before scenes exist and hides later scenes without individual flags', () => {
  const cover = {url:'https://assets.test/myth/title-art/cover.png',scenesPreparing:true};
  const saved = serializeTeamImages(toTeamImages([cover]));
  assert.equal(isSceneBundlePreparing(saved), true);
  const registered = [...saved, {url:'late.webp',kind:'scene',label:'나중에 등록',caption:'비공개 설명',labelEn:'Later',captionEn:'Private'}];
  assert.deepEqual(filterSceneVisibility(registered), saved);
  for (const locale of ['ko','en']) {
    assert.equal(toSceneImages(registered, locale)[0].preparing, true);
    assert.equal(filterSceneVisibility(toSceneImages(registered, locale)).length, 0);
    assert.equal(filterSceneVisibility(toSceneImages(registered, locale), true).length, 1);
  }
  assert.equal(filterSceneVisibility(registered, true).length, 2);
  assert.equal(filterSceneVisibility(serializeTeamImages(registered.map(image => ({...image,scenesPreparing:false})))).length, 2);
});

test('preparing scenes survive editing and localization but stay out of public artwork', () => {
  const images = [
    {url:'cover.webp',kind:'cover'},
    {url:'public.webp',kind:'scene',label:'공개',caption:'해설'},
    {url:'private.webp',kind:'scene',preparing:true,label:'준비중',caption:'비공개 해설',labelEn:'Draft',captionEn:'Private caption',ending:{title:'끝',text:'비공개 결말'}},
  ];
  const saved = serializeTeamImages(toTeamImages(images));
  assert.equal(saved[2].preparing, true);
  assert.deepEqual(filterSceneVisibility(saved).map(image => image.url), ['cover.webp','public.webp']);
  assert.equal(filterSceneVisibility(saved, true).length, 3);
  assert.equal(toSceneImages(saved, 'en')[0].preparing, true);
  assert.equal(filterSceneVisibility(toSceneImages(saved, 'en')).length, 0);
  assert.ok(!JSON.stringify(filterSceneVisibility(toSceneImages(saved, 'ko'))).includes('비공개'));
  const published = serializeTeamImages(saved.map(image => ({...image,preparing:false})));
  assert.equal(filterSceneVisibility(published).length, 3);
  assert.equal('preparing' in published[2], false);
});

test('explicit covers survive editing and never enter scene lists', () => {
  const cover = {url:'cover.webp',kind:'cover',label:'Cover',caption:'Caption'};
  const images = ['group.webp', {url:'scene.webp',kind:'scene',label:'Scene',caption:'Caption'}, cover];
  const saved = serializeTeamImages(toTeamImages(images));
  assert.deepEqual(saved[2], cover);
  assert.deepEqual(toCoverImage(saved), cover);
  assert.equal(getCoverImageIndex(images), 2);
  assert.deepEqual(toSceneImages(saved, 'ko').map(image => image.url), ['scene.webp']);
  assert.equal(toCoverImage(['group.webp', {url:'person.webp',celebIds:['person']}]), undefined);
});

test('legacy myth title art is allowed only for myths and explicit covers take precedence', () => {
  const legacy = {url:'https://assets.test/myth/title-art/old.webp'};
  assert.equal(toCoverImage([legacy]), undefined);
  assert.deepEqual(toCoverImage([null, legacy], true), legacy);
  const cover = {url:'new.webp',kind:'cover'};
  assert.deepEqual(toCoverImage([legacy, cover], true), cover);
  assert.equal(toCoverImage([{...legacy,kind:'scene'}], true), undefined);
});

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
