import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
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
  },
});
