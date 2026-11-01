import type { ReactNode } from "react";

export type BannerProps = {
  children: ReactNode;
  /** spacing inside the banner: the top has to clear the floating header (the home page also has a title to carry) */
  className?: string;
};

/**
 * The teal banner under the floating header: the brand gradient, the circle pattern and an inset shadow. The home page puts the title and
 * the credits in it, a verse's picture page only the back button. The header (AppBar with `pill`) floats over its top edge.
 */
export function Banner({ children, className = "" }: BannerProps) {
  return (
    <section className="banner-pattern bg-gradient-to-br from-banner-from to-banner-to text-banner-ink shadow-[inset_0_-28px_36px_-26px_rgb(0_0_0/0.4),inset_0_26px_36px_-26px_rgb(0_0_0/0.22)]">
      <div className={`mx-auto max-w-5xl px-4 ${className}`.trim()}>{children}</div>
    </section>
  );
}
