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

  it('sincroniza, verifica e testa o alias git-main depois da promoção', () => {
    const promote = workflow.indexOf('name: Promote only the candidate that passed smoke');
    const synchronize = workflow.indexOf('name: Synchronize the main branch alias');
    const verify = workflow.indexOf('name: Verify the main branch alias after synchronization');
    const productionSmoke = workflow.indexOf('name: Smoke the public production domain after promotion');
    const branchSmoke = workflow.indexOf('name: Smoke the main branch alias after synchronization');

    expect(workflow).toContain('VERCEL_BRANCH_ALIAS: promo-brindes-v1-git-main-juca1.vercel.app');
    expect(synchronize).toBeGreaterThan(promote);
    expect(verify).toBeGreaterThan(synchronize);
    expect(productionSmoke).toBeGreaterThan(verify);
    expect(branchSmoke).toBeGreaterThan(productionSmoke);
  });

  it('restaura também o alias git-main quando a validação pós-promoção falha', () => {
    const rollbackBlock = workflow.slice(
      workflow.indexOf('name: Roll back when post-promotion validation fails'),
      workflow.indexOf('name: Write release summary'),
    );

    expect(rollbackBlock).toContain('PREVIOUS_BRANCH_ALIAS_DEPLOYMENT_ID');
    expect(rollbackBlock).toContain('vercel alias set "$PREVIOUS_BRANCH_ALIAS_DEPLOYMENT_ID" "$VERCEL_BRANCH_ALIAS"');
    expect(workflow).toContain('previous-branch-alias-deployment.json');
    expect(workflow).toContain('branch-alias-deployment.json');
    expect(workflow).toContain('branch-alias-smoke.log');
  });
});
