import { useEffect, useRef } from 'react';

/**
 * Plays a pleasant 2-note chime via Web Audio API
 * whenever the number of pending orders increases.
 * No external audio files needed.
 */
export function useOrderChime(pendingCount: number) {
  const prevCountRef = useRef<number | null>(null);

  const playChime = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();

      const notes = [
        { freq: 880, start: 0,    duration: 0.25 },  // A5
        { freq: 1047, start: 0.2, duration: 0.4  },  // C6
      ];

      notes.forEach(({ freq, start, duration }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + start);

        // Soft attack + decay envelope
        gain.gain.setValueAtTime(0, ctx.currentTime + start);
        gain.gain.linearRampToValueAtTime(0.18, ctx.currentTime + start + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + duration);

        osc.start(ctx.currentTime + start);
        osc.stop(ctx.currentTime + start + duration);
      });

      // Clean up context after chime finishes
      setTimeout(() => ctx.close(), 1000);
    } catch {
      // Silently fail if audio not available
    }
  };

  useEffect(() => {
    // Skip on first render (don't chime on page load)
    if (prevCountRef.current === null) {
      prevCountRef.current = pendingCount;
      return;
    }

    if (pendingCount > prevCountRef.current) {
      playChime();
    }

    prevCountRef.current = pendingCount;
  }, [pendingCount]);
}