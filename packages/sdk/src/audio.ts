/**
 * Web Audio API chime sound for float bar sequence
 * Matches artifact prototype: dual sine oscillators with frequency steps
 * SSR-safe - no-op without window.AudioContext
 */

export function playChime(audioCtx?: AudioContext): AudioContext | null {
  // Match artifact: support webkitAudioContext fallback
  const AudioCtxClass =
    typeof window !== "undefined"
      ? (window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext)
      : undefined;
  if (!AudioCtxClass) return null;

  const ctx = audioCtx ?? new AudioCtxClass();
  if (ctx.state === "suspended") {
    ctx.resume();
  }

  const t = ctx.currentTime;

  // Primary tone
  const osc1 = ctx.createOscillator();
  const gain1 = ctx.createGain();
  osc1.type = "sine";
  osc1.frequency.setValueAtTime(880, t);
  osc1.frequency.setValueAtTime(1175, t + 0.1);
  gain1.gain.setValueAtTime(0.15, t);
  gain1.gain.linearRampToValueAtTime(0.18, t + 0.1);
  gain1.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
  osc1.connect(gain1).connect(ctx.destination);
  osc1.start(t);
  osc1.stop(t + 0.65);

  // Second ping
  const osc2 = ctx.createOscillator();
  const gain2 = ctx.createGain();
  osc2.type = "sine";
  osc2.frequency.setValueAtTime(1175, t + 0.15);
  osc2.frequency.setValueAtTime(1400, t + 0.25);
  gain2.gain.setValueAtTime(0, t);
  gain2.gain.setValueAtTime(0.12, t + 0.15);
  gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.55);
  osc2.connect(gain2).connect(ctx.destination);
  osc2.start(t + 0.15);
  osc2.stop(t + 0.6);

  return ctx;
}
