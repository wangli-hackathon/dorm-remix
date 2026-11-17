import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "../../lib/utils.ts";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[1.1rem_0.45rem_1rem_0.4rem] text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-persimmon disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-persimmon text-paper hover:bg-persimmon-deep",
        ink: "bg-ink text-paper hover:bg-soot",
        ghost: "bg-transparent text-ink hover:bg-ink/5",
        paper: "border border-ink/15 bg-paper text-ink hover:bg-paper-deep",
      },
      size: {
        default: "h-11 px-4 py-2",
        sm: "h-9 px-3",
        lg: "h-12 px-6 text-base",
        icon: "h-11 w-11",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export function Button({
  className,
  variant,
  size,
  asChild = false,
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "button";
  return <Comp className={cn(buttonVariants({ variant, size }), className)} type={asChild ? undefined : type} {...props} />;
}
