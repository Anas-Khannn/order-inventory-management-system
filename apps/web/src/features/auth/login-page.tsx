import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, type LoginInput, type UserRole } from "@repo/shared";
import { motion, useAnimate } from "framer-motion";
import { ShieldCheck, Store, UserRound, type LucideIcon } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { DEMO_ACCOUNTS, ROLE_LABEL } from "@/facades/auth.facade";
import { riseItem, shakeKeyframes, shakeTransition, snappy, stagger } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { useAuth } from "./auth-provider";
import { FormAlert, PasswordInput, SubmitButton, type SubmitState } from "./auth-ui";

const ROLE_ICON: Record<UserRole, LucideIcon> = { ADMIN: ShieldCheck, MANAGER: Store, STAFF: UserRound };

/** Development only: one tap fills in a seeded account, so reviewers can compare what each role can do. */
function DemoRolePicker({ accounts, selected, onPick }: { accounts: NonNullable<typeof DEMO_ACCOUNTS>; selected?: string; onPick: (email: string) => void }) {
  return (
    <fieldset className="space-y-2">
      <legend className="mb-2 text-xs font-medium text-muted-foreground">Try a demo role</legend>
      <div className="grid grid-cols-3 gap-2">
        {accounts.users.map((u) => {
          const Icon = ROLE_ICON[u.role];
          const active = selected === u.email;
          return (
            <motion.button
              key={u.email}
              type="button"
              onClick={() => onPick(u.email)}
              aria-pressed={active}
              title={u.blurb}
              whileTap={{ scale: 0.96 }}
              transition={snappy}
              className={cn(
                "relative flex flex-col items-center gap-1 rounded-lg border px-2 py-2.5 text-xs transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                active ? "border-transparent text-foreground" : "text-muted-foreground hover:border-ring/40 hover:text-foreground",
              )}
            >
              {active && (
                <motion.span
                  layoutId="demo-role-highlight"
                  transition={snappy}
                  className="absolute inset-0 rounded-lg bg-accent ring-1 ring-ring/25"
                  aria-hidden
                />
              )}
              <Icon className="relative h-4 w-4" aria-hidden />
              <span className="relative font-medium">{ROLE_LABEL[u.role]}</span>
            </motion.button>
          );
        })}
      </div>
    </fieldset>
  );
}

export function LoginPage({ onSignedIn }: { onSignedIn: () => void }) {
  const { login, commit } = useAuth();
  const [state, setState] = useState<SubmitState>("idle");
  const [error, setError] = useState<string | null>(null);
  // Imperative shake on the form element, so it stays outside the staggered variant tree.
  const [formRef, animate] = useAnimate<HTMLFormElement>();
  const shakeForm = () => void animate(formRef.current, shakeKeyframes, shakeTransition);

  const {
    register,
    handleSubmit,
    setValue,
    setFocus,
    watch,
    formState: { errors },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema), defaultValues: { email: "", password: "", remember: true } });
  const email = watch("email");

  const onSubmit = handleSubmit(
    async (input) => {
      setError(null);
      setState("loading");
      try {
        const session = await login(input);
        setState("success");
        // Let the check mark land before the console replaces this page.
        setTimeout(() => {
          commit(session);
          onSignedIn();
        }, 550);
      } catch (e) {
        setState("idle");
        setError(e instanceof Error ? e.message : "Sign-in failed. Try again.");
        setValue("password", "");
        setFocus("password");
        shakeForm();
      }
    },
    shakeForm,
  );

  const pickDemo = (address: string) => {
    setValue("email", address, { shouldValidate: true });
    setValue("password", DEMO_ACCOUNTS?.password ?? "", { shouldValidate: true });
    setError(null);
  };

  return (
    <motion.div variants={stagger()} initial="hidden" animate="shown">
      <motion.header variants={riseItem} className="mb-6 space-y-1.5">
        <h1 className="text-2xl font-semibold">Welcome back</h1>
        <p className="text-sm text-muted-foreground">Sign in to manage products, stock and orders.</p>
      </motion.header>

      {DEMO_ACCOUNTS && (
        <motion.div variants={riseItem} className="mb-6">
          <DemoRolePicker accounts={DEMO_ACCOUNTS} selected={email} onPick={pickDemo} />
        </motion.div>
      )}

      <form ref={formRef} onSubmit={onSubmit} noValidate className="space-y-4">
        <FormAlert message={error} />
        <motion.div variants={riseItem}>
          <Field id="login-email" label="Email" error={errors.email?.message}>
            <Input type="email" autoComplete="username" placeholder="you@store.test" autoFocus {...register("email")} />
          </Field>
        </motion.div>
        <motion.div variants={riseItem} className="grid gap-1.5">
          <Field id="login-password" label="Password" error={errors.password?.message}>
            <PasswordInput autoComplete="current-password" {...register("password")} />
          </Field>
        </motion.div>
        <motion.div variants={riseItem} className="flex items-center justify-between gap-2 text-sm">
          <label className="flex cursor-pointer select-none items-center gap-2">
            <input type="checkbox" className="h-4 w-4 rounded border-input accent-primary" {...register("remember")} />
            Keep me signed in
          </label>
          <a
            href={`#/forgot-password${email ? `?email=${encodeURIComponent(email)}` : ""}`}
            className="rounded font-medium text-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Forgot password?
          </a>
        </motion.div>
        <motion.div variants={riseItem} className="pt-1">
          <SubmitButton state={state}>Sign in</SubmitButton>
        </motion.div>
      </form>

      {DEMO_ACCOUNTS && (
        <motion.p variants={riseItem} className="mt-6 text-center text-xs text-muted-foreground">
          Seeded password for every role: <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-foreground">{DEMO_ACCOUNTS.password}</code>
        </motion.p>
      )}
    </motion.div>
  );
}
