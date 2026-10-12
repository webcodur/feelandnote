import assert from 'node:assert/strict';
import test from 'node:test';
import { artworkEntryIndex, buildArtworkSlides } from './artworkSlides';
import { serializeTeamImages, toSceneImages, toTeamImages } from '@feelandnote/shared/lib/faction-team-image';

test('each story opens on an image and ends on a single HTML card', () => {
  const images = [
    { url: 'a', kind: 'scene' as const, opening: { title: 'A', text: 'Start A' } },
    { url: 'b', kind: 'scene' as const, ending: { title: 'A ends', text: 'End A' } },
    { url: 'c', kind: 'scene' as const, opening: { title: 'B', text: 'Start B' }, ending: { title: 'B ends', text: 'End B' } },
  ];
  const slides = buildArtworkSlides(images);
  assert.deepEqual(slides.map(slide => slide.cardKind ?? slide.url), ['a', 'b', 'ending', 'c', 'ending']);
  assert.deepEqual(slides.map(slide => slide.storyNumber), [1, 1, 1, 2, 2]);
  assert.equal(artworkEntryIndex(slides, 2), 3);
  assert.equal(slides[3].sourceIndex, 2);
});

test('an HTML opening uses an image ending; conflicting metadata never creates two HTML cards', () => {
  const opening = { title: 'A', text: 'Start A', format: 'html' as const };
  const ending = { title: 'A ends', text: 'End A', format: 'image' as const };
  const input = [{ url: 'a', opening }, { url: 'b', ending }];
  assert.deepEqual(buildArtworkSlides(input).map(slide => slide.cardKind ?? slide.url), ['opening', 'a', 'b']);
  const conflicting = [{ url: 'a', opening }, { url: 'b', ending: { ...ending, format: 'html' as const } }];
  assert.equal(buildArtworkSlides(conflicting).filter(slide => slide.card).length, 1);
});

test('existing images and a single final ending retain their original entry positions', () => {
  const slides = buildArtworkSlides([{ url: 'cover' }, { url: 'a', ending: { title: 'End', text: 'Afterwards' } }]);
  assert.deepEqual(slides.map(slide => slide.sourceIndex), [0, 1, 2]);
  assert.equal(artworkEntryIndex(slides, 1), 1);
  assert.equal(artworkEntryIndex(slides, 2), 2);
});

test('opening and group linkage survive DB normalization and English localization', () => {
  const input = [{ url: 'a', kind: 'scene' as const, label: '장면', labelEn: 'Scene', caption: '해설.', captionEn: 'Caption.',
    opening: { title: '그룹', titleEn: 'Group', text: '도입.', textEn: 'Opening.', group: '그룹', format: 'image' as const },
    ending: { title: '마무리', titleEn: 'Ending', text: '이후.', textEn: 'Afterwards.', format: 'html' as const } }];
  assert.deepEqual(serializeTeamImages(toTeamImages(input)), input);
  assert.deepEqual(toSceneImages(input, 'en')[0].opening, { title: 'Group', text: 'Opening.', group: '그룹', format: 'image' });
  assert.equal(toSceneImages(input, 'ko')[0].ending?.text, '이후.');
  const englishMissing = [{ ...input[0], opening: { title: '그룹', text: '도입.' } }];
  assert.equal(toSceneImages(englishMissing, 'en')[0].opening, undefined);
});
