import { type HTMLAttributes, type ReactNode } from "react";
import { Card, type CardPadding } from "./Card";

type DemoPageWidth = "lg" | "xl" | "2xl";

interface DemoPageProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  width?: DemoPageWidth;
}

interface DemoHeaderProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  title: ReactNode;
  description?: ReactNode;
  eyebrow?: ReactNode;
  actions?: ReactNode;
}

interface DemoPanelProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  children: ReactNode;
  title?: ReactNode;
  description?: ReactNode;
  footer?: ReactNode;
  padding?: CardPadding;
}

interface DemoMutedSectionProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  children: ReactNode;
  title?: ReactNode;
}

interface DemoFootnoteProps extends HTMLAttributes<HTMLParagraphElement> {
  children: ReactNode;
  align?: "left" | "center";
}

const widthClasses: Record<DemoPageWidth, string> = {
  lg: "max-w-5xl",
  xl: "max-w-6xl",
  "2xl": "max-w-7xl",
};

function cx(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(" ");
}

export function DemoPage({
  children,
  width = "xl",
  className,
  ...props
}: DemoPageProps) {
  return (
    <div
      className={cx(
        "mx-auto px-4 py-10 sm:py-12 md:py-16",
        widthClasses[width],
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function DemoHeader({
  title,
  description,
  eyebrow,
  actions,
  className,
  ...props
}: DemoHeaderProps) {
  return (
    <header
      className={cx(
        "mb-8 flex flex-col gap-4 sm:mb-10 lg:flex-row lg:items-end lg:justify-between",
        className,
      )}
      {...props}
    >
      <div className="min-w-0">
        {eyebrow && (
          <p className="mb-3 text-xs font-mono uppercase tracking-[0.2em] text-neutral-500 dark:text-neutral-400">
            {eyebrow}
          </p>
        )}
        <h1 className="text-3xl font-bold sm:text-4xl">{title}</h1>
        {description && (
          <p className="mt-3 max-w-3xl text-sm text-neutral-600 dark:text-neutral-400 sm:text-base">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="shrink-0">{actions}</div>}
    </header>
  );
}

export function DemoPanel({
  children,
  title,
  description,
  footer,
  padding = "lg",
  className,
  ...props
}: DemoPanelProps) {
  const header =
    title || description ? (
      <div>
        {title && (
          <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-neutral-700 dark:text-neutral-200">
            {title}
          </h2>
        )}
        {description && (
          <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
            {description}
          </p>
        )}
      </div>
    ) : undefined;

  return (
    <Card
      padding={padding}
      header={header}
      footer={footer}
      className={cx("rounded-xl", className)}
      {...props}
    >
      {children}
    </Card>
  );
}

export function DemoMutedSection({
  children,
  title,
  className,
  ...props
}: DemoMutedSectionProps) {
  return (
    <section
      className={cx(
        "rounded-xl border border-neutral-200/80 bg-neutral-50/90 p-6 dark:border-neutral-800 dark:bg-neutral-800/50",
        className,
      )}
      {...props}
    >
      {title && <h2 className="mb-3 text-lg font-semibold">{title}</h2>}
      {children}
    </section>
  );
}

export function DemoFootnote({
  children,
  align = "center",
  className,
  ...props
}: DemoFootnoteProps) {
  return (
    <p
      className={cx(
        "mt-4 text-xs text-neutral-500 dark:text-neutral-400",
        align === "center" ? "text-center" : "text-left",
        className,
      )}
      {...props}
    >
      {children}
    </p>
  );
}
