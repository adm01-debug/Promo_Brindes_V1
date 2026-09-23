import { mergeConfig } from 'vitest/config';
import base from '../../../vite.config.ts';

export default mergeConfig(base, {
  test: { include: ['docs/audits/plan-review-20260923/*.probe.tsx'] },
});
