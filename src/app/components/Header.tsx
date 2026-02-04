import Link from "next/link";

export default function Header() {
  return (
    <header className="border-b border-neutral-200 dark:border-neutral-800">
      <nav className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold hover:opacity-80 transition">
          rusen.ai
        </Link>
        <div className="flex gap-6">
          <Link href="/demos" className="hover:opacity-80 transition">
            Demos
          </Link>
          <Link href="/nerdy-stuff" className="hover:opacity-80 transition">
            Nerdy Stuff
          </Link>
          <Link href="/cv" className="hover:opacity-80 transition">
            CV
          </Link>
        </div>
      </nav>
    </header>
  );
}
