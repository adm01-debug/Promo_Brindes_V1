/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string;
  readonly VITE_PRODUCT_CATALOG_RESOURCE?: string;
  readonly VITE_QUOTE_REQUEST_ENDPOINT?: string;
  readonly VITE_CONTACT_REQUEST_ENDPOINT?: string;
  readonly VITE_PUBLIC_URL?: string;
  readonly VITE_CONTACT_EMAIL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
