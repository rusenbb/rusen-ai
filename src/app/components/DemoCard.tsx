import Link from "next/link";

interface DemoCardProps {
  title: string;
  description: string;
  href: string;
  tags?: string[];
  status?: "live" | "coming-soon";
}

export default function DemoCard({ title, description, href, tags = [], status = "coming-soon" }: DemoCardProps) {
  const isLive = status === "live";

  const content = (
    <>
      <div className="flex items-start justify-between gap-3 mb-2">
        <h3 className={`font-semibold text-base sm:text-lg ${isLive ? "group-hover:opacity-80" : ""} transition`}>{title}</h3>
        {status === "coming-soon" && (
          <span className="term-tag shrink-0">SOON</span>
        )}
      </div>
      <p className="text-neutral-700 dark:text-neutral-400 text-sm leading-relaxed mb-3">{description}</p>
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {tags.map((tag) => (
            <span key={tag} className="term-tag">
              {tag}
            </span>
          ))}
        </div>
      )}
      {isLive && (
        <div className="term-status">
          <span className="signal-blip" aria-hidden="true" />
          LIVE
        </div>
      )}
    </>
  );

  if (!isLive) {
    return (
      <div className="term-card block opacity-70 cursor-not-allowed">
        {content}
      </div>
    );
  }

  return (
    <Link href={href} className="term-card block group">
      {content}
    </Link>
  );
}
