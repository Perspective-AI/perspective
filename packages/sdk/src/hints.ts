/**
 * Resource hint injection for faster iframe loading
 * SSR-safe - all DOM access is guarded
 */

import { hasDom } from "./config";

/** Inject preconnect and dns-prefetch hints for the embed host */
export function injectResourceHints(host: string): void {
  if (!hasDom()) return;

  let origin: string;
  try {
    origin = new URL(host).origin;
  } catch {
    return;
  }

  if (!document.querySelector(`link[rel="preconnect"][href="${origin}"]`)) {
    const preconnect = document.createElement("link");
    preconnect.rel = "preconnect";
    preconnect.href = origin;
    preconnect.crossOrigin = "";
    document.head.appendChild(preconnect);
  }

  if (!document.querySelector(`link[rel="dns-prefetch"][href="${origin}"]`)) {
    const dnsPrefetch = document.createElement("link");
    dnsPrefetch.rel = "dns-prefetch";
    dnsPrefetch.href = origin;
    document.head.appendChild(dnsPrefetch);
  }
}
