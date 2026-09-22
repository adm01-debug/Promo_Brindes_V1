import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types/site-database.types';
import { resolveSitePublishableKey, resolveSiteSupabaseUrl } from './siteSupabaseConfig';

const configuredUrl = resolveSiteSupabaseUrl(import.meta.env.VITE_SITE_SUPABASE_URL);
const configuredRef = configuredUrl ? new URL(configuredUrl).hostname.split('.')[0] : '';
const configuredKey = configuredRef ? resolveSitePublishableKey(import.meta.env.VITE_SITE_SUPABASE_PUBLISHABLE_KEY, configuredRef) : '';

export const siteSupabase: SupabaseClient<Database> | null = configuredUrl && configuredKey
  ? createClient<Database>(configuredUrl, configuredKey, {
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
