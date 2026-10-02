import { zodResolver } from "@hookform/resolvers/zod";
import { resetPasswordSchema, type ResetPasswordInput } from "@repo/shared";
import { AnimatePresence, motion, useAnimate } from "framer-motion";
import { LinkIcon } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { authFacade } from "@/facades/auth.facade";
import { riseItem, shakeKeyframes, shakeTransition, stagger } from "@/lib/motion";
import { AnimatedCheck, FormAlert, PasswordInput, PasswordStrength, SubmitButton, type SubmitState } from "./auth-ui";
import { BackToSignIn } from "./forgot-password-page";

export function ResetPasswordPage({ token }: { token: string }) {
  const [state, setState] = useState<SubmitState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [formRef, animate] = useAnimate<HTMLFormElement>();
  const shakeForm = () => void animate(formRef.current, shakeKeyframes, shakeTransition);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitted },
  } = useForm<ResetPasswordInput>({ resolver: zodResolver(resetPasswordSchema), defaultValues: { token, password: "", confirm: "" } });
  const password = watch("password");

  const onSubmit = handleSubmit(async (input) => {
    setError(null);
    setState("loading");
    try {
      await authFacade.resetPassword(input);
      setState("success");
      setTimeout(() => setDone(true), 450);
    } catch (e) {
      setState("idle");
      setError(e instanceof Error ? e.message : "The password was not changed. Try again.");
      shakeForm();
    }
  }, shakeForm);

  if (!token) {
    return (
      <motion.div variants={stagger()} initial="hidden" animate="shown" className="text-center">
        <motion.div variants={riseItem} className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
          <LinkIcon className="h-6 w-6 text-muted-foreground" aria-hidden />
        </motion.div>
        <motion.h1 variants={riseItem} className="text-2xl font-semibold">
          This link is not complete
        </motion.h1>
        <motion.p variants={riseItem} className="mt-2 text-sm text-muted-foreground">
          Open the full link from your email, or ask for a new one.
        </motion.p>
        <motion.div variants={riseItem} className="mt-6 flex flex-col items-center gap-3">
          <Button asChild className="w-full">
            <a href="#/forgot-password">Get a new link</a>
          </Button>
          <BackToSignIn />
        </motion.div>
      </motion.div>
    );
  }

  return (
    <AnimatePresence mode="wait" initial={false}>
      {!done ? (
        <motion.div key="form" variants={stagger()} initial="hidden" animate="shown" exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.15 } }}>
          <motion.header variants={riseItem} className="mb-6 space-y-1.5">
            <h1 className="text-2xl font-semibold">Set a new password</h1>
            <p className="text-sm text-muted-foreground">Use a password that you do not use on other sites.</p>
          </motion.header>
          <form ref={formRef} onSubmit={onSubmit} noValidate className="space-y-4">
            <FormAlert message={error ?? errors.token?.message} />
            <motion.div variants={riseItem} className="space-y-3">
              {/* The checklist is the guidance, so only show the error text after a submit. */}
              <Field id="reset-password" label="New password" error={isSubmitted ? errors.password?.message : undefined}>
                <PasswordInput autoComplete="new-password" autoFocus {...register("password")} />
              </Field>
              <PasswordStrength id="reset-strength" value={password} />
            </motion.div>
            <motion.div variants={riseItem}>
              <Field id="reset-confirm" label="Confirm new password" error={errors.confirm?.message}>
                <PasswordInput autoComplete="new-password" {...register("confirm")} />
              </Field>
            </motion.div>
            <motion.div variants={riseItem} className="pt-1">
              <SubmitButton state={state}>Update password</SubmitButton>
            </motion.div>
          </form>
          <motion.div variants={riseItem} className="mt-6 text-center">
            <BackToSignIn />
          </motion.div>
        </motion.div>
      ) : (
        <motion.div key="done" variants={stagger(0.07, 0.35)} initial="hidden" animate="shown" className="text-center">
          <AnimatedCheck className="mx-auto mb-5" />
          <motion.h1 variants={riseItem} className="text-2xl font-semibold">
            Password updated
          </motion.h1>
          <motion.p variants={riseItem} className="mt-2 text-sm text-muted-foreground" role="status">
            You can now sign in with your new password.
          </motion.p>
          <motion.div variants={riseItem} className="mt-6">
            <Button asChild className="w-full">
              <a href="#/login">Sign in</a>
            </Button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
