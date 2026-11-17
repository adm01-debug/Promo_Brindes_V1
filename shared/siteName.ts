/**
 * Nome da marca usado no sufixo de todo `<title>`.
 *
 * Vive aqui porque o shell pré-renderizado (`api/site-page.ts`) e a página
 * React (`src/components/Seo.tsx`) precisam compor o mesmo título para a mesma
 * URL. Com o literal duplicado nos dois lados, uma mudança de assinatura da
 * marca passava em um e não no outro sem nenhum teste conseguir notar.
 */
export const SITE_NAME = 'Promo Brindes';
