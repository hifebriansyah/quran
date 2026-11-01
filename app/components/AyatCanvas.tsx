import { useEffect, useRef, useState } from "react";
import logo from "~/lib/logo.json";
import { arabicDigits } from "~/lib/surahs";

export type AyatCanvasProps = {
  /** the Arabic text of the verse (without the verse number: it is drawn after it) */
  arabic: string;
  /** the translation */
  text: string;
  /** the verse number, drawn after the Arabic in the "end of ayah" sign */
  n: number;
  /** e.g. "Al-'Alaq 96:1", at the bottom of the card */
  reference: string;
};

const SIZE = 1080;
const PALETTE = {
  light: { bg: "#f4f2eb", ink: "#404040", line: "#e2dfd3", accent: "#0f7a6e" },
  dark: { bg: "#1c1b18", ink: "#ece9e1", line: "#37352f", accent: "#5fd9c9" },
};
const ARABIC_FONT = '"Amiri Quran", serif';
const UI_FONT = "Inter, system-ui, sans-serif";
const END_OF_AYAH = "۝"; // the Quran font draws the Arabic-Indic digits that follow it inside the circle

// The card is the same as the picture tools/make_ayat_images.ts draws for link previews (light), laid out here with numbers instead of CSS.
const PAD_X = 90;
const LOGO_HEIGHT = 52;
const BODY_TOP = 163;
const BODY_BOTTOM = 925;

/** The theme the reader is using: light unless the switch put data-theme="dark" on <html>. Follows the switch while the page is open. */
function useDark() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const el = document.documentElement;
    const read = () => setDark(el.dataset.theme === "dark");
    read();
    const observer = new MutationObserver(read);
    observer.observe(el, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);
  return dark;
}

/** The logo as a path (app/lib/logo.json, traced from logo.png by tools/trace_logo.py): drawn sharp at any size, nothing to load. */
let logoPath: Path2D | undefined;

/** Break text into lines no wider than maxWidth with the font the context has now. */
function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const trial = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(trial).width > maxWidth) {
      lines.push(line);
      line = word;
    } else line = trial;
  }
  return line ? [...lines, line] : lines;
}

function draw(canvas: HTMLCanvasElement, c: (typeof PALETTE)["light"], { arabic, text, n, reference }: AyatCanvasProps) {
  // One canvas pixel per device pixel: the card is laid out in 1080 units and scaled to the size it is shown at (times the screen's pixel
  // ratio), so nothing is resampled by the browser afterwards. Drawn at 1080 and then shrunk or stretched, the text and the logo go soft.
  const pixels = Math.min(3 * SIZE, Math.max(300, Math.round((canvas.clientWidth || SIZE) * (window.devicePixelRatio || 1))));
  if (canvas.width !== pixels) {
    canvas.width = pixels; // this also clears the canvas and resets its state
    canvas.height = pixels;
  }
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.setTransform(pixels / SIZE, 0, 0, pixels / SIZE, 0, 0);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  const arabicLine = `${arabic} ${END_OF_AYAH}${arabicDigits(n)}`;
  const width = SIZE - 2 * PAD_X;
  const bodyHeight = BODY_BOTTOM - BODY_TOP;

  ctx.fillStyle = c.bg;
  ctx.fillRect(0, 0, SIZE, SIZE);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  // header: the logo, centred, drawn from its outline
  logoPath ??= new Path2D(logo.path);
  const k = LOGO_HEIGHT / logo.height;
  ctx.save();
  ctx.translate((SIZE - logo.width * k) / 2, 90 - LOGO_HEIGHT / 2);
  ctx.scale(k, k);
  ctx.fillStyle = logo.color;
  ctx.fill(logoPath, "evenodd");
  ctx.restore();
  ctx.fillStyle = c.line;
  ctx.fillRect(PAD_X, 137, width, 1);
  ctx.fillRect(PAD_X, 950, width, 1);

  // the largest Arabic size at which Arabic + translation fit between the rules; a long verse gets tighter lines and a smaller translation
  let layout: { size: number; ar: string[]; tr: string[]; ts: number; arLine: number; trLine: number; gap: number } | null = null;
  for (let size = 74; size >= 18; size -= 1) {
    const arLine = size * (size >= 52 ? 2.15 : size >= 34 ? 1.95 : 1.8);
    const ts = Math.max(15, Math.round(size * 0.46));
    const trLine = ts * (size >= 34 ? 1.5 : 1.4);
    const gap = size >= 34 ? 34 : 18;
    ctx.direction = "rtl";
    ctx.font = `${size}px ${ARABIC_FONT}`;
    const ar = wrap(ctx, arabicLine, width);
    ctx.direction = "ltr";
    ctx.font = `400 ${ts}px ${UI_FONT}`;
    const tr = wrap(ctx, text, width);
    layout = { size, ar, tr, ts, arLine, trLine, gap };
    if (ar.length * arLine + gap + tr.length * trLine <= bodyHeight) break;
  }
  if (layout) {
    const { size, ar, tr, ts, arLine, trLine, gap } = layout;
    let y = BODY_TOP + (bodyHeight - (ar.length * arLine + gap + tr.length * trLine)) / 2;
    ctx.fillStyle = c.ink;
    ctx.direction = "rtl";
    ctx.font = `${size}px ${ARABIC_FONT}`;
    for (const line of ar) {
      ctx.fillText(line, SIZE / 2, y + arLine / 2);
      y += arLine;
    }
    y += gap;
    ctx.direction = "ltr";
    ctx.font = `400 ${ts}px ${UI_FONT}`;
    for (const line of tr) {
      ctx.fillText(line, SIZE / 2, y + trLine / 2);
      y += trLine;
    }
  }

  // footer: the reference
  ctx.direction = "ltr";
  ctx.font = `700 32px ${UI_FONT}`;
  ctx.fillStyle = c.accent;
  ctx.fillText(reference, SIZE / 2, 997);
}

/**
 * The picture of a verse, drawn in the browser, light or dark like the rest of the page (and redrawn when the theme is switched).
 * Link previews use the light JPG from R2 instead (og:image, see app/routes/ayat.tsx): nothing here is a file.
 */
export function AyatCanvas(props: AyatCanvasProps) {
  const ref = useRef<HTMLCanvasElement>(null);
  const dark = useDark();
  const { arabic, text, n, reference } = props;

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    let cancelled = false;
    const paint = () => !cancelled && draw(canvas, dark ? PALETTE.dark : PALETTE.light, { arabic, text, n, reference });
    paint(); // at once with whatever font is there, then again when the fonts have arrived
    const resized = new ResizeObserver(paint); // and when the card is shown at another size
    resized.observe(canvas);
    Promise.all([
      document.fonts.load(`74px ${ARABIC_FONT}`, arabic),
      document.fonts.load(`400 20px ${UI_FONT}`),
      document.fonts.load(`700 32px ${UI_FONT}`),
    ])
      .then(paint)
      .catch(() => {});
    return () => {
      cancelled = true;
      resized.disconnect();
    };
  }, [dark, arabic, text, n, reference]);

  return (
    <canvas
      ref={ref}
      width={SIZE}
      height={SIZE}
      role="img"
      aria-label={reference}
      className="aspect-square h-auto w-full rounded-2xl border border-line shadow-sm"
    >
      <p lang="ar" dir="rtl">
        {arabic}
      </p>
      <p>{text}</p>
      <p>{reference}</p>
    </canvas>
  );
}
