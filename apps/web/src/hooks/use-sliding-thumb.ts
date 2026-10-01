import { useLayoutEffect, useRef, useState, type CSSProperties } from "react";

/**
 * Positions a single "thumb" under the selected option of a segmented control, so selection
 * moves continuously from one option to the next instead of blinking. The transition retargets
 * from wherever the thumb currently is, so rapid clicks never jump.
 */
export function useSlidingThumb<T extends HTMLElement>(activeIndex: number) {
  const container = useRef<T>(null);
  const [style, setStyle] = useState<CSSProperties>({ opacity: 0 });
  const placed = useRef(false);

  useLayoutEffect(() => {
    const el = container.current;
    if (!el) return;
    const measure = () => {
      const target = el.querySelectorAll<HTMLElement>("[data-segment]")[activeIndex];
      if (!target) return setStyle({ opacity: 0 });
      setStyle({
        opacity: 1,
        width: target.offsetWidth,
        height: target.offsetHeight,
        transform: `translate3d(${target.offsetLeft}px, ${target.offsetTop}px, 0)`,
        // First placement is instant; after that the thumb glides.
        transition: placed.current ? "transform 320ms var(--ease-in-out-fluid), width 320ms var(--ease-in-out-fluid)" : "none",
      });
      placed.current = true;
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [activeIndex]);

  return { container, thumbStyle: style };
}
