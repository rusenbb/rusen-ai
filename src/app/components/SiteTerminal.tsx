"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

type CommandResult = {
  ok: boolean;
  message: string;
};

const DEMOS = [
  { key: "classify-anything", name: "Classify Anything", desc: "Zero-shot text classification in the browser." },
  { key: "pulse-board", name: "Pulse Board", desc: "Live multi-signal dashboard (crypto, weather, quakes, etc.)." },
];

const NERDY_PROJECTS = [
  { key: "game-of-life", name: "Game of Life Background Lab", desc: "Interactive cellular automata world and camera controls." },
  { key: "embedding-explorer", name: "Embedding Explorer", desc: "Visual semantic geometry with embedding vectors + UMAP." },
  { key: "optimization", name: "Optimization", desc: "Unified optimization lab for gradient descent, black-box search, and high-dimensional intuition." },
  { key: "rusenizer", name: "Rusenizer", desc: "Turkish-focused tokenizer experimentation playground." },
];

export default function SiteTerminal() {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [platformIsMac] = useState(() => {
    if (typeof navigator === "undefined") return false;
    const platform = navigator.platform ?? "";
    return /mac|iphone|ipad|ipod/i.test(platform);
  });
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("Type 'help' for available commands.");
  const inputRef = useRef<HTMLInputElement>(null);
  const cmdSequenceRef = useRef("");
  const cmdSequenceTimeRef = useRef(0);

  useEffect(() => {
    if (!open) return;
    const id = window.setTimeout(() => inputRef.current?.focus(), 10);
    return () => window.clearTimeout(id);
  }, [open]);

  useEffect(() => {
    const onOpen = () => setOpen(true);

    const onKeyDown = (e: KeyboardEvent) => {
      const isPalette = (e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "p";
      if (isPalette) {
        setOpen(true);
        e.preventDefault();
        return;
      }

      if (open) {
        if (e.key === "Escape") {
          setOpen(false);
          e.preventDefault();
        }
        return;
      }

      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) {
        return;
      }
      if (e.key.length !== 1 || !/[a-z]/i.test(e.key)) return;

      const now = performance.now();
      if (now - cmdSequenceTimeRef.current > 1200) {
        cmdSequenceRef.current = "";
      }
      cmdSequenceTimeRef.current = now;
      cmdSequenceRef.current = (cmdSequenceRef.current + e.key.toLowerCase()).slice(-3);

      if (cmdSequenceRef.current === "cmd") {
        setOpen(true);
        cmdSequenceRef.current = "";
        e.preventDefault();
      }
    };

    window.addEventListener("open-site-terminal", onOpen as EventListener);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("open-site-terminal", onOpen as EventListener);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const runCommand = (raw: string): CommandResult => {
    const cmd = raw.trim().toLowerCase();
    if (!cmd) return { ok: false, message: "Empty command." };

    if (cmd === "help") {
      return {
        ok: true,
        message:
          "Commands: help, status, go home|demos|nerdy|cv|life, list pages, list demos, list nerdy, describe <project-key>, close",
      };
    }

    if (cmd === "status") {
      return { ok: true, message: `path:${pathname}` };
    }

    const goMatch = cmd.match(/^go\s+(home|demos|nerdy|cv|life)$/);
    if (goMatch) {
      const target = goMatch[1];
      if (target === "home") router.push("/");
      if (target === "demos") router.push("/demos");
      if (target === "nerdy") router.push("/nerdy-stuff");
      if (target === "cv") router.push("/cv");
      if (target === "life") router.push("/game-of-life");
      return { ok: true, message: `Navigating to ${target}.` };
    }

    if (cmd === "open life") {
      router.push("/game-of-life");
      return { ok: true, message: "Navigating to life." };
    }

    if (cmd === "list pages") {
      return { ok: true, message: "Pages: /, /demos, /nerdy-stuff, /cv, /game-of-life" };
    }

    if (cmd === "list demos") {
      return { ok: true, message: DEMOS.map((d) => `${d.key}: ${d.name}`).join(" | ") };
    }

    if (cmd === "list nerdy") {
      return { ok: true, message: NERDY_PROJECTS.map((p) => `${p.key}: ${p.name}`).join(" | ") };
    }

    const describeMatch = cmd.match(/^describe\s+([a-z0-9-]+)$/);
    if (describeMatch) {
      const key = describeMatch[1];
      const found = [...DEMOS, ...NERDY_PROJECTS].find((item) => item.key === key);
      if (!found) {
        return { ok: false, message: `No project found for key: ${key}` };
      }
      return { ok: true, message: `${found.name}: ${found.desc}` };
    }

    if (cmd === "close" || cmd === "exit") {
      setOpen(false);
      return { ok: true, message: "Closed." };
    }

    return { ok: false, message: `Unknown command: ${raw}` };
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[120] bg-black/40 backdrop-blur-[2px] flex items-center justify-center p-4">
      <div className="w-full max-w-2xl rounded-lg border border-neutral-300/70 dark:border-neutral-700/70 bg-white/90 dark:bg-neutral-900/90 shadow-2xl">
        <div className="px-3 py-2 border-b border-neutral-300/60 dark:border-neutral-700/60 text-xs font-mono text-neutral-600 dark:text-neutral-300">
          site-terminal
        </div>
        <div className="px-3 pt-3 text-xs font-mono text-neutral-700 dark:text-neutral-200">{output}</div>
        <form
          className="p-3"
          onSubmit={(e) => {
            e.preventDefault();
            const res = runCommand(input);
            setOutput(res.message);
            setInput("");
          }}
        >
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="help"
            className="w-full rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 px-2 py-1.5 text-xs font-mono text-neutral-800 dark:text-neutral-100 outline-none focus:ring-1 focus:ring-neutral-500"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
          />
        </form>
        <div className="px-3 pb-3 text-[10px] text-neutral-500 dark:text-neutral-400">
          {platformIsMac ? "Cmd+Shift+P" : "Ctrl+Shift+P"} or type <span className="font-mono">cmd</span>. Esc to close.
        </div>
      </div>
    </div>
  );
}
