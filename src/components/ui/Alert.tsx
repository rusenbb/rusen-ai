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

const variantStyles: Record<
  AlertVariant,
  { bg: string; border: string; text: string; icon: ReactNode }
> = {
  error: {
    bg: "bg-red-50 dark:bg-red-900/20",
    border: "border-red-200 dark:border-red-800",
    text: "text-red-600 dark:text-red-400",
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
    bg: "bg-green-50 dark:bg-green-900/20",
    border: "border-green-200 dark:border-green-800",
    text: "text-green-600 dark:text-green-400",
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
    bg: "bg-yellow-50 dark:bg-yellow-900/20",
    border: "border-yellow-200 dark:border-yellow-800",
    text: "text-yellow-600 dark:text-yellow-400",
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
    bg: "bg-blue-50 dark:bg-blue-900/20",
    border: "border-blue-200 dark:border-blue-800",
    text: "text-blue-600 dark:text-blue-400",
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
      className={`p-4 ${styles.bg} border ${styles.border} rounded-lg ${className}`}
      role="alert"
    >
      <div className="flex items-start gap-3">
        <span className={`shrink-0 mt-0.5 ${styles.text}`}>
          {icon || styles.icon}
        </span>
        <div className="flex-1 min-w-0">
          {title && (
            <h3 className={`text-sm font-semibold ${styles.text} mb-1`}>
              {title}
            </h3>
          )}
          <div className={`text-sm ${styles.text}`}>{children}</div>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className={`shrink-0 ${styles.text} hover:opacity-70 transition-opacity`}
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
