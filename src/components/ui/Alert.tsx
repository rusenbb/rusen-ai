/**
 * Consistent alert component for messages and notifications.
 * Replaces inline error/success/warning alerts across all demos.
 */

import { type ReactNode } from "react";

type AlertVariant = "error" | "success" | "warning" | "info";

interface AlertProps {
  /** Visual variant */
  variant: AlertVariant;
  /** Alert content */
  children: ReactNode;
  /** Optional title */
  title?: string;
  /** Optional icon (defaults to variant-specific icon) */
  icon?: ReactNode;
  /** Additional CSS classes */
  className?: string;
  /** Optional onDismiss callback */
  onDismiss?: () => void;
}

// Severity stays readable through the icon color + a 2px left accent bar.
// Body sits on the neutral surface so alerts feel like part of the terminal
// aesthetic rather than colored billboards.
const variantStyles: Record<
  AlertVariant,
  { accent: string; iconColor: string; titleColor: string; icon: ReactNode }
> = {
  error: {
    accent: "border-l-red-600 dark:border-l-red-400",
    iconColor: "text-red-600 dark:text-red-400",
    titleColor: "text-red-700 dark:text-red-300",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
  },
  success: {
    accent: "border-l-green-600 dark:border-l-green-400",
    iconColor: "text-green-600 dark:text-green-400",
    titleColor: "text-green-700 dark:text-green-300",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M5 13l4 4L19 7"
        />
      </svg>
    ),
  },
  warning: {
    accent: "border-l-yellow-600 dark:border-l-yellow-400",
    iconColor: "text-yellow-600 dark:text-yellow-400",
    titleColor: "text-yellow-700 dark:text-yellow-300",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
        />
      </svg>
    ),
  },
  info: {
    accent: "border-l-blue-600 dark:border-l-blue-400",
    iconColor: "text-blue-600 dark:text-blue-400",
    titleColor: "text-blue-700 dark:text-blue-300",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
  },
};

/**
 * Alert component for displaying messages with consistent styling.
 *
 * @example
 * ```tsx
 * <Alert variant="error">Something went wrong</Alert>
 * <Alert variant="success" title="Success!">Your changes have been saved.</Alert>
 * <Alert variant="info" onDismiss={() => setShow(false)}>New feature available</Alert>
 * ```
 */
export function Alert({
  variant,
  children,
  title,
  icon,
  className = "",
  onDismiss,
}: AlertProps) {
  const styles = variantStyles[variant];

  return (
    <div
      className={`p-4 bg-[var(--surface)] border border-[var(--line)] border-l-2 ${styles.accent} ${className}`}
      role="alert"
    >
      <div className="flex items-start gap-3">
        <span className={`shrink-0 mt-0.5 ${styles.iconColor}`}>
          {icon || styles.icon}
        </span>
        <div className="flex-1 min-w-0">
          {title && (
            <h3 className={`text-sm font-mono font-semibold uppercase tracking-[0.08em] ${styles.titleColor} mb-1`}>
              {title}
            </h3>
          )}
          <div className="text-sm text-[var(--muted)]">{children}</div>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="shrink-0 text-[var(--sub)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
            aria-label="Dismiss"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
