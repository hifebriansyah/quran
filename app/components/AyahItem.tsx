import { Link } from "react-router";
import { arabicDigits } from "~/lib/surahs";
import { t, type Lang } from "~/lib/i18n";
import { Icon } from "./Icon";

export type AyahItemProps = {
  lang: Lang;
  n: number;
  arabic: string;
  latin: string;
  text: string;
  /** the page with this verse's picture */
  imageHref?: string;
  onCopy?: () => void;
  onShare?: () => void;
};

// U+06DD is the "end of ayah" sign; the Quran font draws the Arabic-Indic digits that follow it inside the circle.
const END_OF_AYAH = "۝";

export function AyahItem({ lang, n, arabic, latin, text, imageHref, onCopy, onShare }: AyahItemProps) {
  const s = t(lang);
  return (
    <article id={`ayat-${n}`} className="scroll-mt-32 border-b border-line py-6 target:bg-accent/10">
      <div className="mb-3 flex items-center gap-1 text-muted">
        <span className="mr-auto text-xs font-semibold">{s.verse(n)}</span>
        <button
          aria-label={s.copy}
          title={s.copy}
          onClick={onCopy}
          className="grid size-8 place-items-center rounded-full hover:bg-line/60"
        >
          <Icon name="copy" />
        </button>
        {imageHref && (
          <Link
            to={imageHref}
            aria-label={s.viewImage}
            title={s.viewImage}
            className="grid size-8 place-items-center rounded-full hover:bg-line/60"
          >
            <Icon name="image" />
          </Link>
        )}
        <button
          aria-label={s.share}
          title={s.share}
          onClick={onShare}
          className="grid size-8 place-items-center rounded-full hover:bg-line/60"
        >
          <Icon name="share" />
        </button>
      </div>
      <p lang="ar" dir="rtl" className="font-arab text-right text-[1.9rem] leading-[2.3] sm:text-4xl sm:leading-[2.3]">
        {arabic} {END_OF_AYAH}
        {arabicDigits(n)}
      </p>
      <p className="mt-3 text-sm text-accent-text italic">{latin}</p>
      <p className="mt-2 leading-relaxed">{text}</p>
    </article>
  );
}
