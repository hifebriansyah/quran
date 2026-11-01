import { t, type Lang } from "~/lib/i18n";
import { Icon } from "./Icon";

export type RecitationPlayerProps = {
  lang: Lang;
  /** the verse that is loaded */
  n: number;
  /** how many verses the surah has */
  ayat: number;
  paused: boolean;
  /** seconds played and the length of this verse (0 until known) */
  at: number;
  length: number;
  onPrev: () => void;
  onNext: () => void;
  onPause: () => void;
  onSeek: (seconds: number) => void;
  onClose: () => void;
};

const button =
  "grid size-9 shrink-0 place-items-center rounded-full hover:bg-line/60 disabled:opacity-40 disabled:hover:bg-transparent";

/** Floating at the bottom while a recitation is loaded: one line of previous, play / pause, next, the progress bar and a close button. */
export function RecitationPlayer({
  lang,
  n,
  ayat,
  paused,
  at,
  length,
  onPrev,
  onNext,
  onPause,
  onSeek,
  onClose,
}: RecitationPlayerProps) {
  const s = t(lang);
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div className="pointer-events-auto mx-auto flex max-w-xl items-center gap-1 rounded-full border border-line bg-card px-2 py-1.5 shadow-lg">
        <button aria-label={s.prevVerse} title={s.prevVerse} onClick={onPrev} disabled={n <= 1} className={button}>
          <Icon name="chevronLeft" />
        </button>
        <button
          aria-label={paused ? s.play : s.pause}
          title={paused ? s.play : s.pause}
          onClick={onPause}
          className={`${button} text-accent-text`}
        >
          <Icon name={paused ? "play" : "pause"} />
        </button>
        <button aria-label={s.nextVerse} title={s.nextVerse} onClick={onNext} disabled={n >= ayat} className={button}>
          <Icon name="chevronRight" />
        </button>
        <input
          type="range"
          aria-label={s.verse(n)}
          min={0}
          max={length || 1}
          step="any"
          value={Math.min(at, length || 1)}
          onChange={(e) => onSeek(Number(e.target.value))}
          className="mx-2 h-1 min-w-0 flex-1 cursor-pointer accent-[var(--accent-text)]"
        />
        <button aria-label={s.close} title={s.close} onClick={onClose} className={button}>
          <Icon name="x" />
        </button>
      </div>
    </div>
  );
}
