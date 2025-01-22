/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_ENV: 'development' | 'staging' | 'production';
  readonly VITE_API_URL: string;
  readonly VITE_GOOGLE_CLIENT_ID: string;
  readonly VITE_APP_NAME: string;
  readonly VITE_SENTRY_DSN?: string;
  readonly VITE_SEGMENT_WRITE_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
