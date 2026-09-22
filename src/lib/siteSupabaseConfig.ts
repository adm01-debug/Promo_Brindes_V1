const SITE_PROJECT_ID = 'xlzmclcjdncjfdrjxclt';
const INTERNAL_PROJECT_ID = 'doufsxqlfjyuvxuezpln';
export const SITE_SUPABASE_URL = `https://${SITE_PROJECT_ID}.supabase.co`;

export function resolveSiteSupabaseUrl(
  candidate?: string,
  deploymentEnv: string = import.meta.env.VITE_SITE_DEPLOYMENT_ENV || 'production',
  previewProjectRef: string = import.meta.env.VITE_SITE_PREVIEW_PROJECT_REF || '',
): string {
  const value = candidate?.trim();
  const expectedRef = deploymentEnv === 'preview' ? previewProjectRef.trim() : SITE_PROJECT_ID;
  if (!/^[a-z0-9]{20}$/.test(expectedRef) || (deploymentEnv === 'preview' && [SITE_PROJECT_ID, INTERNAL_PROJECT_ID].includes(expectedRef))) return '';
  if (!value) return deploymentEnv === 'preview' ? '' : SITE_SUPABASE_URL;
  try {
    const url = new URL(value);
    if (url.protocol === 'https:' && url.hostname === `${expectedRef}.supabase.co` && !url.username && !url.password) {
      return url.origin;
    }
  } catch {
    return '';
  }
  return '';
}
export function resolveSitePublishableKey(candidate?: string, expectedProjectRef: string = SITE_PROJECT_ID): string {
  const value = candidate?.trim() || '';
  if (!value || value.startsWith('sb_secret_')) return '';
  if (value.startsWith('sb_publishable_')) return value;
  const parts = value.split('.');
  if (parts.length !== 3) return '';
  try {
    const tokenPayload = parts[1];
    if (!tokenPayload) return '';
    const encoded = tokenPayload.replaceAll('-', '+').replaceAll('_', '/');
    const payload = JSON.parse(atob(encoded.padEnd(Math.ceil(encoded.length / 4) * 4, '='))) as { role?: string; ref?: string };
    return payload.role === 'anon' && (!payload.ref || payload.ref === expectedProjectRef) ? value : '';
  } catch {
    return '';
  }
}

export function hasSiteAuthConfiguration(): boolean {
  const url = resolveSiteSupabaseUrl(import.meta.env.VITE_SITE_SUPABASE_URL);
  const projectRef = url ? new URL(url).hostname.split('.')[0] : '';
  return Boolean(
    url && resolveSitePublishableKey(import.meta.env.VITE_SITE_SUPABASE_PUBLISHABLE_KEY, projectRef),
  );
}
