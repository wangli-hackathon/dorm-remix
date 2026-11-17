import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cn } from "../../lib/utils.ts";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "flex h-11 w-full rounded-xl border border-ink/15 bg-paper px-3 text-base text-ink shadow-inner shadow-ink/5 outline-none placeholder:text-soot/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-persimmon",
        className,
      )}
      {...props}
    />
  );
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "min-h-24 w-full rounded-xl border border-ink/15 bg-paper px-3 py-2 text-base text-ink shadow-inner shadow-ink/5 outline-none placeholder:text-soot/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-persimmon",
        className,
      )}
      {...props}
    />
  );
}
