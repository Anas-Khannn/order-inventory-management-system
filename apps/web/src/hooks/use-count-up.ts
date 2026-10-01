import { useEffect, useRef, useState } from "react";

const reduceMotion = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Eases a number from its previous value to `target` (ease-out-expo). Jumps straight there under reduced motion. */
export function useCountUp(target: number, duration = 700) {
  const [value, setValue] = useState(() => (reduceMotion() ? target : 0));
  const from = useRef(value);

  useEffect(() => {
    if (reduceMotion()) {
      setValue(target);
      return;
    }
    const start = performance.now();
    const origin = from.current;
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = t === 1 ? 1 : 1 - 2 ** (-10 * t);
      const v = origin + (target - origin) * eased;
      from.current = v;
      setValue(v);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return value;
}
