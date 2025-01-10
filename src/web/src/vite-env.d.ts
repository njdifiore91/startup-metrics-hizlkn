/// <reference types="vite/client" />

// Environment variable type declarations
interface ImportMetaEnv {
  /** API base URL for backend requests */
  readonly VITE_API_URL: string;
  
  /** Google OAuth client ID for authentication */
  readonly VITE_GOOGLE_CLIENT_ID: string;
  
  /** Current application environment */
  readonly VITE_APP_ENV: 'development' | 'staging' | 'production';
  
  /** Optional API request timeout in milliseconds */
  readonly VITE_API_TIMEOUT?: number;
  
  /** Optional flag to enable analytics tracking */
  readonly VITE_ENABLE_ANALYTICS?: boolean;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Static asset type declarations
declare module '*.svg' {
  const content: React.FunctionComponent<React.SVGProps<SVGSVGElement>>;
  export default content;
}

declare module '*.png' {
  const content: string;
  export default content;
}

declare module '*.jpg' {
  const content: string;
  export default content;
}

declare module '*.ico' {
  const content: string;
  export default content;
}

declare module '*.css' {
  const content: { [className: string]: string };
  export default content;
}

declare module '*.woff2' {
  const content: string;
  export default content;
}

declare module '*.json' {
  const content: { [key: string]: any };
  export default content;
}