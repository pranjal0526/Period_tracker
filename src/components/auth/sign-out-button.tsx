"use client";

import { LogOut } from "lucide-react";
import { signOut } from "next-auth/react";
import { Button, type ButtonProps } from "@/components/ui/button";

type SignOutButtonProps = {
  className?: string;
  variant?: ButtonProps["variant"];
};

export function SignOutButton({
  className,
  variant = "ghost",
}: SignOutButtonProps) {
  return (
    <Button
      variant={variant}
      onClick={() => signOut({ callbackUrl: "/" })}
      className={className}
    >
      <LogOut className="mr-2 size-4" />
      Sign out
    </Button>
  );
}
