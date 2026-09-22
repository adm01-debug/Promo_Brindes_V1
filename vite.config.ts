import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
  plugins: [
    react(),
    // Etapa 1 do plano de 20260917: só gera o relatório quando pedido
    // explicitamente (ANALYZE=1), para não pagar o custo em todo build de CI.
    process.env.ANALYZE === '1' &&
      visualizer({
        filename: 'dist/stats.html',
        gzipSize: true,
        brotliSize: true,
        template: 'treemap',
      }),
  ],
  server: { host: true, port: 4174 },
  preview: { host: true, port: 4175 },
  build: {
    target: 'es2022',
    sourcemap: process.env.VITE_BUILD_SOURCEMAP === 'true',
    cssCodeSplit: true,
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    globals: true,
    exclude: ['e2e/**', 'node_modules/**', 'dist/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/**/*.{ts,tsx}', 'api/**/*.ts'],
      exclude: [
        'src/test/**', 'src/**/*.d.ts', 'src/**/*.test.{ts,tsx}',
        // Hook de orquestração da página: seus contratos são exercitados pelos
        // cenários E2E de desktop e mobile, assim como src/pages/**. Mantê-lo
        // no agregado de lógica pura de src/lib/** distorceria o limiar.
        'src/lib/useCatalogPageState.ts',
      ],
      // Limiares medidos em 14/09/2026 (docs/PLANO_CORRECOES_50_ETAPAS_20260913.md,
      // Etapa 8), fixados alguns pontos abaixo do valor real para dar folga sem
      // permitir regressão. api/** e src/lib/** são lógica pura, cobertas pelo
      // Vitest. src/pages/** e a maior parte de src/components/** são cobertas
      // pelos 72 testes E2E do Playwright (npm run test:e2e), não pelo Vitest —
      // um limiar alto aqui puniria uma divisão de responsabilidade real entre
      // as duas suítes, não uma lacuna de teste.
      thresholds: {
        'api/**': { statements: 70, branches: 60, functions: 75, lines: 80 },
        'src/lib/**': { statements: 70, branches: 60, functions: 70, lines: 75 },
      },
    },
  },
});
