import assert from 'node:assert/strict'
import test from 'node:test'
import { shouldShowContentIntro } from './introVisibility'

const onClick = () => {};

test('direct detail links and navigation callbacks retain the quick introduction', () => {
  for (const props of [{ href: '/content/work' }, { href: '/content/work', onClick },
    { href: '/content/work', onClick, clickModalHasIntroduction: true }]) {
    assert.equal(shouldShowContentIntro(props), true);
  }
});

test('unknown click actions retain INTRO; only an explicitly identified introduction modal replaces it', () => {
  assert.equal(shouldShowContentIntro({ onClick }), true);
  assert.equal(shouldShowContentIntro({ onClick, clickModalHasIntroduction: false }), true);
  assert.equal(shouldShowContentIntro({ onClick, clickModalHasIntroduction: true }), false);
  assert.equal(shouldShowContentIntro({ clickModalHasIntroduction: true }), true);
});

test('selection, review and poster review keep their independent introduction action', () => {
  for (const props of [{ selectable: true }, { opensReview: true }]) {
    assert.equal(shouldShowContentIntro({ ...props, onClick, clickModalHasIntroduction: true }), true);
  }
  assert.equal(shouldShowContentIntro({}), true);
});

test('explicit visibility settings remain authoritative for previews and media without introductions', () => {
  assert.equal(shouldShowContentIntro({ showIntro: true, onClick, clickModalHasIntroduction: true }), true);
  assert.equal(shouldShowContentIntro({ showIntro: false, href: '/content/work' }), false);
});
