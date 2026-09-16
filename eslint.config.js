// @ts-check
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import globals from 'globals';

export default tseslint.config(
  {
    // Artefatos gerados e diretórios fora do escopo de lint.
    ignores: [
      'dist/**',
      'coverage/**',
      'playwright-report/**',
      'test-results/**',
      'graphify-out/**',
      '.graphify-work/**',
      '.vercel/**',
      'node_modules/**',
      '**/*.tsbuildinfo',
      'site-supabase/supabase/.branches/**',
      'site-supabase/supabase/.temp/**',
      'supabase/.temp/**',
      // Script minimalista injetado por tag <script> antes do bundle; sem tipos, sem módulo.
      'public/hero-preload.js',
    ],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  // TypeScript já é a autoridade sobre identificadores não definidos (inclui
  // ambient types de vite/client, vitest/globals etc. que o ESLint não vê).
  // Manter no-undef ligado aqui produziria falsos positivos.
  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      'no-undef': 'off',
      // O código já usa o prefixo _ para descarte intencional (parâmetros e
      // desestruturação); a regra padrão não reconhece essa convenção.
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        destructuredArrayIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      }],
      // O código usa deliberadamente o ternário-como-instrução para despachar
      // uma de duas chamadas com efeito colateral (`cond ? a() : b();`), em vez
      // de if/else — padrão repetido, não descuido. Ambos os ramos são chamadas
      // reais; allowTernary reconhece exatamente esse caso.
      '@typescript-eslint/no-unused-expressions': ['error', { allowTernary: true, allowShortCircuit: true }],
    },
  },

  // --- Frontend: src/** (browser, React, JSX) ---
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
      globals: globals.browser,
    },
    plugins: { 'react-hooks': reactHooks, 'react-refresh': reactRefresh, 'jsx-a11y': jsxA11y },
    rules: {
      // Somente as duas regras de correção de hooks. A v7 do plugin também empacota
      // o conjunto do React Compiler (immutability, purity, set-state-in-effect,
      // error-boundaries...); o projeto não adota o compiler, então esse bloco
      // inteiro fica de fora deliberadamente — não é omissão.
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'error',
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      ...jsxA11y.configs.recommended.rules,
      // Padrão documentado nas WAI-ARIA Authoring Practices para região com
      // rolagem horizontal (SCR29): tabIndex + role="region" tornam a área
      // navegável por teclado sem fingir que é um widget interativo.
      'jsx-a11y/no-noninteractive-tabindex': ['error', { roles: ['region'] }],
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/await-thenable': 'error',
    },
  },

  // --- Backend serverless e ferramentas Node com checagem de tipos ---
  {
    files: ['api/**/*.ts', 'tests/api/**/*.ts', 'e2e/**/*.ts', 'vite.config.ts', 'playwright.config.ts'],
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
      globals: globals.node,
    },
    rules: {
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/await-thenable': 'error',
    },
  },

  // --- Scripts Node soltos (.mjs) fora dos dois tsconfig do projeto ---
  {
    files: ['scripts/**/*.mjs', 'tests/*.node.mjs'],
    languageOptions: { globals: globals.node, ecmaVersion: 2023, sourceType: 'module' },
  },

  // --- Diagnósticos de auditoria (.mjs): processo Node que pilota o Playwright,
  // mas com callbacks de page.evaluate() cujo corpo roda no navegador. O arquivo
  // mistura os dois escopos de identificadores por natureza do padrão evaluate(). ---
  {
    files: ['docs/audits/**/*.mjs'],
    languageOptions: { globals: { ...globals.node, ...globals.browser }, ecmaVersion: 2023, sourceType: 'module' },
  },

  // --- Configs Node na raiz (este arquivo incluso) ---
  {
    files: ['eslint.config.js'],
    languageOptions: { globals: globals.node },
  },
);
