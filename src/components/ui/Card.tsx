/**
 * Consistent card/panel component.
 * Provides consistent border, background, and padding across all demos.
 */

import { type ReactNode, type HTMLAttributes, forwardRef } from "react";

type CardPadding = "none" | "sm" | "md" | "lg";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Card content */
  children: ReactNode;
  /** Padding variant */
  padding?: CardPadding;
  /** Optional header content */
  header?: ReactNode;
  /** Optional footer content */
  footer?: ReactNode;
  /** Remove border */
  noBorder?: boolean;
  /** Interactive card (adds hover effects) */
  interactive?: boolean;
}

const paddingClasses: Record<CardPadding, string> = {
  none: "",
  sm: "p-3",
  md: "p-4",
  lg: "p-6",
};

/**
 * Card component for consistent panel styling.
 *
 * @example
 * ```tsx
 * <Card>Basic card content</Card>
 * <Card padding="lg" header={<h2>Title</h2>}>Content with header</Card>
 * <Card interactive onClick={handleClick}>Clickable card</Card>
 * ```
 */
export const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  {
    children,
    padding = "md",
    header,
    footer,
    noBorder = false,
    interactive = false,
    className = "",
    ...props
  },
  ref
) {
  const borderClasses = noBorder
    ? ""
    : "border border-neutral-200 dark:border-neutral-800";
  const interactiveClasses = interactive
    ? "cursor-pointer hover:border-neutral-300 dark:hover:border-neutral-700 hover:shadow-sm transition-all"
    : "";

  return (
    <div
      ref={ref}
      className={`bg-white dark:bg-neutral-900 rounded-lg ${borderClasses} ${interactiveClasses} ${className}`}
      {...props}
    >
      {header && (
        <div className="px-4 py-3 border-b border-neutral-200 dark:border-neutral-800">
          {header}
        </div>
      )}
      <div className={paddingClasses[padding]}>{children}</div>
      {footer && (
        <div className="px-4 py-3 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50 rounded-b-lg">
          {footer}
        </div>
      )}
    </div>
  );
});

/**
 * Card header component for semantic structure.
 */
export function CardHeader({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex items-center justify-between mb-3 ${className}`}>
      {children}
    </div>
  );
}

/**
 * Card title component for consistent heading styling.
 */
export function CardTitle({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <h3 className={`text-lg font-semibold text-neutral-900 dark:text-neutral-100 ${className}`}>
      {children}
    </h3>
  );
}
