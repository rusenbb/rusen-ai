/**
 * Empty state component for when there's no content to display.
 * Provides consistent placeholder styling across all demos.
 */

import { type ReactNode } from "react";
import { Button } from "./Button";

interface EmptyStateProps {
  /** Main message */
  title: string;
  /** Optional description */
  description?: string;
  /** Optional icon */
  icon?: ReactNode;
  /** Optional action button */
  action?: {
    label: string;
    onClick: () => void;
  };
  /** Additional CSS classes */
  className?: string;
}

/**
 * Empty state component for placeholder content.
 *
 * @example
 * ```tsx
 * <EmptyState
 *   title="No results found"
 *   description="Try adjusting your search criteria"
 *   icon={<SearchIcon />}
 *   action={{ label: "Clear filters", onClick: clearFilters }}
 * />
 * ```
 */
export function EmptyState({
  title,
  description,
  icon,
  action,
  className = "",
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center py-12 px-4 text-center ${className}`}
    >
      {icon && (
        <div className="mb-4 text-neutral-400 dark:text-neutral-500">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-medium text-neutral-900 dark:text-neutral-100 mb-1">
        {title}
      </h3>
      {description && (
        <p className="text-sm text-neutral-500 dark:text-neutral-400 max-w-sm mb-4">
          {description}
        </p>
      )}
      {action && (
        <Button variant="secondary" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  );
}

/** Default icon for empty states */
export function EmptyStateIcon({ className = "w-12 h-12" }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
      />
    </svg>
  );
}
