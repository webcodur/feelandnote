import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export const baseConfig = [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
  },
];
