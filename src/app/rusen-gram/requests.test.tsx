import { readFileSync } from "node:fs";
import { webcrypto } from "node:crypto";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import RusenGram from "./page";
import type { Request, Response } from "./worker";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
it("keeps generation disabled until the newly selected corpus is trained", async () => {
  vi.stubGlobal("crypto", webcrypto);
  const file = (name: string) => ({
    ok: true,
    arrayBuffer: async () =>
      Uint8Array.from(readFileSync(`public/corpora/${name}.txt`)).buffer,
  });
  let release!: (value: ReturnType<typeof file>) => void;
  const pending = new Promise<ReturnType<typeof file>>((resolve) => {
    release = resolve;
  });
  vi.stubGlobal(
    "fetch",
    vi.fn((url: string) =>
      url.includes("alice") ? Promise.resolve(file("alice")) : pending,
    ),
  );
  // Simulate an asynchronous worker replying from its currently trained corpus.
  vi.stubGlobal(
    "Worker",
    class {
      onmessage: ((event: { data: Response }) => void) | null = null;
      onerror = null;
      tokenCount = 0;
      terminate() {}
      postMessage(request: Request) {
        if (request.action === "train")
          this.tokenCount = request.corpus.includes("Alice was beginning")
            ? 101
            : 202;
        const response: Response =
          request.action === "train"
            ? { id: request.id, ready: true }
            : {
                id: request.id,
                result: {
                  trace: [],
                  distribution: [],
                  total: 1,
                  denominator: 1,
                  tokenCount: this.tokenCount,
                  vocabularySize: 1,
                  uniformMass: 0,
                },
              };
        queueMicrotask(() => this.onmessage?.({ data: response }));
      }
    },
  );
  render(<RusenGram />);
  const generate = screen.getByRole("button", { name: "Generate 80 tokens" });
  await waitFor(() => expect(generate).toBeEnabled());
  fireEvent.click(
    screen.getByRole("button", { name: /Shakespeare’s Sonnets/ }),
  );
  await act(async () => {
    await Promise.resolve();
  });
  expect(generate).toBeDisabled();
  expect(screen.getByRole("status")).not.toHaveTextContent("101 tokens");
  await act(async () => {
    release(file("sonnets"));
  });
  await waitFor(() => expect(generate).toBeEnabled());
  expect(screen.getByRole("status")).toHaveTextContent("202 tokens");
});
