import assert from 'node:assert/strict';
import test from 'node:test';
import {toTeamImages, serializeTeamImages} from './faction-team-image.ts';

test('legacy images remain readable and invalid captions are omitted', () => {
  assert.deepEqual(toTeamImages(['legacy.png', null, {url:'art.png', caption:42, captionEn:'  '}]), [
    {url:'legacy.png'}, {url:'art.png'},
  ]);
});

test('editing an image title preserves both scene captions and its people', () => {
  const [image] = toTeamImages([{url:'art.png',label:'Old',caption:' 장면 설명 ',captionEn:' A scene. ',celebIds:['person-1']}]);
  const saved = serializeTeamImages([{...image,label:'New'}]);
  assert.deepEqual(toTeamImages(saved), [{url:'art.png',label:'New',caption:'장면 설명',captionEn:'A scene.',celebIds:['person-1']}]);
});
