"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-full text-sm font-semibold transition-all disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--ring)] ring-offset-transparent",
  {
    variants: {
      variant: {
        default:
          "bg-primary px-5 py-3 text-primary-foreground shadow-[0_16px_30px_rgba(227,112,77,0.28)] hover:-translate-y-0.5 hover:bg-[#cf633f]",
        secondary:
          "bg-secondary px-5 py-3 text-white shadow-[0_16px_30px_rgba(13,125,121,0.24)] hover:-translate-y-0.5 hover:bg-[#0a6864]",
        ghost:
          "bg-transparent px-4 py-3 text-foreground hover:bg-card-strong",
        outline:
          "border border-line bg-card px-4 py-3 text-foreground hover:bg-card-strong",
      },
      size: {
        default: "h-11",
        sm: "h-9 px-3 text-xs",
        lg: "h-12 px-6 text-base",
        icon: "size-10 rounded-full",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";

    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
