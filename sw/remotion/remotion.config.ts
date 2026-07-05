import { Config } from '@remotion/cli/config';

/**
 * 렌더 번들 메모리 완화.
 *
 * `remotion render`는 프로덕션 webpack 번들을 만든다. 에피소드·데이터가 늘면서
 * 프로덕션 소스맵 생성과 terser 압축이 V8 문자열/테이블 한계를 넘겨
 * 번들링 단계에서 "invalid table size / heap out of memory"로 죽었다.
 * (Studio(dev) 미리보기는 번들 방식이 달라 영향 없었다.)
 *
 * 렌더 결과물은 런타임 코드가 동일하므로 소스맵·압축을 꺼도 영상 품질에 영향이 없다.
 * dev(Studio) 설정은 건드리지 않는다.
 */
Config.overrideWebpackConfig((config) => ({
  ...config,
  devtool: config.mode === 'production' ? false : config.devtool,
  optimization: {
    ...config.optimization,
    minimize: false,
  },
}));
