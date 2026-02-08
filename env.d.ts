/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_WP_GRAPHQL_URL?: string;
  readonly VITE_LAST_GIT_DATE?: string;
  readonly VITE_FORMSPREE_CONTACT_FORM_ID?: string;
  readonly VITE_POSTHOG_KEY?: string;
  readonly VITE_POSTHOG_HOST?: string;
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

export {};
