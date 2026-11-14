import { useEffect, useState } from "react";

/** Reads CSS custom properties (e.g. "--accent") and refreshes when the theme changes. */
export function useTokenColors<T extends string>(names: readonly T[]): Record<T, string> {
  const key = names.join("|");
  const read = () => {
    const style = getComputedStyle(document.documentElement);
    return Object.fromEntries(names.map((name) => [name, style.getPropertyValue(name).trim()])) as Record<T, string>;
  };
  const [colors, setColors] = useState<Record<T, string>>(() => Object.fromEntries(names.map((name) => [name, ""])) as Record<T, string>);

  useEffect(() => {
    const update = () => setColors(read());
    update();
    window.addEventListener("rusen-theme-change", update);
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme", "class"] });
    return () => {
      window.removeEventListener("rusen-theme-change", update);
      observer.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return colors;
}
