// 천도 v2 — 게임 층 안에서만 쓰는 움직임. 모두 .cheondo-root 아래로 묶는다.

const CHEONDO_CSS = `
.cheondo-root { font-feature-settings: "tnum" 0; -webkit-tap-highlight-color: transparent; word-break: keep-all; overflow-wrap: break-word; }
.cheondo-root ::selection { background: rgba(212,175,55,0.35); }
@keyframes cheondo-toast-in { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: none; } }
.cheondo-root .cheondo-toast { animation: cheondo-toast-in 180ms ease-out; }
@keyframes cheondo-pulse { 0% { opacity: .9; transform: scale(.75); } 100% { opacity: 0; transform: scale(1.35); } }
.cheondo-root .cheondo-pulse { transform-box: fill-box; transform-origin: center; animation: cheondo-pulse 1.6s ease-out infinite; }
@keyframes cheondo-spin { to { transform: rotate(360deg); } }
.cheondo-root .cheondo-spin { transform-box: fill-box; transform-origin: center; animation: cheondo-spin 9s linear infinite; }
@keyframes cheondo-breathe { 0%,100% { opacity: .55; } 50% { opacity: 1; } }
.cheondo-root .cheondo-breathe { animation: cheondo-breathe 2.4s ease-in-out infinite; }
@keyframes cheondo-float { 0% { opacity: 0; transform: translate(-50%, 4px) scale(.9); } 15% { opacity: 1; transform: translate(-50%, -6px) scale(1.08); } 100% { opacity: 0; transform: translate(-50%, -34px) scale(1); } }
.cheondo-root .cheondo-float { animation: cheondo-float 1100ms ease-out forwards; }
@keyframes cheondo-shake { 0%,100% { transform: translateX(0); } 20% { transform: translateX(-4px); } 40% { transform: translateX(4px); } 60% { transform: translateX(-3px); } 80% { transform: translateX(2px); } }
.cheondo-root .cheondo-shake { animation: cheondo-shake 320ms ease-out; }
@keyframes cheondo-flash { 0% { opacity: .75; } 100% { opacity: 0; } }
.cheondo-root .cheondo-flash { animation: cheondo-flash 420ms ease-out forwards; }
@keyframes cheondo-banner { 0% { opacity: 0; transform: translateX(-24px) skewX(-8deg); } 18% { opacity: 1; transform: none; } 80% { opacity: 1; } 100% { opacity: 0; transform: translateX(24px); } }
.cheondo-root .cheondo-banner { animation: cheondo-banner 1250ms cubic-bezier(.2,.9,.3,1) forwards; }
@keyframes cheondo-dim-in { from { background-color: rgba(4,5,7,0); } to { background-color: rgba(4,5,7,0.72); } }
.cheondo-root .cheondo-modal-dim { background-color: rgba(4,5,7,0.72); animation: cheondo-dim-in 180ms ease-out; }
@keyframes cheondo-box-in { from { opacity: 0; transform: translateY(10px) scale(.98); } to { opacity: 1; transform: none; } }
.cheondo-root .cheondo-modal-box { animation: cheondo-box-in 220ms cubic-bezier(.2,.9,.3,1) both; }
@keyframes cheondo-rise { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: none; } }
.cheondo-root .cheondo-rise { animation: cheondo-rise 420ms cubic-bezier(.2,.9,.3,1) both; }
@keyframes cheondo-stamp { 0% { opacity: 0; transform: scale(1.8) rotate(-12deg); } 60% { opacity: 1; transform: scale(.94) rotate(-6deg); } 100% { opacity: 1; transform: scale(1) rotate(-6deg); } }
.cheondo-root .cheondo-stamp { animation: cheondo-stamp 520ms cubic-bezier(.2,.9,.3,1) both; }
@keyframes cheondo-glow { 0%,100% { box-shadow: 0 0 0 2px rgba(243,213,122,.9), 0 0 18px rgba(243,213,122,.35); } 50% { box-shadow: 0 0 0 2px rgba(243,213,122,.55), 0 0 6px rgba(243,213,122,.15); } }
.cheondo-root .cheondo-turn { animation: cheondo-glow 1.4s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) {
  .cheondo-root .cheondo-pulse, .cheondo-root .cheondo-spin, .cheondo-root .cheondo-breathe, .cheondo-root .cheondo-turn { animation: none; }
  .cheondo-root .cheondo-shake, .cheondo-root .cheondo-banner, .cheondo-root .cheondo-rise, .cheondo-root .cheondo-stamp,
  .cheondo-root .cheondo-modal-dim, .cheondo-root .cheondo-modal-box { animation-duration: 1ms; }
}
`

export default CHEONDO_CSS
