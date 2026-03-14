import NotFoundGridBackground from "./NotFoundGridBackground";
import NotFoundPageFlags from "./NotFoundPageFlags";
import NotFoundTypewriter from "./NotFoundTypewriter";

export default function NotFoundExperience() {
  return (
    <>
      <NotFoundPageFlags />
      <section className="relative isolate min-h-[calc(100vh-4.5rem)] overflow-hidden">
        <NotFoundGridBackground />
        <NotFoundTypewriter />
        <h1 className="sr-only">404 page not found</h1>
      </section>
    </>
  );
}
