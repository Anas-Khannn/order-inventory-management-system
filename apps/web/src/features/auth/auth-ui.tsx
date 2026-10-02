import { PASSWORD_RULES } from "@repo/shared";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, Check, Eye, EyeOff, Loader2 } from "lucide-react";
import { forwardRef, useState, type InputHTMLAttributes, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fluid, snappy } from "@/lib/motion";
import { cn } from "@/lib/utils";

/** Password input with a show/hide toggle. The icons swap with a small rotate-and-fade. */
export const PasswordInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(({ className, ...props }, ref) => {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <Input ref={ref} type={visible ? "text" : "password"} className={cn("pr-10", className)} {...props} />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        className="absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-r-md text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 active:opacity-70"
      >
        <AnimatePresence initial={false} mode="popLayout">
          <motion.span
            key={visible ? "hide" : "show"}
            initial={{ opacity: 0, rotate: -45, scale: 0.6 }}
            animate={{ opacity: 1, rotate: 0, scale: 1 }}
            exit={{ opacity: 0, rotate: 45, scale: 0.6 }}
            transition={snappy}
            className="flex"
          >
            {visible ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
          </motion.span>
        </AnimatePresence>
      </button>
    </div>
  );
});
PasswordInput.displayName = "PasswordInput";

export type SubmitState = "idle" | "loading" | "success";

/** Primary button whose label morphs: label → spinner → check. Width stays fixed so nothing shifts. */
export function SubmitButton({ state, children, className }: { state: SubmitState; children: ReactNode; className?: string }) {
  return (
    <Button type="submit" disabled={state !== "idle"} aria-busy={state === "loading" || undefined} className={cn("w-full overflow-hidden disabled:opacity-100", className)}>
      <AnimatePresence initial={false} mode="popLayout">
        <motion.span
          key={state}
          initial={{ opacity: 0, y: 14, filter: "blur(2px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          exit={{ opacity: 0, y: -14, filter: "blur(2px)" }}
          transition={fluid}
          className="flex items-center gap-2"
        >
          {state === "loading" ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-label="Working" />
          ) : state === "success" ? (
            <>
              <Check className="h-4 w-4" aria-hidden /> Done
            </>
          ) : (
            children
          )}
        </motion.span>
      </AnimatePresence>
    </Button>
  );
}

/** Form-level error banner that grows open, so the fields below slide down instead of jumping. */
export function FormAlert({ message }: { message?: string | null }) {
  return (
    <AnimatePresence initial={false}>
      {message && (
        <motion.div
          key="alert"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={fluid}
          className="overflow-hidden"
        >
          <div role="alert" className="mb-4 flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <span>{message}</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** A circle and tick that draw themselves, for confirmation screens. */
export function AnimatedCheck({ className }: { className?: string }) {
  return (
    <motion.svg viewBox="0 0 52 52" className={cn("h-14 w-14 text-emerald-600 dark:text-emerald-400", className)} initial="hidden" animate="shown" aria-hidden>
      <motion.circle
        cx="26"
        cy="26"
        r="24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        variants={{ hidden: { pathLength: 0, opacity: 0 }, shown: { pathLength: 1, opacity: 1 } }}
        transition={{ duration: 0.6, ease: [0.32, 0.72, 0, 1] }}
      />
      <motion.path
        d="M15 27l7 7 15-16"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        variants={{ hidden: { pathLength: 0 }, shown: { pathLength: 1 } }}
        transition={{ duration: 0.35, delay: 0.45, ease: "easeOut" }}
      />
    </motion.svg>
  );
}

const STRENGTH = [
  { label: "Too weak", bar: "bg-rose-500" },
  { label: "Weak", bar: "bg-rose-500" },
  { label: "Fair", bar: "bg-amber-500" },
  { label: "Good", bar: "bg-chart-1" },
  { label: "Strong", bar: "bg-emerald-500" },
];

/** Segmented strength meter plus the live rule checklist from the shared schema. */
export function PasswordStrength({ value, id }: { value: string; id?: string }) {
  const passed = PASSWORD_RULES.map((r) => r.test(value));
  const score = passed.filter(Boolean).length;
  const level = STRENGTH[score]!;

  return (
    <div id={id} className="space-y-2.5">
      <div className="flex items-center gap-3">
        <div className="grid flex-1 grid-cols-4 gap-1" aria-hidden>
          {PASSWORD_RULES.map((r, i) => (
            <div key={r.id} className="h-1 overflow-hidden rounded-full bg-muted">
              <motion.div
                className={cn("h-full origin-left rounded-full transition-colors duration-300", level.bar)}
                initial={false}
                animate={{ scaleX: i < score ? 1 : 0 }}
                transition={{ ...fluid, delay: i < score ? i * 0.04 : 0 }}
              />
            </div>
          ))}
        </div>
        <span className="w-16 text-right text-xs tabular-nums text-muted-foreground" aria-live="polite">
          {value ? level.label : ""}
        </span>
      </div>
      <ul className="grid gap-1 sm:grid-cols-2" aria-label="Password rules">
        {PASSWORD_RULES.map((r, i) => (
          <li key={r.id} className={cn("flex items-center gap-1.5 text-xs transition-colors duration-200", passed[i] ? "text-foreground" : "text-muted-foreground")}>
            <span className="relative flex h-3.5 w-3.5 items-center justify-center rounded-full border border-current/40">
              <AnimatePresence initial={false}>
                {passed[i] && (
                  <motion.span
                    key="on"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    transition={snappy}
                    className="absolute inset-[-1px] flex items-center justify-center rounded-full bg-emerald-500 text-white"
                  >
                    <Check className="h-2.5 w-2.5" strokeWidth={3} aria-hidden />
                  </motion.span>
                )}
              </AnimatePresence>
            </span>
            {r.label}
            <span className="sr-only">{passed[i] ? "(met)" : "(not met)"}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
