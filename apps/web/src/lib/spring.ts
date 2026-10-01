/**
 * Interruptible springs and gesture math, parameterised the way Apple's UIKit/SwiftUI are:
 * `damping` (1 = critically damped, <1 overshoots) and `response` (seconds to reach the target,
 * roughly; not a fixed duration). Springs start from the *current* value and carry velocity,
 * so they can be grabbed and re-targeted mid-flight without a visible jump.
 */

export interface SpringOptions {
  from: number;
  to: number;
  /** Initial velocity in units per second (e.g. the finger's release velocity in px/s). */
  velocity?: number;
  damping?: number;
  response?: number;
  onUpdate: (value: number, velocity: number) => void;
  onComplete?: () => void;
}

export interface SpringHandle {
  /** Stop where it is. Returns the live value and velocity so a gesture can take over. */
  stop: () => { value: number; velocity: number };
}

const prefersReducedMotion = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function spring({ from, to, velocity = 0, damping = 1, response = 0.4, onUpdate, onComplete }: SpringOptions): SpringHandle {
  // Reduced motion: no travel, just land (callers pair this with an opacity change).
  if (prefersReducedMotion()) {
    onUpdate(to, 0);
    onComplete?.();
    return { stop: () => ({ value: to, velocity: 0 }) };
  }

  // response/damping → stiffness/damping coefficient for a unit mass.
  const stiffness = (2 * Math.PI / response) ** 2;
  const friction = (4 * Math.PI * damping) / response;

  let x = from;
  let v = velocity;
  let last = performance.now();
  let raf = 0;
  let done = false;

  const tick = (now: number) => {
    // Fixed 1ms sub-steps keep the integration stable regardless of frame rate.
    let dt = Math.min(0.064, (now - last) / 1000);
    last = now;
    while (dt > 0) {
      const step = Math.min(dt, 0.001);
      const a = -stiffness * (x - to) - friction * v;
      v += a * step;
      x += v * step;
      dt -= step;
    }
    if (Math.abs(v) < 0.5 && Math.abs(x - to) < 0.5) {
      x = to;
      v = 0;
      done = true;
      onUpdate(x, v);
      onComplete?.();
      return;
    }
    onUpdate(x, v);
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);

  return {
    stop: () => {
      if (!done) cancelAnimationFrame(raf);
      done = true;
      return { value: x, velocity: v };
    },
  };
}

/**
 * Where a flick would come to rest under scroll-style deceleration (Apple's projection from
 * "Designing Fluid Interfaces"). decelerationRate 0.998 ≈ normal scroll, 0.99 ≈ snappier.
 */
export const project = (velocity: number, decelerationRate = 0.998) => ((velocity / 1000) * decelerationRate) / (1 - decelerationRate);

/** Progressive resistance past a boundary: the further you pull, the less it follows. */
export const rubberband = (overshoot: number, dimension: number, constant = 0.55) =>
  (overshoot * dimension * constant) / (dimension + constant * Math.abs(overshoot));

/** Velocity (units/s) from a short history of samples, ignoring stale ones. */
export function velocityFrom(samples: { t: number; x: number }[], windowMs = 100) {
  const now = samples.at(-1);
  if (!now) return 0;
  const first = samples.find((s) => now.t - s.t <= windowMs) ?? now;
  const dt = (now.t - first.t) / 1000;
  return dt > 0 ? (now.x - first.x) / dt : 0;
}
