import { useEffect, useState } from "react";
import { store } from "~/lib/storage";
import { Icon } from "./Icon";

// The saved choice is applied before the first paint by THEME_SCRIPT (root.tsx); this button only flips it.
export const THEME_KEY = "quran-theme";
export const THEME_SCRIPT = `try{var t=localStorage.getItem("${THEME_KEY}");if(t)document.documentElement.dataset.theme=t}catch(e){}`;

const isDark = () => {
  const set = document.documentElement.dataset.theme;
  return set ? set === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
};

export function ThemeToggle({ label }: { label: string }) {
  const [dark, setDark] = useState(false);
  useEffect(() => setDark(isDark()), []);
  return (
    <button
      className="grid size-9 place-items-center rounded-full text-white/85 hover:bg-white/15"
      aria-label={label}
      onClick={() => {
        const next = isDark() ? "light" : "dark";
        document.documentElement.dataset.theme = next;
        store.set(THEME_KEY, next);
        setDark(next === "dark");
      }}
    >
      <Icon name={dark ? "sun" : "moon"} className="text-lg" />
    </button>
  );
}
