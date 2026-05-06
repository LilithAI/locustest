/// <reference types="vite/client" />

declare const __BUILD_VERSION__: string;

declare module "*.mdx" {
  import type { ComponentType } from "react";
  const MDXComponent: ComponentType;
  export default MDXComponent;
}

interface Window {
  fbq?: (...args: unknown[]) => void;
  _fbq?: unknown;
}
