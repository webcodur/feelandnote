import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildStorySlides, readStoryBoundary } from './storyBoundaries';

test('two independent stories have their own guides without losing narrative text', () => {
  const images = [
    { url: 'cover', label: 'Cover' },
    { url: 'a1', kind: 'scene' as const, caption: '〈첫 이야기〉 이야기를 시작합니다.\n\n원인. 행동.' },
    { url: 'a2', kind: 'scene' as const, caption: '결과.\n\n〈첫 이야기〉 이야기는 여기서 마칩니다.' },
    { url: 'b1', kind: 'scene' as const, caption: 'A new story begins: Second Story.\n\nA beginning. A result.\n\nThis concludes Second Story.' },
  ];
  const slides = buildStorySlides(images);
  assert.deepEqual(slides.map(s => s.guide?.phase ?? s.url), ['cover', 'opening', 'a1', 'a2', 'closing', 'opening', 'b1', 'closing']);
  assert.deepEqual(slides.filter(s => !s.guide).map(s => [s.sourceIndex, s.caption]), [[0, undefined], [1, '원인. 행동.'], [2, '결과.'], [3, 'A beginning. A result.']]);
  assert.deepEqual(slides.filter(s => s.guide).map(s => [s.sourceIndex, s.guide?.title]), [[1, '첫 이야기'], [2, '첫 이야기'], [3, 'Second Story'], [3, 'Second Story']]);
});

test('ordinary captions, quoted phrases and existing final endings remain intact', () => {
  const caption = '왕이 “이야기를 시작합니다.”라고 말했다.\n\nThis concludes nothing in this story, he said.';
  assert.equal(readStoryBoundary(caption).caption, caption);
  const ending = { title: 'Afterward', text: 'The aftermath.' };
  const images = [{ url: 'a', kind: 'scene' as const, caption, ending }];
  assert.deepEqual(buildStorySlides(images), [{ ...images[0], sourceIndex: 0 }]);
  const withGuide = buildStorySlides([{ ...images[0], caption: '〈이야기〉 이야기를 시작합니다.\n\n결과.\n\n〈이야기〉 이야기는 여기서 마칩니다.' }]);
  assert.deepEqual(withGuide.at(-1)?.ending, ending);
});
