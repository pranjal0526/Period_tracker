"use client";

import { signIn } from "next-auth/react";
import { FcGoogle } from "react-icons/fc";
import { Button } from "@/components/ui/button";

type SignInButtonProps = {
  callbackUrl?: string;
  label?: string;
  variant?: "default" | "secondary" | "ghost" | "outline";
  modeIntent?: "user" | "partner";
};

export function SignInButton({
  callbackUrl = "/dashboard",
  label = "Continue with Google",
  variant = "default",
  modeIntent = "user",
}: SignInButtonProps) {
  return (
    <Button
      className="w-full"
      size="lg"
      variant={variant}
      onClick={() => {
        document.cookie = `ember-mode=${modeIntent}; Path=/; SameSite=Lax; Max-Age=${60 * 60 * 24 * 365}`;
        signIn("google", { callbackUrl });
      }}
    >
      <FcGoogle className="mr-3 size-5" />
      {label}
    </Button>
  );
}
