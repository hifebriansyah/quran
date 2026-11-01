import { useCallback } from "react";
import { useToast } from "~/components/Toast";
import { t, type Lang } from "./i18n";

// the site may be served from a folder (BASE_URL "/for-fun/quran/"); Storybook uses a relative base, so no prefix there
const folder = import.meta.env.BASE_URL.startsWith("/") ? import.meta.env.BASE_URL.replace(/\/$/, "") : "";
export const linkTo = (path: string) => `${location.origin}${folder}${path}`;

/** Copy text, or share an address of the site (the native share sheet on phones, a copied link elsewhere). */
export function useShare(lang: Lang) {
  const say = useToast();
  const s = t(lang);
  const copy = useCallback(
    async (text: string, message: string) => {
      try {
        await navigator.clipboard.writeText(text);
        say(message);
      } catch {
        say(s.copyFailed);
      }
    },
    [say, s.copyFailed],
  );
  const share = useCallback(
    async (path: string, title: string) => {
      const url = linkTo(path);
      if (navigator.share && matchMedia("(pointer: coarse)").matches) {
        try {
          await navigator.share({ title, url });
          return;
        } catch (e) {
          if (e instanceof Error && e.name === "AbortError") return;
        }
      }
      copy(url, s.linkCopied);
    },
    [copy, s.linkCopied],
  );
  return { copy, share };
}
