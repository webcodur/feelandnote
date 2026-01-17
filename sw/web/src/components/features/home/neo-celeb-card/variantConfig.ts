import styles from "./styles.module.css";
import { CardVariant } from "./types";

export const getVariantStyles = (variant: CardVariant) => {
  switch (variant) {
    case "black-gold":
      return {
        surface: styles.blackGoldSurface,
        borderVariant: styles.blackGold,
        shadow: styles.shadowBlackGold,
        btn: styles.btnBlackGold,
        text: styles.textBlackGold,
        subText: styles.subTextBlackGold,
        dot: styles.dotBlackGold,
        label: styles.labelBlackGold,
        lpClass: styles.lpBlackGold,
        imageFrame: styles.imageFrameBlackGold,
      };
    case "rose-gold":
      return {
        surface: styles.roseGoldSurface,
        borderVariant: styles.roseGold,
        shadow: styles.shadowRoseGold,
        btn: styles.btnRoseGold,
        text: styles.textRoseGold,
        subText: styles.subTextRoseGold,
        dot: styles.dotRoseGold,
        label: styles.labelRoseGold,
        lpClass: styles.lpRoseGold,
        imageFrame: styles.imageFrameRoseGold,
      };
    case "crimson":
      return {
        surface: styles.crimsonSurface,
        borderVariant: styles.crimson,
        shadow: styles.shadowCrimson,
        btn: styles.btnCrimson,
        text: styles.textCrimson,
        subText: styles.subTextCrimson,
        dot: styles.dotCrimson,
        label: styles.labelCrimson,
        lpClass: styles.lpCrimson,
        imageFrame: styles.imageFrameCrimson,
      };
    case "amethyst":
      return {
        surface: styles.amethystSurface,
        borderVariant: styles.amethyst,
        shadow: styles.shadowAmethyst,
        btn: styles.btnAmethyst,
        text: styles.textAmethyst,
        subText: styles.subTextAmethyst,
        dot: styles.dotAmethyst,
        label: styles.labelAmethyst,
        lpClass: styles.lpAmethyst,
        imageFrame: styles.imageFrameAmethyst,
      };
    case "holographic":
      return {
        surface: styles.holographicSurface,
        borderVariant: styles.holographic,
        shadow: styles.shadowHolographic,
        btn: styles.btnHolographic,
        text: styles.textHolographic,
        subText: styles.subTextHolographic,
        dot: styles.dotHolographic,
        label: styles.labelHolographic,
        imageFrame: styles.imageFrameHolographic,
      };
    case "diamond":
      return {
        surface: styles.diamondSurface,
        borderVariant: styles.diamond,
        shadow: styles.shadowDiamond,
        btn: styles.btnDiamond,
        text: styles.textDiamond,
        subText: styles.subTextDiamond,
        dot: styles.dotDiamond,
        label: styles.labelDiamond,
        lpClass: styles.lpDiamond,
        imageFrame: styles.imageFrameDiamond,
      };
    case "gold":
      return {
        surface: styles.goldSurface,
        borderVariant: styles.frameGold + " " + styles.gold,
        shadow: styles.shadowGold,
        btn: styles.btnGold,
        text: styles.textGold,
        subText: styles.subTextGold,
        dot: styles.dotGold,
        label: styles.labelGold,
        lpClass: styles.lpGold,
        imageFrame: styles.imageFrameGold,
      };
    case "silver":
      return {
        surface: styles.silverSurface,
        borderVariant: styles.frameSilver + " " + styles.silver,
        shadow: styles.shadowSilver,
        btn: styles.btnSilver,
        text: styles.textSilver,
        subText: styles.subTextSilver,
        dot: styles.dotSilver,
        label: styles.labelSilver,
        lpClass: styles.lpSilver,
        imageFrame: styles.imageFrameSilver,
      };
    case "bronze":
      return {
        surface: styles.bronzeSurface,
        borderVariant: styles.bronze,
        shadowHover: styles.shadowBronze,
        btn: styles.btnBronze,
        textColor: styles.textBronze,
        subTextColor: styles.subTextBronze,
        dotColor: styles.dotBronze,
        labelColor: styles.labelBronze,
        engravedEffect: styles.textEngravedBronze,
        frameColor: styles.frameBronze,
        lpClass: styles.lpBronze,
        imageFrame: styles.imageFrameBronze,
      };

    case "iron":
      return {
        surface: styles.ironSurface,
        borderVariant: styles.iron,
        shadowHover: styles.shadowIron,
        btn: styles.btnIron,
        textColor: styles.textIron,
        subTextColor: styles.subTextIron,
        dotColor: styles.dotIron,
        labelColor: styles.labelIron,
        engravedEffect: styles.textEngraved,
        frameColor: styles.frameIron,
        lpClass: styles.lpIron,
        imageFrame: styles.imageFrameIron,
      };
    default:
       return {
          surface: styles.goldSurface,
          borderVariant: styles.gold,
          shadow: styles.shadowGold,
          btn: styles.btnGold,
          text: styles.textGold,
          subText: styles.subTextGold,
          dot: styles.dotGold,
          label: styles.labelGold,
          lpClass: styles.lpGold,
          imageFrame: styles.imageFrameGold,
        };
  }
};
