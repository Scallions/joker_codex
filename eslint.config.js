import eslint from '@eslint/js';
import importX, { createNodeResolver } from 'eslint-plugin-import-x';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      'dist',
      'coverage',
      'playwright-report',
      'test-results',
      '.trellis',
      '.agents',
      '.claude',
      '.cursor',
      '.opencode',
      'eslint.config.js',
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2023,
      globals: { ...globals.browser, ...globals.node },
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      'import-x': importX,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    settings: {
      'import-x/resolver-next': [
        createNodeResolver({
          extensions: ['.ts', '.tsx', '.mjs', '.cjs', '.js', '.jsx', '.json'],
        }),
      ],
    },
    rules: {
      ...reactHooks.configs.flat.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-import-type-side-effects': 'error',
      'import-x/no-cycle': 'error',
    },
  },
  {
    files: ['src/game-core/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            'react',
            'react/**',
            'react-dom',
            'react-dom/**',
            'react-redux',
            '@reduxjs/toolkit',
            'idb',
            'motion',
            'motion/**',
            '../app/**',
            '../persistence/**',
            '../presentation/**',
          ],
        },
      ],
    },
  },
  {
    files: ['tests/**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/require-await': 'off',
    },
  },
);
