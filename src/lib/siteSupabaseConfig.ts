const SITE_PROJECT_ID = 'xlzmclcjdncjfdrjxclt';
export const SITE_SUPABASE_URL = `https://${SITE_PROJECT_ID}.supabase.co`;

export function resolveSiteSupabaseUrl(candidate?: string): string {
  const value = candidate?.trim();
  if (!value) return SITE_SUPABASE_URL;
  try {
    const url = new URL(value);
    if (url.protocol === 'https:' && url.hostname === `${SITE_PROJECT_ID}.supabase.co` && !url.username && !url.password) {
      return SITE_SUPABASE_URL;
    }
  } catch {
    return '';
  }
  return '';
}
export function resolveSitePublishableKey(candidate?: string): string {
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
    return payload.role === 'anon' && (!payload.ref || payload.ref === SITE_PROJECT_ID) ? value : '';
  } catch {
    return '';
  }
}

export function hasSiteAuthConfiguration(): boolean {
  return Boolean(
    resolveSiteSupabaseUrl(import.meta.env.VITE_SITE_SUPABASE_URL)
    && resolveSitePublishableKey(import.meta.env.VITE_SITE_SUPABASE_PUBLISHABLE_KEY),
  );
}
