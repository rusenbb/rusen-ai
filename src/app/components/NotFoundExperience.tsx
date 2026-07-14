import NotFoundPageFlags from "./NotFoundPageFlags";
import NotFoundTypewriter from "./NotFoundTypewriter";

export default function NotFoundExperience() {
  return (
    <>
      <NotFoundPageFlags />
      <section className="relative isolate flex min-h-[calc(100vh-4.5rem)] flex-col items-center overflow-hidden px-6 pt-16 sm:pt-24 md:pt-32">
        {/* Anchor for the AsciiDataBackground "404" pulse - the bg centers
            the letters vertically on this element. Keeping the anchor in
            the upper third leaves room for the typewriter to flow below. */}
        <div
          data-bg-anchor="data"
          aria-hidden="true"
          className="h-32 w-full sm:h-40 md:h-48"
        />
        <NotFoundTypewriter />
        <h1 className="sr-only">404 page not found</h1>
      </section>
    </>
  );
}
