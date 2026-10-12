import assert from 'node:assert/strict';
import test from 'node:test';
import { buildFactionClusters } from './faction-sections';
import type { FeaturedCeleb } from '@/actions/home/getFeaturedFactions';

test('explicit story groups expose their overviews without exposing inactive profiles', () => {
  const people = [{ id: 'active', group_label: '도그마 95', group_label_en: 'Dogme 95', group_position: 3 }] as FeaturedCeleb[];
  const images = ['블랙리스트', '누벨바그', '도그마 95'].map((name, i) => ({ url: String(i), kind: 'scene' as const,
    opening: { title: name, titleEn: ['Blacklist', 'New Wave', 'Dogme 95'][i], text: '도입.', textEn: 'Opening.', group: name } }));
  const groups = buildFactionClusters(people, 'en', images);
  assert.deepEqual(groups.map(group => [group.label, group.celebIds]), [['Blacklist', []], ['New Wave', []], ['Dogme 95', ['active']]]);
});

test('an opening title alone does not invent an additional member group', () => {
  const people = [{ id: 'active', group_label: '기존 그룹', group_label_en: 'Existing', group_position: 1 }] as FeaturedCeleb[];
  const groups = buildFactionClusters(people, 'ko', [{ url: 'a', kind: 'scene', opening: { title: '다른 이야기', text: '도입.' } }]);
  assert.deepEqual(groups.map(group => group.name), ['기존 그룹']);
});
