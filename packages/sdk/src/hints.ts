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

  if (document.querySelector(`link[rel="preconnect"][href="${origin}"]`)) {
    return;
  }

  const preconnect = document.createElement("link");
  preconnect.rel = "preconnect";
  preconnect.href = origin;
  preconnect.crossOrigin = "";

  const dnsPrefetch = document.createElement("link");
  dnsPrefetch.rel = "dns-prefetch";
  dnsPrefetch.href = origin;

  document.head.appendChild(preconnect);
  document.head.appendChild(dnsPrefetch);
}
