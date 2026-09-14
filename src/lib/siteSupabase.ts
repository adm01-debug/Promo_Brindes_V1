import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { resolveSitePublishableKey, resolveSiteSupabaseUrl } from './siteSupabaseConfig';

const configuredUrl = resolveSiteSupabaseUrl(import.meta.env.VITE_SITE_SUPABASE_URL);
const configuredKey = resolveSitePublishableKey(import.meta.env.VITE_SITE_SUPABASE_PUBLISHABLE_KEY);

export const siteSupabase: SupabaseClient | null = configuredUrl && configuredKey
  ? createClient(configuredUrl, configuredKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: 'promo-brindes-customer-session',
      },
    })
  : null;

export const siteAuthConfigured = Boolean(siteSupabase);
export { hasSiteAuthConfiguration, resolveSitePublishableKey, resolveSiteSupabaseUrl } from './siteSupabaseConfig';
