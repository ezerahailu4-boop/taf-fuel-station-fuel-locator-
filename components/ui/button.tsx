import * as React from "react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "brand" | "outline" | "secondary" | "ghost" | "destructive";
  size?: "default" | "sm" | "lg" | "icon";
}

export function Button({
  className = "",
  variant = "default",
  size = "default",
  ...props
}: ButtonProps) {
  const variantStyles = {
    default:
      "bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200 shadow-sm",
    brand:
      "bg-brand-orange text-neutral-950 font-bold hover:brightness-105 active:scale-[0.98] shadow-sm",
    outline:
      "border border-border/80 bg-transparent hover:bg-neutral-100 dark:hover:bg-neutral-800 text-foreground",
    secondary:
      "bg-neutral-100 text-neutral-900 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-100 dark:hover:bg-neutral-700",
    ghost: "hover:bg-neutral-100 dark:hover:bg-neutral-800 text-foreground",
    destructive: "bg-red-600 text-white hover:bg-red-700 shadow-sm",
  };

  const sizeStyles = {
    default: "h-9 px-4 py-2 text-xs",
    sm: "h-8 rounded-lg px-3 text-xs",
    lg: "h-11 rounded-xl px-6 text-sm",
    icon: "h-9 w-9 p-0",
  };

  return (
    <button
      className={`inline-flex items-center justify-center gap-1.5 rounded-xl font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange disabled:pointer-events-none disabled:opacity-50 cursor-pointer ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      {...props}
    />
  );
}
