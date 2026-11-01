import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";

const ToastContext = createContext<(message: string) => void>(() => {});

/** `const say = useToast(); say("Disalin")` shows a short message at the top of the screen. */
export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState("");
  const [shown, setShown] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const say = useCallback((text: string) => {
    setMessage(text);
    setShown(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setShown(false), 1800);
  }, []);
  useEffect(() => () => clearTimeout(timer.current), []);
  return (
    <ToastContext.Provider value={say}>
      {children}
      <Toast message={message} shown={shown} />
    </ToastContext.Provider>
  );
}

export function Toast({ message, shown }: { message: string; shown: boolean }) {
  return (
    <div
      role="status"
      className={`pointer-events-none fixed top-20 left-1/2 z-40 -translate-x-1/2 rounded-full bg-ink px-4 py-2 text-sm text-bg transition duration-300 ${
        shown ? "translate-y-0 opacity-100" : "-translate-y-6 opacity-0"
      }`}
    >
      {message}
    </div>
  );
}
