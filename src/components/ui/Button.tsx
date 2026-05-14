/**
 * Consistent button component with variants.
 * Replaces inline button styling across all demos.
 */

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { Spinner } from "./Spinner";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "success";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual variant */
  variant?: ButtonVariant;
  /** Size variant */
  size?: ButtonSize;
  /** Show loading spinner and disable interactions */
  loading?: boolean;
  /** Icon to show before children */
  icon?: ReactNode;
  /** Icon to show after children */
  iconRight?: ReactNode;
  /** Full width button */
  fullWidth?: boolean;
}

const baseClasses =
  "inline-flex items-center justify-center gap-2 font-mono font-semibold uppercase tracking-[0.06em] border transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-neutral-500 disabled:opacity-50 disabled:cursor-not-allowed";

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "border-foreground bg-foreground text-background hover:bg-transparent hover:text-foreground",
  secondary:
    "border-foreground bg-transparent text-foreground hover:bg-foreground hover:text-background",
  ghost:
    "border-transparent bg-transparent text-neutral-600 dark:text-neutral-400 hover:text-foreground hover:bg-neutral-100 dark:hover:bg-neutral-800",
  danger:
    "border-foreground bg-transparent text-foreground hover:bg-foreground hover:text-background",
  success:
    "border-foreground bg-transparent text-foreground hover:bg-foreground hover:text-background",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-4 py-2 text-xs",
  lg: "px-6 py-3 text-sm",
};

/**
 * Button component with consistent styling and loading state.
 *
 * @example
 * ```tsx
 * <Button>Click me</Button>
 * <Button variant="secondary" size="sm">Cancel</Button>
 * <Button variant="primary" loading>Submitting...</Button>
 * <Button icon={<PlusIcon />}>Add item</Button>
 * ```
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = "secondary",
    size = "md",
    loading = false,
    icon,
    iconRight,
    fullWidth = false,
    disabled,
    children,
    className = "",
    ...props
  },
  ref
) {
  const isDisabled = disabled || loading;

  return (
    <button
      ref={ref}
      disabled={isDisabled}
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${fullWidth ? "w-full" : ""} ${className}`}
      {...props}
    >
      {loading ? (
        <Spinner size="sm" color="currentColor" />
      ) : icon ? (
        <span className="shrink-0">{icon}</span>
      ) : null}
      {children}
      {iconRight && !loading && <span className="shrink-0">{iconRight}</span>}
    </button>
  );
});
