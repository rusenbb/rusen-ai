/**
 * Consistent loading spinner component.
 * Replaces inline SVG spinners across all demos.
 */

interface SpinnerProps {
  /** Size variant */
  size?: "sm" | "md" | "lg";
  /** Color variant - defaults to blue (accent color) */
  color?: "blue" | "white" | "neutral";
  /** Additional CSS classes */
  className?: string;
}

const sizeClasses = {
  sm: "w-4 h-4 border-2",
  md: "w-5 h-5 border-2",
  lg: "w-6 h-6 border-[3px]",
};

const colorClasses = {
  blue: "border-blue-600 border-t-transparent",
  white: "border-white border-t-transparent",
  neutral: "border-neutral-600 border-t-transparent dark:border-neutral-400",
};

/**
 * Loading spinner with consistent styling.
 *
 * @example
 * ```tsx
 * <Spinner />
 * <Spinner size="lg" color="white" />
 * ```
 */
export function Spinner({ size = "md", color = "blue", className = "" }: SpinnerProps) {
  return (
    <div
      className={`rounded-full animate-spin ${sizeClasses[size]} ${colorClasses[color]} ${className}`}
      role="status"
      aria-label="Loading"
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
}
