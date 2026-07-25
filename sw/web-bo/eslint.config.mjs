import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    /**
     * 세력도 편집 화면 — 영상 관리 대시보드(remotion-bo)에서 **그대로 옮겨온 코드**다(26.07.25).
     *
     * 그 앱의 검사 규칙이 더 느슨해서, 옮겨오자마자 아래 세 갈래가 한꺼번에 걸린다.
     * 전부 이번 이관이 만든 문제가 아니고, 규칙에 맞추려면 효과(effect) 구조와 타입을 다시 짜야 한다.
     * 편집 감각이 달라지는 것이 이관에서 가장 큰 위험이라, 지금은 **동작을 그대로 두고** 예외를 둔다.
     *
     * 이 예외는 임시다. 이 코드를 다음에 손볼 때 갈래별로 걷어내라.
     *   · no-explicit-any        — 카드뉴스 패널이 대본 조각을 느슨하게 받는다. 타입을 좁히면 사라진다.
     *   · set-state-in-effect    — 조회 시작 시 상태를 곧바로 되돌리는 관용구. 효과 재구성이 필요하다.
     *   · refs / purity / immutability — 렌더 중 참조 대입·난수 id·배열 제자리 수정.
     *
     * 새로 짜는 코드에는 적용하지 마라 — 아래 경로만 대상이다.
     */
    files: [
      "src/components/factions/**",
      "src/components/scenario-voice/**",
      "src/components/VoiceTimingEditor/**",
      "src/components/scenario/**",
      "src/components/TaskPanel.tsx",
      "src/lib/useCelebExists.ts",
      "src/lib/useImagePoolToggle.ts",
      "src/lib/faction-voice-casting-history.ts",
    ],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/refs": "off",
      "react-hooks/purity": "off",
      "react-hooks/immutability": "off",
    },
  },
]);

export default eslintConfig;
