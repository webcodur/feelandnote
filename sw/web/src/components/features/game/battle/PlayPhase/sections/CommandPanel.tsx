/*
  CommandPanel — 중앙 군령패 (목패 3개) + 가이드 텍스트 + 출전/휴식 버튼
  Desktop only (lg:)
*/
import type { Command, Mandate, BattleCard as BattleCardType } from "@/lib/game/types";
import { COMMANDS, MANDATE_BONUS } from "@/lib/game/types";
import { calcAptitude, aptitudeToStars } from "@/lib/game/gameEngine";
import { getBattlePlaqueLabel, getBattleSealLabel } from "../../i18n";
import type { BattleText } from "../types";

interface Props {
  selectedCard: BattleCardType | undefined;
  selectedCommand: Command | null;
  mandate: Mandate | null;
  isSelecting: boolean;
  isReady: boolean;
  playerExhausted: boolean;
  guideText: string;
  locale: string;
  text: BattleText;
  onCommandClick: (cmd: Command) => void;
  onConfirm: () => void;
  onSubmitRest?: () => void;
  onInfoCmd: (cmd: Command) => void;
}

export default function CommandPanel({
  selectedCard, selectedCommand, mandate,
  isSelecting, isReady, playerExhausted,
  guideText, locale, text,
  onCommandClick, onConfirm, onSubmitRest, onInfoCmd,
}: Props) {
  return (
    <div className="flex flex-col items-center gap-3 shrink-0 bg-black/80 rounded-xl p-4 pt-8">
      {/* 군령패 3개 (세로 목패) */}
      <div className="flex items-end gap-2.5 xl:gap-3.5">
        {COMMANDS.map((cmd) => {
          const isSelected = selectedCommand === cmd;
          const rawApt = selectedCard ? calcAptitude(selectedCard, cmd) : 0;
          const isMandateCmd = mandate?.command === cmd;
          const apt = isMandateCmd ? rawApt * MANDATE_BONUS : rawApt;
          const stars = selectedCard ? aptitudeToStars(apt) : 0;
          const isDisabled = !isSelecting;
          const label = getBattlePlaqueLabel(cmd, locale);

          return (
            <div key={cmd}
              className={`relative flex flex-col items-center transition-all duration-300 ease-out ${
                isSelected ? "-translate-y-3" : isDisabled ? "" : "hover:-translate-y-1"
              }`}
            >
              {/* 선택 시 하단 광원 */}
              {isSelected && !isDisabled && (
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-[80%] h-3 rounded-full pointer-events-none" style={{
                  background: "radial-gradient(ellipse, rgba(248,113,113,0.5) 0%, transparent 70%)",
                  filter: "blur(4px)",
                }} />
              )}
              <button type="button"
                onClick={() => !isDisabled && onCommandClick(cmd)}
                disabled={isDisabled}
                className={`relative flex flex-col items-center w-[64px] xl:w-[88px] rounded-[3px] overflow-hidden bg-black transition-all duration-300 ${
                  isDisabled
                    ? "opacity-30 cursor-not-allowed saturate-0 shadow-[1px_2px_6px_rgba(0,0,0,0.4)]"
                    : isSelected
                      ? "cursor-pointer shadow-[0_4px_20px_rgba(0,0,0,0.7),0_0_15px_rgba(248,113,113,0.2)]"
                      : "cursor-pointer shadow-[2px_3px_10px_rgba(0,0,0,0.6)] brightness-[0.85] hover:brightness-100"
                }`}
              >
                {/* 목재 텍스처 */}
                <div className="absolute inset-0 bg-cover bg-center"
                  style={{
                    backgroundImage: "url('/images/textures/wood-tablet.jpg')",
                    filter: isSelected ? "brightness(0.4) saturate(1.1)" : "brightness(0.25) saturate(0.8)",
                  }}
                />
                {/* 스크래치/마모 오버레이 */}
                <div className="absolute inset-0 opacity-[0.08] mix-blend-overlay" style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='5' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
                }} />
                {/* 모서리 마모 (비네팅) */}
                <div className="absolute inset-0 rounded-[3px]" style={{
                  boxShadow: "inset 3px 3px 6px rgba(0,0,0,0.35), inset -3px -3px 6px rgba(0,0,0,0.25), inset 0 0 12px rgba(0,0,0,0.2)",
                }} />
                {/* 외곽 금속/옻칠 테두리 */}
                <div className="absolute inset-0 rounded-[3px]" style={{
                  boxShadow: isSelected
                    ? "inset 0 0 0 1.5px rgba(180,80,50,0.5), 0 0 0 1px rgba(0,0,0,0.6)"
                    : "inset 0 0 0 1px rgba(100,70,45,0.3), 0 0 0 1px rgba(0,0,0,0.4)",
                }} />
                {/* 상단: 봉인 인장 + 정보 */}
                <div className="relative w-full flex flex-col items-center pt-2 xl:pt-2.5 pb-1 gap-1"
                  onClick={(e) => { e.stopPropagation(); onInfoCmd(cmd); }}
                >
                  <div className="relative w-5 h-5 xl:w-6 xl:h-6 flex items-center justify-center cursor-help">
                    {/* 인장 원형 베이스 */}
                    <div className="absolute inset-0 rounded-full" style={{
                      background: "radial-gradient(circle at 40% 35%, #6a4830 0%, #3a2818 60%, #2a1a10 100%)",
                      boxShadow: "inset 0 1px 2px rgba(140,100,60,0.3), inset 0 -1px 2px rgba(0,0,0,0.5), 0 1px 3px rgba(0,0,0,0.4)",
                    }} />
                    <span className="relative text-[8px] xl:text-[10px] font-bold select-none" style={{
                      fontFamily: "'Noto Serif KR', serif",
                      color: "rgba(200,160,100,0.6)",
                      textShadow: "0 -1px 1px rgba(0,0,0,0.8)",
                    }}>
                      {getBattleSealLabel(cmd, locale)}
                    </span>
                  </div>
                  <div className="w-7 xl:w-9 h-px bg-gradient-to-r from-transparent via-[#a07850]/40 to-transparent" />
                </div>
                {/* 중앙: 명령 글자 (붓 터치 강조) */}
                <div className="relative flex flex-col items-center gap-0.5 xl:gap-1 py-1.5 xl:py-2">
                  {label.split("").map((char, i) => (
                    <span key={i}
                      className="block text-xl xl:text-2xl font-bold leading-none transition-colors duration-300"
                      style={{
                        fontFamily: "'Noto Serif KR', serif",
                        ...(isMandateCmd ? {
                          color: "#f0c850",
                          textShadow: "0 1px 2px rgba(0,0,0,0.8), 0 0 8px rgba(212,168,67,0.6)",
                        } : isSelected ? {
                          color: "#ff7070",
                          textShadow: "0 1px 2px rgba(0,0,0,0.8), 0 0 6px rgba(248,113,113,0.4)",
                        } : {
                          color: "#9a2a2a",
                          textShadow: "0 1px 2px rgba(0,0,0,0.6), 0 -1px 1px rgba(140,60,40,0.15)",
                        }),
                      }}
                    >{char}</span>
                  ))}
                </div>
                {/* 하단: 별점 (금속 핀 스타일) */}
                <div className="relative flex flex-col items-center gap-[3px] xl:gap-1 py-2 xl:py-2.5">
                  {Array.from({ length: 5 }, (_, i) => {
                    const lit = selectedCard && i < stars;
                    return (
                      <span key={i}
                        className="text-[10px] xl:text-xs leading-none transition-all duration-200"
                        style={lit ? {
                          color: "#e8c050",
                          textShadow: "0 0 4px rgba(217,169,78,0.7), 0 1px 1px rgba(0,0,0,0.5)",
                          filter: "drop-shadow(0 0 2px rgba(217,169,78,0.4))",
                        } : {
                          color: "rgba(60,40,20,0.4)",
                          textShadow: "0 1px 1px rgba(0,0,0,0.3)",
                        }}
                      >★</span>
                    );
                  })}
                </div>
                <div className="relative w-full flex flex-col items-center pb-2 xl:pb-2.5">
                  <div className="w-7 xl:w-9 h-px bg-gradient-to-r from-transparent via-[#8b6040]/25 to-transparent" />
                </div>
              </button>
            </div>
          );
        })}
      </div>
      {/* 가이드 텍스트 */}
      <p className="text-xs xl:text-sm text-white/60">{guideText}</p>
      {/* 출전 / 한 턴 쉬기 버튼 */}
      <div className="relative mt-4 w-full flex justify-center">
        {playerExhausted ? (
          /* ─ 한 턴 쉬기 버튼 (유저 패 소진) ─ */
          <button
            type="button"
            onClick={onSubmitRest}
            className="relative w-[210px] xl:w-[260px] h-[56px] xl:h-[64px] rounded-[6px] cursor-pointer active:scale-[0.97] active:translate-y-[2px] hover:scale-[1.02] transition-all duration-300 group/btn"
          >
            <div className="absolute inset-0 rounded-[6px] bg-gradient-to-b from-[#3a3d42] to-[#1a1c20] border border-[#4a5060]/60 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_4px_10px_rgba(0,0,0,0.6)]" />
            <div className="absolute inset-[3px] xl:inset-[4px] rounded-[3px]" style={{
              background: "linear-gradient(to bottom, #2a4a6a, #1a2a3a)",
              boxShadow: "inset 0 2px 6px rgba(0,0,0,0.7), inset 0 -1px 2px rgba(100,180,255,0.1)",
            }} />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="flex flex-col items-center">
                <span className="text-[18px] xl:text-[22px] font-bold tracking-[0.15em] ml-[0.15em] select-none text-blue-200/90" style={{
                  fontFamily: "'Noto Serif KR', 'Noto Serif TC', serif",
                  textShadow: "0 1px 3px rgba(0,0,0,0.9), 0 0 8px rgba(100,180,255,0.3)",
                }}>
                  {text.play.restButton}
                </span>
                <span className="text-[9px] xl:text-[10px] text-blue-300/50 mt-1">
                  {text.play.randomRecover}
                </span>
              </div>
            </div>
            <div className="absolute inset-[3px] xl:inset-[4px] rounded-[3px] opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300 pointer-events-none" style={{
              background: "radial-gradient(ellipse at center, rgba(100,180,255,0.15) 0%, transparent 70%)"
            }} />
          </button>
        ) : (
          /* ─ 기존 출전 버튼 ─ */
          <>
        {/* 클릭 시 파동 링 (CSS 애니메이션) */}
        {isReady && isSelecting && (
          <div className="absolute inset-0 max-w-[210px] xl:max-w-[260px] mx-auto rounded-[6px] pointer-events-none" style={{ animation: "deploy-pulse 2s ease-in-out infinite" }} />
        )}
        <button
          type="button"
          onClick={onConfirm}
          disabled={!isReady || !isSelecting}
          className={`relative w-[210px] xl:w-[260px] h-[56px] xl:h-[64px] rounded-[6px] transition-all duration-300 group/btn ${
            isReady && isSelecting
              ? "cursor-pointer active:scale-[0.97] active:translate-y-[2px] hover:scale-[1.02]"
              : "cursor-not-allowed opacity-40 grayscale"
          }`}
        >
          {/* 외곽 흑금 프레임 */}
          <div className="absolute inset-0 rounded-[6px] bg-gradient-to-b from-[#4a3d32] to-[#1a1410] border border-[#5a483a]/60 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_4px_10px_rgba(0,0,0,0.6)]" />

          {/* 중앙 패널 (붉은 옻칠 느낌) */}
          <div className="absolute inset-[3px] xl:inset-[4px] rounded-[3px]" style={{
            background: isReady && isSelecting
              ? "linear-gradient(to bottom, #8a1515, #5a0b0b)"
              : "#333",
            boxShadow: "inset 0 2px 6px rgba(0,0,0,0.7), inset 0 -1px 2px rgba(255,100,100,0.15)",
          }} />

          {/* 옻칠 하이라이트 */}
          {isReady && isSelecting && (
            <div className="absolute inset-[3px] xl:inset-[4px] rounded-[3px] opacity-[0.25] pointer-events-none" style={{
              background: "linear-gradient(180deg, rgba(255,255,255,0.2) 0%, transparent 35%)",
            }} />
          )}

          {/* 미세한 텍스처 오버레이 */}
          {isReady && isSelecting && (
             <div className="absolute inset-[3px] xl:inset-[4px] rounded-[3px] opacity-[0.08] mix-blend-overlay pointer-events-none" style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
             }} />
          )}

          {/* 텍스트 및 장식 */}
          <div className="absolute inset-0 flex items-center justify-center gap-4 xl:gap-5 pointer-events-none">
            {/* 양옆 장식 (다이아몬드 - 음각 금박 느낌) */}
            <div style={isReady && isSelecting ? { filter: "drop-shadow(0 -1px 1px rgba(30,5,5,0.9)) drop-shadow(0 1px 1px rgba(255,255,255,0.15))" } : {}}>
              <span className={`block text-[12px] xl:text-[14px] font-serif leading-none ${isReady && isSelecting ? "" : "text-white/20"}`}
                style={isReady && isSelecting ? {
                  background: "linear-gradient(135deg, #a67c00 0%, #bf953f 30%, #fcf6ba 50%, #b38728 70%, #fdffcc 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                } : {}}
              >◆</span>
            </div>

            <div className="flex flex-col items-center justify-center mt-[-1px]">
               <div style={isReady && isSelecting ? { filter: "drop-shadow(0 -3px 2px rgba(20,0,0,0.9)) drop-shadow(0 2px 2px rgba(255,255,200,0.3)) drop-shadow(0 0 12px rgba(212,168,67,0.5))" } : {}}>
                 <span className={`block text-[22px] xl:text-[26px] font-bold tracking-[0.2em] ml-[0.2em] select-none leading-none ${
                  isReady && isSelecting ? "" : "text-white/40"
                }`} style={{
                  fontFamily: "'Noto Serif KR', 'Noto Serif TC', serif",
                  ...(isReady && isSelecting ? {
                    background: "linear-gradient(to bottom, #fcf6ea 0%, #e6c565 35%, #b47a20 50%, #d4a843 70%, #ffe8a1 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  } : {}),
                }}>
                  {text.play.advance}
                </span>
              </div>
              {isReady && isSelecting && (
                <span className="text-[9px] xl:text-[10px] tracking-[0.4em] ml-[0.4em] font-bold text-[#d4a843]/60 leading-tight mt-1" style={{
                  filter: "drop-shadow(0 -1px 1px rgba(0,0,0,0.8)) drop-shadow(0 1px 1px rgba(255,255,255,0.15))"
                }}>
                  {text.play.advance}
                </span>
              )}
            </div>

            <div style={isReady && isSelecting ? { filter: "drop-shadow(0 -1px 1px rgba(30,5,5,0.9)) drop-shadow(0 1px 1px rgba(255,255,255,0.15))" } : {}}>
              <span className={`block text-[12px] xl:text-[14px] font-serif leading-none ${isReady && isSelecting ? "" : "text-white/20"}`}
                style={isReady && isSelecting ? {
                  background: "linear-gradient(135deg, #a67c00 0%, #bf953f 30%, #fcf6ba 50%, #b38728 70%, #fdffcc 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                } : {}}
              >◆</span>
            </div>
          </div>

          {/* Hover 은은한 붉은 광원 */}
          {isReady && isSelecting && (
            <div className="absolute inset-[3px] xl:inset-[4px] rounded-[3px] opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300 pointer-events-none" style={{
              background: "radial-gradient(ellipse at center, rgba(255,100,100,0.2) 0%, transparent 70%)"
            }} />
          )}
        </button>
          </>
        )}
      </div>
    </div>
  );
}
