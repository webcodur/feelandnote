import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const require = createRequire(import.meta.url)
const { build } = createRequire(require.resolve('tsx'))('esbuild')
export const appDir = fileURLToPath(new URL('../../../../../', import.meta.url))

export async function fixture(locale: 'ko' | 'en', personName = 'Stephen Fry', referenceIntro: string | null = 'Book introduction', options: { review?: string | null; intro?: string | null; introDelay?: number; failIntro?: boolean; personFirst?: boolean; sparseRelations?: boolean; sparseMedia?: boolean } = {}) {
  const review = options.review === undefined ? 'Review' : options.review
  const output = await build({
    absWorkingDir: appDir, tsconfig: path.join(appDir, 'tsconfig.json'), outdir: 'fixture', write: false,
    bundle: true, platform: 'browser', format: 'iife', jsx: 'automatic', define: { 'process.env': '{}' },
    stdin: { resolveDir: appDir, loader: 'tsx', contents: `
      import { createRoot } from 'react-dom/client';
      import HomeGraph from './src/components/features/home/introduction/HomeGraph';
      import HomePersonRotation from './src/components/features/home/introduction/HomePersonRotation';
      import introStyles from './src/components/features/home/introduction/HomeIntroduction.module.css';
      import AnimatedHeight from './src/components/ui/AnimatedHeight';
      import { useHomePersonRotation } from './src/components/features/home/introduction/useHomePersonRotation';
      const longText='A reading experience with enough detail to extend beyond the visible preview. '.repeat(80);
      const item = (type, i) => ({ id:type+i, type, title:type+i, creator:'Creator', text:i===1?${JSON.stringify(review)}:longText, sourceUrl:'https://source.test/evidence', thumbnailUrl:'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2296%22 height=%22140%22/%3E' });
      const person={ id:'person', slug:'person', name:${JSON.stringify(personName)}, title:'Writer and broadcaster', avatarUrl:'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2296%22 height=%2296%22/%3E', photoUrl:'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22480%22 height=%22600%22/%3E' };
      const relationItem=(key,i)=>({...item('BOOK',i),id:key+i,title:key+i,text:i===1?${JSON.stringify(referenceIntro)}:longText,sourceUrl:null,...(key==='affiliation'?{relatedLabel:'Their world',relatedHref:'/explore/faction/their-world',relatedDescription:'A theme about people and their world.',relatedGroup:'Their group'}:{}),...(key==='profession'?{professionCategory:i===1?'train':'become',relatedDescription:'Why this book was selected.'}:{})});
      const data={person,branches:[...['BOOK','VIDEO','MUSIC','GAME'].map(type=>({key:type,count:2,items:[item(type,1),item(type,2)]})),...['appearance','authored','profession','affiliation'].map(key=>({key,count:2,items:[relationItem(key,1),relationItem(key,2)]}))]};
      if(${!!options.sparseRelations}) data.branches=data.branches.map(branch=>['BOOK','authored'].includes(branch.key)?branch:{...branch,items:[]});
      if(${!!options.sparseMedia}) data.branches=data.branches.map(branch=>branch.key==='BOOK'?branch:{...branch,items:[]});
      const people=[1,2,3].map(index=>({person:{...person,id:'person'+index,slug:'person'+index,name:'Person '+index},branches:data.branches}));
      function RotationProbe(){const {ref,index,move}=useHomePersonRotation(3);return <div ref={ref}><span data-rotation-index>{index}</span><button data-rotation-next onClick={()=>move(1)}>Next person</button></div>}
      createRoot(document.getElementById('root')).render(<>${options.personFirst ? '<div className={introStyles.showcaseEditorial}><HomePersonRotation people={people}/></div>' : '<AnimatedHeight><HomeGraph data={data} onNavigate={()=>{}}/></AnimatedHeight>'}<section id="following">Following section</section><RotationProbe/></>);
    ` },
    plugins: [{ name: 'home-media-fixture', setup(builder: {
      onResolve: (options: { filter: RegExp }, callback: (args: { path: string }) => unknown) => void
      onLoad: (options: { filter: RegExp; namespace: string }, callback: (args: { path: string }) => unknown) => void
    }) {
      const empty = 'export default function Empty() { return null }'
      const mocks: Record<string, string> = {
        'next/image': 'export default p=><img src={p.src} alt={p.alt} width={p.width} height={p.height} className={p.className} onLoad={p.onLoad} onError={p.onError} style={p.fill?{position:"absolute",inset:0,width:"100%",height:"100%"}:undefined}/>;',
        'next-intl': `const messages=${JSON.stringify(require(path.join(appDir, 'messages', locale, 'home.json')))}; export const useLocale=()=>${JSON.stringify(locale)}; export const useTranslations = namespace => { const base=namespace.split('.').reduce((value,part)=>value?.[part],messages); return (key,values={}) => {const text=key.split('.').reduce((value,part)=>value?.[part],base)??key;return text.replace(/\\{(\\w+)\\}/g,(_,name)=>values[name]??name);}; };`,
        'next/dynamic': `import React, { lazy, Suspense } from 'react'; export default (load, options={}) => { const Component=lazy(load); return props=><Suspense fallback={options.loading ? <options.loading/> : null}><Component {...props}/></Suspense> }`,
        '@/i18n/navigation': "export const Link = 'a'; export const useRouter = () => ({refresh(){}});",
        '@/actions/contents/getMediaEmbed': `export async function getMediaEmbed(id) { window.mediaCalls=(window.mediaCalls||0)+1; await new Promise(resolve=>setTimeout(resolve,700)); if(id.startsWith('MUSIC'))return {embedType:'appleMusicPreview',embedId:id,previewUrl:null}; return {embedType:'youtube',embedId:id,images:Array.from({length:12},()=> 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg"/>')}; }`,
        '@/actions/contents/getContentBrief': `export async function getContentBriefResult(contentId){window.introCalls=(window.introCalls||0)+1;await new Promise(resolve=>setTimeout(resolve,${options.introDelay ?? 0}));window.introSettled=(window.introSettled||0)+1;return ${options.failIntro ? '{status:"failed",brief:null}' : `{status:"ready",brief:{contentId,description:${options.intro === undefined ? '(/^(appearance|authored|profession|affiliation)/.test(contentId) ? (contentId.endsWith("1") ? '+JSON.stringify(referenceIntro)+' : "A reading experience with enough detail to extend beyond the visible preview. ".repeat(80)) : "Introduction of "+contentId)' : JSON.stringify(options.intro)}}}`}}`,
        '@/lib/analytics/operation': 'export const beginOperation=()=>()=>{};',
        './HomeWorkCover': empty,
        '@/components/ui/media-objects/InteractiveMediaCover': 'export default p => <img src={p.image} alt={p.title} style={{width:"100%",height:"100%"}}/>;',
        '@/components/ui/ImageViewerModal': 'export default p => <div role="dialog" aria-label={p.alt} data-test-cover-preview><img src={p.src} alt={p.alt}/><button onClick={p.onClose}>Close</button></div>;',
        '@/components/ui/ContentTextModal': 'import {createPortal} from "react-dom"; export default p => p.isOpen ? createPortal(<div role="dialog" aria-label={p.title} data-test-text-modal style={{position:"fixed",inset:20,zIndex:100,background:"white",overflow:"auto"}}><button onClick={p.onClose}>Close</button><p>{p.text}</p>{p.source && <a href={p.source.href}>{p.source.label}</a>}</div>,document.body) : null;',
        '@/components/ui/Modal': 'import {createPortal} from "react-dom"; import {useEffect} from "react"; export default p => {useEffect(()=>{const key=e=>{if(e.key==="Escape")p.onClose()};document.addEventListener("keydown",key);return()=>document.removeEventListener("keydown",key)},[p.onClose]);return p.isOpen?createPortal(<div role="dialog" aria-label={p.title} data-test-media-modal style={{position:"fixed",inset:20,zIndex:100,background:"white",overflow:"auto"}}><h2>{p.title}</h2><button data-media-close onClick={p.onClose}>Close</button>{p.children}</div>,document.body):null}',
        '@/components/ui/pending/LinkPending': 'export default p => <>{p.children}</>;',
        '@/components/features/faction/FactionArtworkViewer': empty,
        '@/components/ui/ContentImage': 'export default p => <img src={p.src} alt={p.alt} style={{position:"absolute",width:"100%",height:"100%"}}/>;',
        '@/hooks/useMouseDragScroll': "import {useRef} from 'react'; export const useMouseDragScroll=()=>({ref:useRef(null),dragProps:{},cursorClassName:''});",
      }
      builder.onResolve({ filter: /.*/ }, args => args.path in mocks ? { path: args.path, namespace: 'fixture' } : undefined)
      builder.onLoad({ filter: /.*/, namespace: 'fixture' }, args => ({ contents: mocks[args.path], loader: 'tsx', resolveDir: appDir }))
    } }],
  })
  const cssRequire = createRequire(require.resolve('@tailwindcss/postcss'))
  const css = await cssRequire('postcss')([require('@tailwindcss/postcss')()]).process(
    '@import "tailwindcss" source(none); @source "./src/components/features/content/*.tsx"; @source "./src/components/ui/pending/*.tsx"; @source "./src/components/ui/ContentReadingText.tsx"; @source "./src/components/shared/ContentReading/*.tsx"; @source "./src/components/shared/ContentCoverLink.tsx"; @source "./src/components/shared/ShelfCategoryTabs/*.tsx"; @theme { --color-bg-main:#10100f; --color-bg-card:#1b1a18; --color-line:#38352f; --color-accent:#d7bd78; --radius-card:12px; --radius-control:6px; }',
    { from: path.join(appDir, 'home-media-fixture.css') },
  )
  return {
    js: output.outputFiles.find((file: { path: string }) => file.path.endsWith('.js')).text,
    css: css.css + output.outputFiles.find((file: { path: string }) => file.path.endsWith('.css')).text,
  }
}
