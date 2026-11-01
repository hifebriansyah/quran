import { useEffect, useState } from "react";
import { store } from "~/lib/storage";
import { Icon } from "./Icon";

// The saved choice is applied before the first paint by THEME_SCRIPT (root.tsx); this button only flips it.
export const THEME_KEY = "quran-theme";
export const THEME_SCRIPT = `try{var t=localStorage.getItem("${THEME_KEY}");if(t)document.documentElement.dataset.theme=t}catch(e){}`;

// Light unless the reader chose dark: the device setting is not used.
const isDark = () => document.documentElement.dataset.theme === "dark";

export function ThemeToggle({ label }: { label: string }) {
  const [dark, setDark] = useState(false);
  useEffect(() => setDark(isDark()), []);
  return (
    <button
      className="grid size-9 place-items-center rounded-full text-ink hover:bg-ink/10"
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
