import { useCallback, useEffect, useRef, useState } from "react";

/** Briefly highlights a row (by id) after it changes, so the user sees where their action landed. */
export function useFlash(ms = 1200) {
  const [id, setId] = useState<number | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const flash = useCallback(
    (next: number) => {
      clearTimeout(timer.current);
      setId(null);
      // Next frame so re-flashing the same row restarts the animation.
      requestAnimationFrame(() => setId(next));
      timer.current = setTimeout(() => setId(null), ms);
    },
    [ms],
  );
  useEffect(() => () => clearTimeout(timer.current), []);
  return [id, flash] as const;
}

/** Focus a field when the user presses "/" (outside of other inputs), like GitHub or Linear. */
export function useSlashFocus(ref: React.RefObject<HTMLElement>) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (e.key !== "/" || e.metaKey || e.ctrlKey || t.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName)) return;
      e.preventDefault();
      ref.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [ref]);
}
