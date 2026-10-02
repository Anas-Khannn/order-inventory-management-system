import { zodResolver } from "@hookform/resolvers/zod";
import { signupSchema, type SignupInput } from "@repo/shared";
import { motion, useAnimate } from "framer-motion";
import { Info } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ApiError } from "@/lib/http";
import { riseItem, shakeKeyframes, shakeTransition, stagger } from "@/lib/motion";
import { useAuth } from "./auth-provider";
import { FormAlert, PasswordInput, PasswordStrength, SubmitButton, type SubmitState } from "./auth-ui";

export function SignupPage({ onSignedIn }: { onSignedIn: () => void }) {
  const { signup, commit } = useAuth();
  const [state, setState] = useState<SubmitState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [formRef, animate] = useAnimate<HTMLFormElement>();
  const shakeForm = () => void animate(formRef.current, shakeKeyframes, shakeTransition);

  const {
    register,
    handleSubmit,
    watch,
    setError: setFieldError,
    setFocus,
    formState: { errors, isSubmitted },
  } = useForm<SignupInput>({ resolver: zodResolver(signupSchema), defaultValues: { name: "", email: "", password: "", confirm: "" } });
  const password = watch("password");

  const onSubmit = handleSubmit(async (input) => {
    setError(null);
    setState("loading");
    try {
      const session = await signup(input);
      setState("success");
      // Let the check mark land before the console replaces this page.
      setTimeout(() => {
        onSignedIn();
        commit(session);
      }, 550);
    } catch (e) {
      setState("idle");
      if (e instanceof ApiError && e.code === "EMAIL_TAKEN") {
        // Show it on the field it belongs to, not as a general error.
        setFieldError("email", { message: "This email already has an account. Sign in instead." });
        setFocus("email");
      } else {
        setError(e instanceof Error ? e.message : "The account was not created. Try again.");
      }
      shakeForm();
    }
  }, shakeForm);

  return (
    <motion.div variants={stagger()} initial="hidden" animate="shown">
      <motion.header variants={riseItem} className="mb-6 space-y-1.5">
        <h1 className="text-2xl font-semibold">Create your account</h1>
        <p className="text-sm text-muted-foreground">Start taking orders in a minute.</p>
      </motion.header>

      <form ref={formRef} onSubmit={onSubmit} noValidate className="space-y-4">
        <FormAlert message={error} />
        <motion.div variants={riseItem}>
          <Field id="signup-name" label="Full name" error={errors.name?.message}>
            <Input autoComplete="name" placeholder="Ayesha Malik" autoFocus {...register("name")} />
          </Field>
        </motion.div>
        <motion.div variants={riseItem}>
          <Field id="signup-email" label="Email" error={errors.email?.message}>
            <Input type="email" autoComplete="email" placeholder="you@store.test" {...register("email")} />
          </Field>
        </motion.div>
        <motion.div variants={riseItem} className="space-y-3">
          {/* The checklist is the guidance, so only show the error text after a submit. */}
          <Field id="signup-password" label="Password" error={isSubmitted ? errors.password?.message : undefined}>
            <PasswordInput autoComplete="new-password" {...register("password")} />
          </Field>
          <PasswordStrength value={password} />
        </motion.div>
        <motion.div variants={riseItem}>
          <Field id="signup-confirm" label="Confirm password" error={errors.confirm?.message}>
            <PasswordInput autoComplete="new-password" {...register("confirm")} />
          </Field>
        </motion.div>
        <motion.p variants={riseItem} className="flex items-start gap-2 rounded-md bg-muted/60 px-3 py-2.5 text-xs text-muted-foreground">
          <Info className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden />
          New accounts start with the Staff role: you can view stock and create orders.
        </motion.p>
        <motion.div variants={riseItem} className="pt-1">
          <SubmitButton state={state}>Create account</SubmitButton>
        </motion.div>
      </form>

      <motion.p variants={riseItem} className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <a href="#/login" className="rounded font-medium text-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          Sign in
        </a>
      </motion.p>
    </motion.div>
  );
}
