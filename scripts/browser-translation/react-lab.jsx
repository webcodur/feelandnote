import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import { createPortal } from 'react-dom';
import { DeviceTranslation } from './engine.mjs';
import { LANGUAGES, SOURCES } from './languages.mjs';

const Context = createContext(null);
function TranslationProvider({ children }) {
  const [engine] = useState(() => {
    let storage = null;
    try { if (typeof window !== 'undefined') storage = window.localStorage; } catch { /* Optional cache. */ }
    return new DeviceTranslation({ storage });
  });
  const [target, setTarget] = useState('zh');
  const [mode, setMode] = useState('waiting');
  const version = useRef(0);
  async function start(language = target) {
    const request = ++version.current;
    setTarget(language); setMode('preparing');
    try {
      await engine.activate(language);
      if (version.current === request) setMode('translated');
    } catch { if (version.current === request) setMode('failed'); }
  }
  function original() { version.current += 1; engine.original(); setMode('original'); }
  if (typeof window !== 'undefined') window.reactTranslationLab = { engine, mode, target, reactVersion: React.version };
  return <Context.Provider value={{ engine, mode, target, start, original }}>{children}</Context.Provider>;
}
function TranslatedText({ source, id }) {
  const { engine, mode, target } = useContext(Context);
  const [result, setResult] = useState(null);
  const key = JSON.stringify([target, source, engine.epoch]);
  useEffect(() => {
    let current = true;
    if (mode === 'translated') engine.translate(source).then(
      text => { if (current) setResult({ key, text, state: 'translated' }); },
      () => { if (current) setResult({ key, text: LANGUAGES[target].failed, state: 'failed' }); },
    );
    return () => { current = false; };
  }, [engine, key, mode, source, target]);
  if (mode === 'original') return <p id={id} data-state="original" lang="en" className="prose">{source}</p>;
  if (mode === 'failed') return <p id={id} data-state="failed" lang={target}>{LANGUAGES[target].failed}</p>;
  const ready = mode === 'translated' && result?.key === key;
  return <p id={id} data-state={ready ? result.state : 'pending'} lang={target} className="prose">
    {ready ? result.text : LANGUAGES[target].pending}
  </p>;
}
function App() {
  const { target, start, original } = useContext(Context);
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const copy = LANGUAGES[target];
  return <main>
    <h1>React {React.version} · Portal translation test</h1>
    <div className="toolbar">
      <select id="react-language" value={target} onChange={event => start(event.target.value)} aria-label="Language">
        {Object.entries(LANGUAGES).filter(([code]) => code !== 'en').map(([code, language]) =>
          <option key={code} value={code}>{language.name}</option>)}
      </select>
      <button id="react-start" onClick={() => start()}>{copy.start}</button>
      <button id="react-original" onClick={original}>{copy.original}</button>
    </div>
    <TranslatedText id="react-intro" source={SOURCES.intro} />
    <button id="react-open" onClick={() => setOpen(true)}>{copy.open}</button>
    {open && createPortal(<div className="react-overlay"><section role="dialog" aria-modal="true" className="react-modal">
      <h2>{copy.dialog}</h2>
      <TranslatedText id="react-review" source={SOURCES.reviews[index]} />
      <div className="toolbar">
        <button id="react-next" onClick={() => setIndex(value => (value + 1) % SOURCES.reviews.length)}>{copy.next}</button>
        <button id="react-modal-original" onClick={original}>{copy.original}</button>
        <button id="react-close" onClick={() => setOpen(false)}>{copy.close}</button>
      </div>
    </section></div>, document.body)}
  </main>;
}
export function Lab() { return <TranslationProvider><App /></TranslationProvider>; }
if (typeof document !== 'undefined') {
  const root = document.getElementById('react-root');
  if (root.hasChildNodes()) hydrateRoot(root, <Lab />);
  else createRoot(root).render(<Lab />);
}
