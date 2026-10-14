import { DeviceTranslation, TARGETS } from './engine.mjs';
import { LANGUAGES, SOURCES } from './languages.mjs';
import { environment, fallback } from './fallback.mjs';

const $ = id => document.getElementById(id);
let storage;
try { storage = localStorage; } catch { storage = null; }
const engine = new DeviceTranslation({ storage });
const env = environment();
let selected = 'zh';
try { selected = storage?.getItem('fn-lab-language') || 'zh'; } catch { /* Optional preference. */ }
if (!LANGUAGES[selected]) selected = 'zh';
let mode = 'waiting';
let reviewIndex = 0;
let choiceVersion = 0;
const requests = new Map();
const checks = {};

Object.entries(LANGUAGES).forEach(([code, copy]) => {
  const option = document.createElement('option');
  option.value = code; option.textContent = copy.name;
  $('language').append(option);
});
$('language').value = selected;
const copy = () => LANGUAGES[selected];
function labels() {
  ['start', 'original', 'open', 'close', 'next'].forEach(id => { $(id).textContent = copy()[id]; });
  $('modal-original').textContent = copy().original;
  document.querySelector('h1').textContent = copy().heading;
  $('dialog-title').textContent = copy().dialog;
  document.documentElement.lang = selected;
}
function diagnostics(extra = {}) {
  $('diagnostics').textContent = JSON.stringify({ environment: env, mode, selected,
    availability: checks, metrics: engine.metrics, ...extra }, null, 2);
}
function showFallback() {
  const advice = fallback(env);
  $('fallback').hidden = false;
  const adviceIndex = advice.key === 'iosChrome' ? 2 : { desktop: 0, ios: 1, android: 2 }[env.kind];
  $('advice').textContent = (env.embedded ? copy().externalBrowser + ' ' : '') + copy().advice[adviceIndex];
  $('guide').href = advice.url; $('guide').textContent = copy().guide;
  $('fallback-step').textContent = copy().fallbackStep;
  $('copy-link').textContent = copy().copyLink;
  $('page-link').hidden = true;
}
async function renderSlot(id, source) {
  const version = (requests.get(id) || 0) + 1;
  requests.set(id, version);
  const node = $(id);
  node.lang = selected;
  if (mode === 'original') { node.textContent = source; node.lang = 'en'; node.dataset.state = 'original'; return; }
  node.textContent = copy().pending;
  node.dataset.state = 'pending';
  if (mode !== 'translated') {
    if (mode === 'failed') { node.textContent = copy().failed; node.dataset.state = 'failed'; }
    if (mode === 'unavailable') { node.textContent = copy().unavailable; node.dataset.state = 'unavailable'; }
    return;
  }
  const epoch = engine.epoch;
  try {
    const result = await engine.translate(source);
    if (requests.get(id) !== version || epoch !== engine.epoch) return;
    node.textContent = result; node.dataset.state = 'translated';
    diagnostics();
  } catch (error) {
    if (requests.get(id) !== version || epoch !== engine.epoch) return;
    node.textContent = copy().failed; node.dataset.state = 'failed';
    diagnostics({ error: error.code || error.name });
  }
}
function render() {
  void renderSlot('intro', SOURCES.intro);
  if ($('review-dialog').open) void renderSlot('review', SOURCES.reviews[reviewIndex]);
}
async function inspect() {
  const version = choiceVersion;
  const status = selected === 'en' ? 'available' : await engine.availability(selected);
  if (version !== choiceVersion) return;
  checks[selected] = status;
  const missing = ['missing-api', 'unavailable', 'check-failed'].includes(status);
  $('start').disabled = missing || selected === 'en';
  if (missing) { mode = 'unavailable'; $('status').textContent = copy().unavailable; showFallback(); render(); }
  diagnostics();
}
$('start').addEventListener('click', async () => {
  const version = choiceVersion;
  mode = 'preparing'; $('fallback').hidden = true;
  $('status').textContent = copy().pending; $('start').disabled = true; render();
  try {
    await engine.activate(selected, progress => { $('status').textContent = `${copy().pending} ${progress}%`; });
    if (version !== choiceVersion) return;
    mode = 'translated'; $('status').textContent = copy().ready; render();
  } catch (error) {
    if (version !== choiceVersion || error.code === 'superseded') return;
    mode = 'failed'; $('status').textContent = copy().failed; showFallback(); render();
    diagnostics({ error: error.code || error.name });
  } finally { if (version === choiceVersion) $('start').disabled = false; }
});
function showOriginal() {
  choiceVersion += 1; engine.original(); mode = 'original';
  $('status').textContent = copy().original; $('start').disabled = !env.api || selected === 'en'; render(); diagnostics();
}
$('original').addEventListener('click', showOriginal);
$('modal-original').addEventListener('click', showOriginal);
$('language').addEventListener('change', () => {
  choiceVersion += 1; engine.original(); selected = $('language').value;
  try { storage?.setItem('fn-lab-language', selected); } catch { /* Optional preference. */ }
  mode = selected === 'en' ? 'original' : 'waiting';
  $('fallback').hidden = true; $('start').disabled = true; labels(); render();
  $('status').textContent = mode === 'original' ? copy().original : copy().pending;
  void inspect();
});
$('open').addEventListener('click', () => { $('review-dialog').showModal(); render(); });
$('close').addEventListener('click', () => { requests.set('review', (requests.get('review') || 0) + 1); $('review-dialog').close(); });
$('next').addEventListener('click', () => { reviewIndex = (reviewIndex + 1) % SOURCES.reviews.length; render(); });
$('clear').addEventListener('click', () => { engine.cache.clear(); diagnostics(); });
$('copy-link').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(location.href); $('copy-link').textContent = copy().copied; }
  catch {
    $('page-link').value = location.href; $('page-link').hidden = false;
    $('page-link').ariaLabel = copy().copyLink; $('page-link').select();
    $('status').textContent = copy().manualCopy;
  }
});
labels();
if (selected === 'en') mode = 'original';
render(); void inspect();
window.translationLab = { engine, env, checks, sources: SOURCES, targets: TARGETS };
