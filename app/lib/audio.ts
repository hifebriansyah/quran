import { useCallback, useEffect, useRef, useState } from "react";
import { IMAGE_BASE } from "./images";

// The recitation (Mishary Alafasy, from Tanzil) is played from our R2 bucket (sent by tools/upload_voice.py), the same address as the
// pictures: one m4a per verse in voices_tanzil_net/, named by surah and verse, both padded to 3 digits.
const AUDIO_BASE = `${IMAGE_BASE}/voices_tanzil_net`;
const pad = (n: number) => String(n).padStart(3, "0");
export const recitationUrl = (surah: number, ayat: number) => `${AUDIO_BASE}/${pad(surah)}${pad(ayat)}.m4a`;

const scrollTo = (n: number) => document.getElementById(`ayat-${n}`)?.scrollIntoView({ behavior: "smooth", block: "center" });

/**
 * One player for the page: playing a verse stops the one before it. `current` is the verse that is loaded (playing or paused), null when
 * nothing is. When a verse ends the next one starts and is scrolled to the middle of the screen, until the last verse of the surah.
 */
export function useRecitation(surah: number | undefined, ayat: number) {
  const audio = useRef<HTMLAudioElement | null>(null);
  const next = useRef<(n: number, scroll?: boolean) => void>(() => {});
  const [current, setCurrent] = useState<number | null>(null);
  const [paused, setPaused] = useState(false);
  const [time, setTime] = useState({ at: 0, length: 0 });

  const stop = useCallback(() => {
    audio.current?.pause();
    audio.current = null;
    setCurrent(null);
    setPaused(false);
    setTime({ at: 0, length: 0 });
  }, []);

  const play = useCallback(
    (n: number, scroll = false) => {
      if (!surah) return;
      audio.current?.pause();
      const el = new Audio(recitationUrl(surah, n));
      audio.current = el;
      setCurrent(n);
      setPaused(false);
      setTime({ at: 0, length: 0 });
      const mine = () => audio.current === el;
      el.ontimeupdate = el.onloadedmetadata = () => mine() && setTime({ at: el.currentTime, length: el.duration || 0 });
      el.onpause = () => mine() && !el.ended && setPaused(true);
      el.onplay = () => mine() && setPaused(false);
      el.onended = () => {
        if (!mine()) return;
        if (n < ayat) next.current(n + 1, true);
        else stop();
      };
      el.onerror = () => mine() && stop();
      el.play().catch(() => mine() && stop());
      if (scroll) scrollTo(n);
    },
    [surah, ayat, stop],
  );

  useEffect(() => {
    next.current = play;
  }, [play]);

  /** The button on a verse: start it, or pause / resume it when it is the one that is loaded. */
  const toggle = useCallback(
    (n: number) => {
      const el = audio.current;
      if (el && current === n) void (el.paused ? el.play() : el.pause());
      else play(n);
    },
    [current, play],
  );

  const pause = useCallback(() => {
    const el = audio.current;
    if (el) void (el.paused ? el.play() : el.pause());
  }, []);
  const go = useCallback((n: number) => n >= 1 && n <= ayat && play(n, true), [ayat, play]);
  const seek = useCallback((seconds: number) => {
    if (audio.current) audio.current.currentTime = seconds;
  }, []);

  // leaving the surah (or the page) stops the sound
  useEffect(() => stop, [surah, stop]);

  return { current, playing: paused ? null : current, time, toggle, pause, go, seek, stop };
}
