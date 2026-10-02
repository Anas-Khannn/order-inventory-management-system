import type { Transition, Variants } from "framer-motion";

/**
 * Framer Motion presets in the same vocabulary as `lib/spring.ts`: `visualDuration` plays the
 * role of `response` and `bounce` 0 is critically damped. Springs keep velocity when a state
 * changes mid-flight, so interrupted animations never jump.
 */
export const fluid: Transition = { type: "spring", visualDuration: 0.4, bounce: 0 };
export const snappy: Transition = { type: "spring", visualDuration: 0.25, bounce: 0.15 };
export const gentle: Transition = { type: "spring", visualDuration: 0.6, bounce: 0.1 };

/** Parent that reveals its `riseItem` children one after another. */
export const stagger = (gap = 0.05, delay = 0.05): Variants => ({
  hidden: {},
  shown: { transition: { staggerChildren: gap, delayChildren: delay } },
});

export const riseItem: Variants = {
  hidden: { opacity: 0, y: 8 },
  shown: { opacity: 1, y: 0, transition: fluid },
};

/** A short horizontal shake for rejected input (the macOS "wrong password" cue). */
export const shakeKeyframes = { x: [0, -10, 9, -7, 5, -2, 0] };
export const shakeTransition: Transition = { duration: 0.45, ease: "easeOut" };
