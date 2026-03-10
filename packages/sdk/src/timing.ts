/**
 * Performance timing for embed load waterfall
 * SSR-safe - uses performance.now() when available
 */

const timers = new Map<string, EmbedTimer>();
const shouldLogTimings =
  typeof process !== "undefined" && process.env?.NODE_ENV === "development";

export class EmbedTimer {
  private startTime: number;
  private marks = new Map<string, number>();

  constructor(public readonly researchId: string) {
    this.startTime = typeof performance !== "undefined" ? performance.now() : 0;
  }

  mark(name: string): void {
    if (typeof performance === "undefined") return;
    this.marks.set(name, performance.now() - this.startTime);
  }

  getMark(name: string): number | undefined {
    return this.marks.get(name);
  }

  log(): void {
    if (!shouldLogTimings || typeof console === "undefined") return;

    const entries = Array.from(this.marks.entries());
    if (entries.length === 0) return;

    const total = entries[entries.length - 1]?.[1] ?? 0;

    console.groupCollapsed(
      `[Perspective] Embed timing: ${total.toFixed(0)}ms (${this.researchId})`
    );
    for (const [name, time] of entries) {
      console.debug(`  ${name.padEnd(22)} → ${time.toFixed(0)}ms`);
    }
    console.groupEnd();
  }
}

export function getTimer(researchId: string): EmbedTimer {
  let timer = timers.get(researchId);
  if (!timer) {
    timer = new EmbedTimer(researchId);
    timers.set(researchId, timer);
  }
  return timer;
}

export function removeTimer(researchId: string): void {
  timers.delete(researchId);
}
