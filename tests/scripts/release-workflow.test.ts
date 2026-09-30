// @vitest-environment node

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const workflow = readFileSync('.github/workflows/release.yml', 'utf8');

describe('workflow de release Vercel', () => {
  it('valida Web Analytics no candidato sem chamar endpoint privado de configuração', () => {
    expect(workflow).not.toContain('/projects/${VERCEL_PROJECT_ID}/analytics');
    expect(workflow).not.toContain('Enable Vercel Web Analytics for this project');
    expect(workflow).toContain('npm run smoke:deployment');
  });

  it('faz smoke do candidato antes de promover e mantém rollback pós-promoção', () => {
    const smoke = workflow.indexOf('name: Smoke the unpromoted production candidate');
    const promote = workflow.indexOf('name: Promote only the candidate that passed smoke');
    const rollback = workflow.indexOf('name: Roll back when post-promotion validation fails');

    expect(smoke).toBeGreaterThan(-1);
    expect(promote).toBeGreaterThan(smoke);
    expect(rollback).toBeGreaterThan(promote);
  });
});
