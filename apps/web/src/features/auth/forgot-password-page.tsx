import { zodResolver } from "@hookform/resolvers/zod";
import { forgotPasswordSchema, type ForgotPasswordInput } from "@repo/shared";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Link2, MailCheck } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { authFacade } from "@/facades/auth.facade";
import { fluid, riseItem, stagger } from "@/lib/motion";
import { FormAlert, SubmitButton, type SubmitState } from "./auth-ui";

export const BackToSignIn = () => (
  <a
    href="#/login"
    className="group inline-flex items-center gap-1.5 rounded text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
  >
    <ArrowLeft className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-0.5" aria-hidden />
    Back to sign in
  </a>
);

export function ForgotPasswordPage({ initialEmail = "" }: { initialEmail?: string }) {
  const [state, setState] = useState<SubmitState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<{ email: string; resetUrl?: string } | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordInput>({ resolver: zodResolver(forgotPasswordSchema), defaultValues: { email: initialEmail } });

  const onSubmit = handleSubmit(async (input) => {
    setError(null);
    setState("loading");
    try {
      const { resetUrl } = await authFacade.requestReset(input);
      setSent({ email: input.email, resetUrl });
    } catch (e) {
      setError(e instanceof Error ? e.message : "The request failed. Try again.");
    } finally {
      setState("idle");
    }
  });

  return (
    <AnimatePresence mode="wait" initial={false}>
      {!sent ? (
        <motion.div key="form" variants={stagger()} initial="hidden" animate="shown" exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.15 } }}>
          <motion.header variants={riseItem} className="mb-6 space-y-1.5">
            <h1 className="text-2xl font-semibold">Reset your password</h1>
            <p className="text-sm text-muted-foreground">Enter the email for your account. We will send you a link to set a new password.</p>
          </motion.header>
          <form onSubmit={onSubmit} noValidate className="space-y-4">
            <FormAlert message={error} />
            <motion.div variants={riseItem}>
              <Field id="forgot-email" label="Email" error={errors.email?.message}>
                <Input type="email" autoComplete="email" placeholder="you@store.test" autoFocus {...register("email")} />
              </Field>
            </motion.div>
            <motion.div variants={riseItem} className="pt-1">
              <SubmitButton state={state}>Send reset link</SubmitButton>
            </motion.div>
          </form>
          <motion.div variants={riseItem} className="mt-6 text-center">
            <BackToSignIn />
          </motion.div>
        </motion.div>
      ) : (
        <motion.div key="sent" variants={stagger(0.07, 0.1)} initial="hidden" animate="shown" className="text-center">
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ ...fluid, bounce: 0.35 }}
            className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
          >
            <MailCheck className="h-6 w-6" aria-hidden />
          </motion.div>
          <motion.h1 variants={riseItem} className="text-2xl font-semibold">
            Check your inbox
          </motion.h1>
          <motion.p variants={riseItem} className="mt-2 text-sm text-muted-foreground" role="status">
            If <span className="font-medium text-foreground">{sent.email}</span> has an account, a reset link is on its way. The link expires in 30 minutes.
          </motion.p>

          {/* Only a development API returns the link (there is no mail service yet). */}
          {sent.resetUrl && (
            <motion.div variants={riseItem} className="mt-6 rounded-lg border border-dashed p-4 text-left">
              <p className="text-xs font-medium text-muted-foreground">Development: the API returned the link instead of sending an email</p>
              <Button asChild variant="outline" size="sm" className="mt-3 w-full">
                <a href={sent.resetUrl}>
                  <Link2 className="h-4 w-4" aria-hidden /> Open the reset link
                </a>
              </Button>
            </motion.div>
          )}

          <motion.div variants={riseItem} className="mt-6 flex flex-col items-center gap-3">
            <button type="button" onClick={() => setSent(null)} className="rounded text-sm font-medium underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              Use a different email
            </button>
            <BackToSignIn />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
