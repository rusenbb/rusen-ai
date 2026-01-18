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
      <div className="flex items-start justify-between mb-2">
        <h3 className={`font-semibold text-lg ${isLive ? "group-hover:opacity-80" : ""} transition`}>{title}</h3>
        {status === "coming-soon" && (
          <span className="text-xs px-2 py-1 bg-neutral-100 dark:bg-neutral-800 rounded">Soon</span>
        )}
        {status === "live" && (
          <span className="text-xs px-2 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded">Live</span>
        )}
      </div>
      <p className="text-neutral-600 dark:text-neutral-400 text-sm mb-3">{description}</p>
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <span key={tag} className="text-xs px-2 py-1 bg-neutral-100 dark:bg-neutral-800 rounded">
              {tag}
            </span>
          ))}
        </div>
      )}
    </>
  );

  // Don't make coming-soon items clickable - prevents 404 prefetch errors
  if (!isLive) {
    return (
      <div className="block p-6 border border-neutral-200 dark:border-neutral-800 rounded-lg opacity-60 cursor-not-allowed">
        {content}
      </div>
    );
  }

  return (
    <Link
      href={href}
      className="block p-6 border border-neutral-200 dark:border-neutral-800 rounded-lg hover:border-neutral-400 dark:hover:border-neutral-600 transition group"
    >
      {content}
    </Link>
  );
}
