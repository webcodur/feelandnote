/*
  MobileCardChips — 모바일 카드 칩 (좌 아군 | 우 적군) + 초상화 + 군령패 + 출전 버튼
  lg:hidden block
*/
import type { BattleCard as BattleCardType, Command, Mandate } from "@/lib/game/types";
import { COMMANDS, MANDATE_BONUS } from "@/lib/game/types";
import { calcAptitude, aptitudeToStars } from "@/lib/game/gameEngine";
import { getBattlePlaqueLabel, getBattleSealLabel } from "../../i18n";
import { CMD_ICON, CMD_STYLE } from "../types";
import type { BattleText } from "../types";

interface Props {
  playerHand: BattleCardType[];
  playerOthers: BattleCardType[];
  playerOthersDiscard: BattleCardType[];
  playerCaptain: BattleCardType | null;
  playerCaptainInDiscard: BattleCardType | null | undefined;
  aiOthers: BattleCardType[];
  aiOthersDiscard: BattleCardType[];
  aiCaptain: BattleCardType | null;
  aiCaptainInDiscard: BattleCardType | null | undefined;
  aiSelectedCardId: string | null;
  selectedCardId: string | null;
  selectedCard: BattleCardType | undefined;
  selectedCommand: Command | null;
  selectedRecoverId: string | null;
  mandate: Mandate | null;
  isSelecting: boolean;
  isClash: boolean;
  isReady: boolean;
  playerExhausted: boolean;
  hardMode: boolean;
  guideText: string;
  locale: string;
  text: BattleText;
  onCardClick: (cardId: string) => void;
  onRecoverSelect: (cardId: string) => void;
  onCommandClick: (cmd: Command) => void;
  onConfirm: () => void;
  onSubmitRest?: () => void;
  onInfoCmd: (cmd: Command) => void;
}

export default function MobileCardChips({
  playerOthers, playerOthersDiscard,
  playerCaptain, playerCaptainInDiscard,
  aiOthers, aiOthersDiscard,
  aiCaptain, aiCaptainInDiscard,
  aiSelectedCardId,
  selectedCardId, selectedCard, selectedCommand, selectedRecoverId,
  mandate, isSelecting, isClash, isReady, playerExhausted, hardMode,
  guideText, locale, text,
  onCardClick, onRecoverSelect, onCommandClick, onConfirm, onSubmitRest, onInfoCmd,
}: Props) {
  return (
    <>
      {/* ── 모바일: 카드 칩 (좌 아군 | 우 적군) — 자연스러운 흐름 배치 (내부 스크롤 제거) ── */}
      <div className={`lg:hidden w-full transition-opacity duration-300 ${isClash ? "opacity-0 pointer-events-none" : ""}`}>
        <div className="flex flex-col justify-start px-4 pt-2">
          <div className="grid grid-cols-2 gap-3 w-full max-w-sm mx-auto">
            {/* ─ 좌측: 아군 ─ */}
            <div className="flex flex-col gap-2 relative">
              {(() => {
                const allPlayer = [
                  ...(playerCaptain ? [{ card: playerCaptain, isDiscard: !!playerCaptainInDiscard, isCaptain: true }] : []),
                  ...playerOthers.map(c => ({ card: c, isDiscard: false, isCaptain: false })),
                  ...playerOthersDiscard.map(c => ({ card: c, isDiscard: true, isCaptain: false })),
                ];
                return (
                  <div className="flex flex-col gap-2">
                    {allPlayer.map(({ card, isDiscard, isCaptain }) => {
                      if (isDiscard) {
                        const isRecoverable = selectedCommand === "govern" && isSelecting;
                        const isRecoverSelected = selectedRecoverId === card.id;
                        return (
                          <button key={card.id} type="button"
                            onClick={isRecoverable ? () => onRecoverSelect(card.id) : undefined}
                            disabled={!isRecoverable}
                            className={`relative flex flex-col items-center justify-center h-[64px] rounded-[3px] transition-all overflow-hidden ${
                              isRecoverable
                                ? isRecoverSelected
                                  ? "shadow-[0_0_12px_rgba(217,169,78,0.2)]"
                                  : "scale-[0.97] shadow-[0_2px_4px_rgba(0,0,0,0.5)]"
                                : "cursor-not-allowed opacity-50 grayscale shadow-[0_1px_3px_rgba(0,0,0,0.5)]"
                            }`}
                          >
                            <div className="absolute inset-0 bg-cover bg-center pointer-events-none transition-all duration-300"
                              style={{
                                backgroundImage: "url('/images/textures/wood-tablet.jpg')",
                                filter: isRecoverSelected ? "brightness(0.2) sepia(0.3) hue-rotate(-10deg)" : "brightness(0.2) sepia(0.2)",
                              }}
                            />
                            <div className="absolute inset-0 opacity-[0.08] mix-blend-overlay pointer-events-none" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")` }} />
                            <div className="absolute inset-0 rounded-[3px] pointer-events-none" style={{
                              boxShadow: isRecoverSelected
                                ? "inset 0 0 0 1px rgba(217,169,78,0.3), inset 2px 2px 4px rgba(0,0,0,0.5), inset -2px -2px 4px rgba(0,0,0,0.4)"
                                : "inset 0 0 0 1px rgba(160,120,80,0.15), inset 2px 2px 4px rgba(0,0,0,0.6)",
                            }} />

                            <div className="flex items-center justify-center gap-1.5 w-full min-w-0 z-10 px-1 mt-0.5">
                              {isCaptain && <span className="text-amber-400 text-[12px] shrink-0 drop-shadow-[0_0_4px_rgba(217,169,78,0.5)]">&#9813;</span>}
                              <span className={`text-[13px] font-serif font-bold truncate ${
                                isRecoverSelected ? "text-[#ffeeb5] drop-shadow-[0_0_6px_rgba(217,169,78,0.5)]" : isRecoverable ? "text-[#a09070]" : "text-[#706050] line-through"
                              }`}>{card.nickname}</span>
                            </div>
                            <span className="text-[10px] font-serif font-bold text-[#d9a94e]/40 mt-0.5 z-10">{isRecoverable ? text.play.recovered : text.play.usedDone}</span>
                          </button>
                        );
                      }
                      const isSelected = isSelecting && selectedCardId === card.id;
                      const stars = COMMANDS.map(cmd => aptitudeToStars(calcAptitude(card, cmd)));
                      return (
                        <button key={card.id} type="button"
                          onClick={isSelecting ? () => onCardClick(card.id) : undefined}
                          disabled={!isSelecting}
                          className={`relative flex flex-col items-center justify-center gap-1 h-[64px] rounded-[3px] transition-all overflow-hidden ${
                            isSelected
                              ? "shadow-[0_4px_16px_rgba(217,169,78,0.4),0_0_8px_rgba(217,169,78,0.2)] scale-[1.02] z-10 cursor-pointer"
                              : isSelecting
                                ? "hover:-translate-y-0.5 active:scale-[0.97] shadow-[0_3px_8px_rgba(0,0,0,0.6)] cursor-pointer"
                                : "opacity-60 saturate-50 cursor-not-allowed shadow-[0_2px_4px_rgba(0,0,0,0.5)]"
                          }`}
                        >
                          {/* 실제 목판 텍스처 배경 */}
                          <div className="absolute inset-0 bg-cover bg-center transition-all duration-300 pointer-events-none"
                            style={{
                              backgroundImage: "url('/images/textures/wood-tablet.jpg')",
                              filter: isSelected ? "brightness(0.3) sepia(0.3) hue-rotate(-10deg) saturate(1.2)" : "brightness(0.25) sepia(0.2) saturate(0.8)",
                            }}
                          />
                          {/* 노이즈 및 스크래치 질감 보강 */}
                          <div className="absolute inset-0 opacity-[0.1] mix-blend-overlay pointer-events-none" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")` }} />

                          {/* 금속 재질의 다이아몬드 커팅 느낌 테두리 */}
                          <div className="absolute inset-0 rounded-[3px] pointer-events-none" style={{
                            boxShadow: isSelected
                              ? "inset 0 0 0 1px rgba(217,169,78,0.4), inset 0 0 8px rgba(217,169,78,0.3), inset 2px 2px 4px rgba(0,0,0,0.4), inset -2px -2px 4px rgba(0,0,0,0.3)"
                              : "inset 0 0 0 1px rgba(160,120,80,0.2), inset 2px 2px 5px rgba(0,0,0,0.6), inset -2px -2px 5px rgba(0,0,0,0.4)",
                          }} />

                          {isSelected && (
                            <div className="absolute inset-0 bg-gradient-to-t from-[#d9a94e]/20 via-transparent to-transparent pointer-events-none" />
                          )}

                          <div className="flex items-center justify-center gap-1.5 w-full min-w-0 z-10 px-1 mt-1">
                            {isCaptain && <span className="text-amber-400 text-[12px] shrink-0 drop-shadow-[0_0_4px_rgba(217,169,78,0.6)]">&#9813;</span>}
                            <span className={`text-[14px] leading-tight truncate font-serif font-bold ${
                              isSelected ? "text-[#ffeeb5] drop-shadow-[0_0_8px_rgba(217,169,78,0.6)]" : isSelecting ? "text-[#e8d4a2] drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]" : "text-[#a09070]"
                            }`}>
                              {card.nickname}
                            </span>
                          </div>

                          <div className="relative w-[80%] h-px bg-gradient-to-r from-transparent via-[#d9a94e]/30 to-transparent mt-0.5 mb-1 z-10" />

                          <div className="flex items-center justify-center gap-2.5 z-10 mb-1">
                            {stars.map((s, i) => (
                              <span key={i} className={`flex items-center gap-[2px] text-[11px] font-serif font-black tabular-nums ${
                                selectedCommand === COMMANDS[i]
                                  ? CMD_STYLE[COMMANDS[i]].text
                                  : s >= 4 ? "text-[#e8c050]" : "text-[#a09070]/70"
                              }`} style={{ textShadow: "0 1px 2px rgba(0,0,0,0.8)" }}>
                                <span className={`[&>svg]:w-[11px] [&>svg]:h-[11px] ${s >= 4 && selectedCommand !== COMMANDS[i] ? "text-red-400/90" : ""}`}>
                                  {CMD_ICON[COMMANDS[i]]}
                                </span>
                                {s}
                              </span>
                            ))}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                );
              })()}
            </div>

          {/* ─ 우측: 적군 ─ */}
          <div className="flex flex-col gap-2 relative">
            {(() => {
              const allAi = [
                ...(aiCaptain ? [{ card: aiCaptain, isDiscard: !!aiCaptainInDiscard, isCaptain: true }] : []),
                ...aiOthers.map(c => ({ card: c, isDiscard: false, isCaptain: false })),
                ...aiOthersDiscard.map(c => ({ card: c, isDiscard: true, isCaptain: false })),
              ];
              return (
                <div className="flex flex-col gap-2">
                  {allAi.map(({ card, isDiscard, isCaptain }) => {
                    if (isDiscard) {
                      return (
                        <div key={card.id}
                          className="relative flex flex-col items-center justify-center h-[64px] rounded-[3px] overflow-hidden opacity-50 grayscale shadow-[0_1px_3px_rgba(0,0,0,0.5)]"
                        >
                          <div className="absolute inset-0 bg-cover bg-center pointer-events-none"
                            style={{
                              backgroundImage: "url('/images/textures/wood-tablet.jpg')",
                              filter: "brightness(0.2) sepia(0.4) hue-rotate(320deg)",
                            }}
                          />
                          <div className="absolute inset-0 opacity-[0.08] mix-blend-overlay pointer-events-none" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")` }} />
                          <div className="absolute inset-0 rounded-[3px] pointer-events-none" style={{
                            boxShadow: "inset 0 0 0 1px rgba(120,40,40,0.2), inset 2px 2px 4px rgba(0,0,0,0.6)",
                          }} />

                          <div className="flex items-center justify-center gap-1.5 w-full min-w-0 z-10 px-1 mt-0.5">
                            {isCaptain && <span className="text-amber-400/40 text-[12px] shrink-0">&#9813;</span>}
                            <span className="text-[13px] font-serif font-bold truncate text-[#806060] line-through">{card.nickname}</span>
                          </div>
                          <span className="text-[10px] font-serif font-bold text-[#806060]/50 mt-0.5 z-10">{text.play.usedDone}</span>
                        </div>
                      );
                    }
                    const isAiSelected = aiSelectedCardId === card.id;
                    const showFace = isClash && isAiSelected;
                    const stars = COMMANDS.map(cmd => aptitudeToStars(calcAptitude(card, cmd)));
                    return (
                      <div key={card.id}
                        className={`relative flex flex-col items-center justify-center gap-1 h-[64px] rounded-[3px] transition-all overflow-hidden ${
                          showFace
                            ? "shadow-[0_4px_16px_rgba(248,113,113,0.3),0_0_8px_rgba(248,113,113,0.2)] scale-[1.02] z-10"
                            : "shadow-[0_3px_8px_rgba(0,0,0,0.6)]"
                        }`}
                      >
                        {/* 적군 흑철/적목재 명패 베이스 */}
                        <div className="absolute inset-0 bg-cover bg-center transition-all duration-300 pointer-events-none"
                          style={{
                            backgroundImage: "url('/images/textures/wood-tablet.jpg')",
                            filter: showFace ? "brightness(0.2) sepia(0.6) hue-rotate(320deg) saturate(1.5)" : "brightness(0.18) sepia(0.4) hue-rotate(320deg) saturate(0.8)",
                          }}
                        />
                        <div className="absolute inset-0 opacity-[0.1] mix-blend-overlay pointer-events-none" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")` }} />

                        {/* 적군 특유 붉은 금속성 테두리 */}
                        <div className="absolute inset-0 rounded-[3px] pointer-events-none" style={{
                          boxShadow: showFace
                            ? "inset 0 0 0 1px rgba(248,113,113,0.3), inset 0 0 8px rgba(248,113,113,0.2), inset 2px 2px 4px rgba(0,0,0,0.5), inset -2px -2px 4px rgba(0,0,0,0.4)"
                            : "inset 0 0 0 1px rgba(120,40,40,0.3), inset 2px 2px 5px rgba(0,0,0,0.7), inset -2px -2px 5px rgba(0,0,0,0.5)",
                        }} />

                        {showFace && (
                          <div className="absolute inset-0 bg-gradient-to-t from-red-500/20 via-transparent to-transparent pointer-events-none animate-fade-in" />
                        )}

                        <div className="flex items-center justify-center gap-1.5 w-full min-w-0 z-10 px-1 mt-1">
                          {isCaptain && <span className="text-amber-400 text-[12px] shrink-0 drop-shadow-[0_0_4px_rgba(217,169,78,0.5)]">&#9813;</span>}
                          <span className={`text-[14px] leading-tight truncate font-serif font-bold ${
                            showFace ? "text-[#ffcccc] drop-shadow-[0_0_8px_rgba(248,113,113,0.6)]" : "text-[#b08080] drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]"
                          }`}>
                            {hardMode && !isCaptain ? "???" : card.nickname}
                          </span>
                        </div>

                        <div className="relative w-[80%] h-px bg-gradient-to-r from-transparent via-red-500/30 to-transparent mt-0.5 mb-1 z-10" />

                        {!hardMode || isCaptain ? (
                          <div className="flex items-center justify-center gap-2.5 z-10 mb-1">
                            {stars.map((s, i) => (
                              <span key={i} className={`flex items-center gap-[2px] text-[11px] font-serif font-black tabular-nums ${
                                selectedCommand === COMMANDS[i]
                                  ? CMD_STYLE[COMMANDS[i]].text
                                  : s >= 4 ? "text-[#e8c050]" : "text-[#b08080]/70"
                              }`} style={{ textShadow: "0 1px 2px rgba(0,0,0,0.8)" }}>
                                <span className={`[&>svg]:w-[11px] [&>svg]:h-[11px] ${s >= 4 && selectedCommand !== COMMANDS[i] ? "text-red-500/90" : ""}`}>
                                  {CMD_ICON[COMMANDS[i]]}
                                </span>
                                {s}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-2.5 z-10 mb-1 text-[11px] font-serif font-bold text-[#b08080]/50" style={{ textShadow: "0 1px 2px rgba(0,0,0,0.8)" }}>
                            {COMMANDS.map((cmd, i) => (
                              <span key={i} className="flex items-center gap-[2px]">
                                <span className="[&>svg]:w-[11px] [&>svg]:h-[11px]">{CMD_ICON[cmd]}</span>?
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        </div>
      </div>
    </div>

        {/* 모바일: 초상화 + 군령패 + 출전 */}
        <div className={`lg:hidden shrink-0 transition-opacity duration-300 w-full px-4 mt-2 ${
          isClash ? "opacity-0 hidden" : ""
        }`}>
          <div className="pointer-events-auto flex items-center justify-center gap-4 w-full max-w-md mx-auto">

            {/* 좌측: 선택된 카드 초상화 */}
            <div className="flex-1 w-0 flex items-center justify-center">
              <div className="w-full aspect-[3/4] max-w-[150px] rounded-md relative overflow-hidden bg-[#1a1410] flex items-center justify-center border border-[#5a483a]/60 shadow-[0_4px_16px_rgba(0,0,0,0.9)]"
                   style={{
                   boxShadow: selectedCard ? "0 0 15px rgba(217,169,78,0.2), inset 0 0 0 1px rgba(217,169,78,0.4)" : "inset 0 0 0 1px rgba(100,70,45,0.3)"
                 }}>
              {/* 텍스처 배경 */}
              <div className="absolute inset-0 opacity-[0.4] bg-cover bg-center" style={{ backgroundImage: "url('/images/textures/wood-tablet.jpg')" }} />

              {selectedCard ? (
                <div className="absolute inset-1 rounded-[1px] overflow-hidden bg-black">
                  <img
                    src={selectedCard.avatarUrl || `/images/cards/${selectedCard.id}.png`}
                    alt={selectedCard.nickname}
                    className="w-full h-full object-cover object-top opacity-90 transition-opacity duration-300"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.onerror = null;
                      target.style.display = 'none';
                    }}
                  />
                  {/* 초상화 내부 그라데이션 및 이름 표기 */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
                  <div className="absolute bottom-1 left-0 right-0 text-center">
                    <span className="text-[11px] font-bold text-[#e8d4a2] drop-shadow-[0_1px_3px_rgba(0,0,0,1)] font-serif tracking-wider truncate px-1 block">
                      {selectedCard.nickname}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center gap-1 opacity-40">
                  <span className="text-[24px] text-[#a07850] opacity-50 font-serif">?</span>
                  <span className="text-[8px] font-bold text-[#a07850] tracking-widest">{text.play.waiting}</span>
                </div>
              )}

                <div className="absolute inset-0 opacity-[0.1] mix-blend-overlay pointer-events-none" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")` }} />
              </div>
            </div>

            {/* 우측 2열: 가이드 텍스트 + 군령패 + 출전 버튼 (수직/수평 중앙 정렬) */}
            <div className="flex-1 flex flex-col items-center justify-center min-w-0">

              {/* 가이드 텍스트 */}
              <p className="w-full text-[12px] font-bold text-accent/80 tracking-[0.2em] text-center mb-3 drop-shadow-[0_2px_4px_rgba(0,0,0,1)] truncate"
                 style={{ fontFamily: "'Noto Serif KR', serif" }}
              >
                {guideText}
              </p>

              {/* 군령 3목패 수평 배치 */}
              <div className="flex items-center justify-center gap-1.5 mb-4">
                {COMMANDS.map((cmd) => {
                  const isSelected = selectedCommand === cmd;
                  const rawApt = selectedCard ? calcAptitude(selectedCard, cmd) : 0;
                  const isMandateCmd = mandate?.command === cmd;
                  const apt = isMandateCmd ? rawApt * MANDATE_BONUS : rawApt;
                  const stars = selectedCard ? aptitudeToStars(apt) : 0;
                  const isDisabled = !isSelecting;
                  const label = getBattlePlaqueLabel(cmd, locale);

                  return (
                    <div key={cmd} className={`relative transition-all duration-300 ease-out ${
                      isSelected ? "-translate-y-1.5" : ""
                    }`}>
                      {isSelected && !isDisabled && (
                        <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-[70%] h-2 rounded-full pointer-events-none" style={{
                          background: "radial-gradient(ellipse, rgba(248,113,113,0.5) 0%, transparent 70%)",
                          filter: "blur(2px)",
                        }} />
                      )}
                      <button type="button"
                        onClick={() => !isDisabled && onCommandClick(cmd)}
                        disabled={isDisabled}
                        className={`relative flex flex-col items-center w-[52px] h-[86px] rounded-[3px] overflow-hidden transition-all duration-300 ${
                          isDisabled
                            ? "opacity-30 cursor-not-allowed saturate-0 shadow-[1px_2px_4px_rgba(0,0,0,0.3)]"
                            : isSelected
                              ? "cursor-pointer shadow-[0_3px_12px_rgba(0,0,0,0.6),0_0_10px_rgba(248,113,113,0.15)]"
                              : "cursor-pointer active:scale-95 shadow-[2px_3px_6px_rgba(0,0,0,0.5)] brightness-[0.85]"
                        }`}
                      >
                        {/* 목재 텍스처 */}
                        <div className="absolute inset-0 bg-cover bg-center"
                          style={{
                            backgroundImage: "url('/images/textures/wood-tablet.jpg')",
                            filter: isSelected ? "brightness(0.4) saturate(1.1)" : "brightness(0.25) saturate(0.8)",
                          }}
                        />
                        <div className="absolute inset-0 opacity-[0.08] mix-blend-overlay" style={{
                          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='5' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
                        }} />
                        <div className="absolute inset-0 rounded-[3px]" style={{
                          boxShadow: "inset 1px 1px 3px rgba(0,0,0,0.3), inset -1px -1px 3px rgba(0,0,0,0.2), inset 0 0 6px rgba(0,0,0,0.2)",
                        }} />
                        <div className="absolute inset-0 rounded-[3px]" style={{
                          boxShadow: isSelected
                            ? "inset 0 0 0 1px rgba(180,80,50,0.5), 0 0 0 1px rgba(0,0,0,0.5)"
                            : "inset 0 0 0 1px rgba(100,70,45,0.3), 0 0 0 1px rgba(0,0,0,0.3)",
                        }} />

                        {/* 봉인 인장 (크기 축소) */}
                        <div className="relative w-full flex justify-center pt-2 pb-0.5"
                          onClick={(e) => { e.stopPropagation(); onInfoCmd(cmd); }}
                        >
                          <div className="relative w-3.5 h-3.5 flex items-center justify-center cursor-help">
                            <div className="absolute inset-0 rounded-full" style={{
                              background: "radial-gradient(circle at 40% 35%, #6a4830 0%, #3a2818 60%, #2a1a10 100%)",
                              boxShadow: "inset 0 1px 1px rgba(140,100,60,0.3), inset 0 -1px 1px rgba(0,0,0,0.5)",
                            }} />
                            <span className="relative text-[7px] font-bold select-none text-[#c8a064]/60 font-serif">
                              {getBattleSealLabel(cmd, locale)}
                            </span>
                          </div>
                        </div>
                        <div className="relative w-4 h-px bg-gradient-to-r from-transparent via-[#a07850]/40 to-transparent mb-0.5" />

                        {/* 글자 세로 */}
                        <div className="relative flex-1 flex flex-col items-center justify-center -mt-0.5">
                          {label.split("").map((char, i) => (
                            <span key={i}
                              className="text-[13px] font-bold leading-none"
                              style={{
                                fontFamily: "'Noto Serif KR', serif",
                                ...(isMandateCmd ? {
                                  color: "#f0c850",
                                  textShadow: "0 1px 2px rgba(0,0,0,0.8), 0 0 4px rgba(212,168,67,0.6)",
                                } : isSelected ? {
                                  color: "#ff7070",
                                  textShadow: "0 1px 2px rgba(0,0,0,0.8), 0 0 4px rgba(255,112,112,0.4)",
                                } : {
                                  color: "#9a2a2a",
                                  textShadow: "0 1px 2px rgba(0,0,0,0.6)",
                                }),
                              }}
                            >{char}</span>
                          ))}
                        </div>

                        {/* 적성 숫자 */}
                        <div className="relative w-4 h-[1.5px] bg-gradient-to-r from-transparent via-[#8b6040]/30 to-transparent mb-1" />
                        <div className="relative flex items-center justify-center pb-2">
                          <span className="text-[12px] font-cinzel font-bold tabular-nums leading-none"
                            style={selectedCard && stars > 0 ? (
                              stars >= 4 ? { color: "#e8c050", textShadow: "0 0 4px rgba(217,169,78,0.7)" } :
                              stars >= 2 ? { color: "rgba(232,192,80,0.6)" } :
                              { color: "rgba(60,40,20,0.5)" }
                            ) : { color: "rgba(40,25,10,0.4)" }}
                          >{selectedCard ? stars : "-"}</span>
                        </div>
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* 가로형 출전 / 한 턴 쉬기 버튼 */}
              <div className="relative w-full max-w-[170px] mx-auto">
                {playerExhausted ? (
                  <button
                    type="button"
                    onClick={onSubmitRest}
                    className="relative w-full h-[42px] rounded-[3px] cursor-pointer active:scale-[0.98] active:translate-y-[1px] transition-all duration-300 group/btn"
                    style={{ filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.6))" }}
                  >
                    <div className="absolute inset-0 rounded-[3px] bg-gradient-to-b from-[#3a3d42] to-[#1a1c20] border border-[#4a5060]/60 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]" />
                    <div className="absolute inset-[2px] rounded-[1px]" style={{
                      background: "linear-gradient(to bottom, #2a4a6a, #1a2a3a)",
                      boxShadow: "inset 0 1px 3px rgba(0,0,0,0.7), inset 0 -1px 2px rgba(100,180,255,0.1)",
                    }} />
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <span className="text-[14px] font-bold tracking-[0.1em] ml-[0.1em] select-none text-blue-200/90 font-serif" style={{
                        textShadow: "0 1px 3px rgba(0,0,0,0.9), 0 0 6px rgba(100,180,255,0.3)",
                      }}>
                        {text.play.restButton}
                      </span>
                    </div>
                  </button>
                ) : (
                  <>
                {/* 외곽 펄스 (오퍼시티로 제어) */}
                <div className={`absolute inset-0 rounded-[3px] pointer-events-none transition-opacity duration-300 ${isReady && isSelecting ? 'opacity-100' : 'opacity-0'}`} style={{ animation: "deploy-pulse 2s ease-in-out infinite" }} />

                <button
                  type="button"
                  onClick={onConfirm}
                  disabled={!isReady || !isSelecting}
                  className={`relative w-full h-[42px] rounded-[3px] transition-all duration-300 group/btn ${
                    isReady && isSelecting
                      ? "cursor-pointer active:scale-[0.98] active:translate-y-[1px]"
                      : "cursor-not-allowed opacity-[0.45] grayscale"
                  }`}
                  style={isReady && isSelecting ? { filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.6))" } : { filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.3))" }}
                >
                  <div className="absolute inset-0 rounded-[3px] bg-gradient-to-b from-[#4a3d32] to-[#1a1410] border border-[#5a483a]/60 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)]" />

                  {/* 활성화 상태 배경 (오퍼시티 트랜지션) */}
                  <div className={`absolute inset-[2px] rounded-[1px] transition-opacity duration-300 ${isReady && isSelecting ? 'opacity-100' : 'opacity-0'}`} style={{
                    background: "linear-gradient(to bottom, #8a1515, #5a0b0b)",
                    boxShadow: "inset 0 1px 3px rgba(0,0,0,0.7), inset 0 -1px 2px rgba(255,100,100,0.15)",
                  }} />

                  {/* 비활성화 상태 배경 (오퍼시티 트랜지션) */}
                  <div className={`absolute inset-[2px] rounded-[1px] bg-[#333] transition-opacity duration-300 ${isReady && isSelecting ? 'opacity-0' : 'opacity-100'}`} style={{
                    boxShadow: "inset 0 1px 2px rgba(0,0,0,0.5)",
                  }} />

                  {/* 투명 그라데이션 광택 (오퍼시티 트랜지션) */}
                  <div className={`absolute inset-[2px] rounded-[1px] transition-opacity duration-300 ${isReady && isSelecting ? 'opacity-[0.2]' : 'opacity-0'}`} style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.2) 0%, transparent 40%)" }} />

                  {/* 텍스처 오버레이 (오퍼시티 트랜지션) */}
                  <div className={`absolute inset-[2px] mix-blend-overlay pointer-events-none transition-opacity duration-300 ${isReady && isSelecting ? 'opacity-[0.08]' : 'opacity-0'}`} style={{
                     backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
                  }} />

                  {/* 텍스트 영역 */}
                  <div className="absolute inset-0 flex items-center justify-center gap-2 pointer-events-none">
                    <span className={`text-[10px] font-serif transition-colors duration-300 ${isReady && isSelecting ? "text-[#e8d4a2]" : "text-white/20"}`}
                      style={isReady && isSelecting ? {
                        textShadow: "0 1px 2px rgba(0,0,0,0.8)",
                      } : {}}
                    >◆</span>

                    <div className="flex flex-col items-center justify-center">
                       <span className={`text-[18px] font-bold tracking-[0.2em] ml-[0.2em] leading-none select-none font-serif transition-colors duration-300 ${
                        isReady && isSelecting ? "text-[#fcf6ea]" : "text-white/40"
                      }`} style={isReady && isSelecting ? {
                        textShadow: "0 1px 3px rgba(0,0,0,0.9), 0 0 8px rgba(212,168,67,0.5)",
                      } : {}}>
                        {text.play.advance}
                      </span>
                    </div>

                    <span className={`text-[10px] font-serif transition-colors duration-300 ${isReady && isSelecting ? "text-[#e8d4a2]" : "text-white/20"}`}
                      style={isReady && isSelecting ? {
                        textShadow: "0 1px 2px rgba(0,0,0,0.8)",
                      } : {}}
                    >◆</span>
                  </div>
                </button>
                  </>
                )}
              </div>

            </div>
          </div>
        </div>
    </>
  );
}
