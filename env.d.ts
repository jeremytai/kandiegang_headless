/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_WP_GRAPHQL_URL?: string;
  readonly VITE_LAST_GIT_DATE?: string;
  readonly VITE_FORMSPREE_CONTACT_FORM_ID?: string;
  readonly VITE_GTM_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare global {
  interface Window {
    gtag?: (command: string, ...args: unknown[]) => void;
  }
}

export {};
