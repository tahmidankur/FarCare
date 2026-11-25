import js from '@eslint/js';
import globals from 'globals';

export default [
  { ignores: ['node_modules/', 'test-results/', 'playwright-report/', '.lighthouseci/'] },
  js.configs.recommended,
  {
    files: ['core.js', 'storage.js', 'sw.js'],
    languageOptions: {
      sourceType: 'script',
      globals: { ...globals.browser, ...globals.serviceworker, FarCore: 'readonly', module: 'readonly' },
    },
    rules: {
      // storage.js defines globals the pages use
      'no-unused-vars': ['error', { vars: 'local', args: 'none', caughtErrors: 'none' }],
      'no-redeclare': 'off',
    },
  },
  {
    files: ['**/*.mjs'],
    languageOptions: { sourceType: 'module', globals: { ...globals.node } },
  },
  {
    // Playwright runs some of this code inside the page
    files: ['tests/e2e/**'],
    languageOptions: { globals: { ...globals.browser } },
  },
];
