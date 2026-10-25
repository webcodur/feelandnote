import test from 'node:test';
import assert from 'node:assert/strict';
import { planPersonPhotos, assertPersonPhotoFlow, publishedImageSources, assetsForPost, assertPublicRepresentative, publishedImageNodes } from './person-photo-plan.mjs';
const assets = ['john', 'john-green', 'kim'].map(slug => ({ slug, nickname: slug, uploadFile: `/uploads/portrait-${slug}-new.jpg` }));
const img = name => ({ src: `https://postfiles.pstatic.net/x/${encodeURIComponent(name)}`, width: '200' });
test('public component IDs identify slots despite empty editor components and multiple strip images', () => {
  const html = '<div class="se-component se-image" id="first"><div class="se-component-content"><img class="se-image-resource" src="https://cdn/first.jpg"></div></div><div class="se-component se-image" id="empty"></div><div class="se-component se-text" id="text">text</div><div class="se-component se-imageStrip" id="strip"><img class="se-image-resource" src="https://cdn/a.jpg"><img class="se-image-resource" src="https://cdn/b.jpg"></div>';
  assert.deepEqual(publishedImageNodes(html).map(n => n.id), ['first', 'strip::0', 'strip::1']);
});
test('representative check accepts the actual blogthumb/postfiles CDN difference after replacement', () => {
  const before = { images: ['https://postfiles.pstatic.net/old/portrait.jpg', 'https://postfiles.pstatic.net/c/cover.jpg'], og: 'https://blogthumb.pstatic.net/old/portrait.jpg?type=w2' };
  const after = { images: ['https://postfiles.pstatic.net/new/portrait.jpg', before.images[1]], og: 'https://blogthumb.pstatic.net/new/portrait.jpg?type=w2' };
  assertPublicRepresentative(before, after);
  assert.throws(() => assertPublicRepresentative(before, { ...after, og: 'https://blogthumb.pstatic.net/c/cover.jpg?type=w2' }));
});
test('institution reviewers use small current avatars and protagonists use portraits', () => {
  const both = [{ ...assets[0], role: 'portrait', uploadFile: '/portrait.jpg' }, { ...assets[0], role: 'avatar', uploadFile: '/avatar.jpg' }];
  const institution = { kind: 'curated' }, person = { kind: 'celeb' };
  assert.equal(assetsForPost(both, institution)[0].uploadFile, '/avatar.jpg');
  assert.equal(assetsForPost(both, person)[0].uploadFile, '/portrait.jpg');
  assert.equal(planPersonPhotos([img('portrait-john-old.jpg')], assetsForPost(both, institution), {}, [], institution).changes[0].width, 100);
});
test('published images include external extensionless covers and repeated images, excluding page chrome', () => {
  const html = '<img src="https://cdn/profile.jpg"><img src="https://cdn/a.jpg?type=blur" class="se-image-resource"><img class="se-image-resource" src="https://cdn/a.jpg?type=blur"><img src="http://image.yes24.com/goods/111123903/XL" class="se-image-resource">';
  assert.deepEqual(publishedImageSources(html), ['https://cdn/a.jpg', 'https://cdn/a.jpg', 'http://image.yes24.com/goods/111123903/XL']);
});
test('all repeated portraits, local files and strips are selected, covers excluded', () => {
  const result = planPersonPhotos(['portrait-john-green-old.jpg', 'cover.jpg', 'local-kim-old.png', 'portrait-john-green-old.jpg'].map(img), assets);
  assert.deepEqual(result.changes.map(c => [c.index, c.slug]), [[0, 'john-green'], [2, 'kim'], [3, 'john-green']]);
});
test('ambiguous names and generic square images are never guessed', () => {
  const result = planPersonPhotos([img('김-1.jpg'), { ...img('kim-0.jpg'), naturalWidth: 100, naturalHeight: 100 }], assets, { ambiguousNicknames: ['김'] });
  assert.equal(result.changes.length, 0);
  assert.equal(result.unmatched.length, 1);
});
test('reviewed old filename is matched after index shifts', () => {
  assert.equal(planPersonPhotos([img('cover.jpg'), img('reviewed-file-1.jpg')], assets, {}, [{ index: 8, slug: 'kim', oldBasename: 'reviewed-file-' }]).changes[0].index, 1);
});
test('mixed image/text/strip flow is preserved', () => {
  const before = { images: [img('portrait-kim-old.jpg')], flow: [{ kind: 'text', text: 'A' }, { kind: 'imageStrip', sources: [img('portrait-kim-old.jpg').src] }] };
  const after = { images: [img('portrait-kim-new.jpg')], flow: [{ kind: 'text', text: 'A' }, { kind: 'imageStrip', sources: [img('portrait-kim-new.jpg').src] }] };
  assertPersonPhotoFlow(before, after, [{ index: 0 }]);
  assert.throws(() => assertPersonPhotoFlow(before, { ...after, flow: [...after.flow].reverse() }, [{ index: 0 }]));
});
test('identical originals replaced at separate slots keep their individual new URLs', () => {
  const old = img('portrait-kim-old.jpg').src;
  const before = { images: [{ src: old }, { src: old }], flow: [{ kind: 'image', src: old }, { kind: 'image', src: old }] };
  const after = { images: [{ src: 'new1' }, { src: 'new2' }], flow: [{ kind: 'image', src: 'new1' }, { kind: 'image', src: 'new2' }] };
  assertPersonPhotoFlow(before, after, [{ index: 0 }, { index: 1 }]);
});
