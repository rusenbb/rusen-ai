import { act, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { isReadableEdit, issRegion, mergeTrade, parseKlines, wikiLabel } from "./feeds";
import { CryptoHero, WikiFeed } from "./widgets";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("Pulse Board feeds", () => {
  it("drops Wikidata ids and non-article changes from the edit list", () => {
    const en = { wiki: "enwiki", server_name: "en.wikipedia.org" };
    expect(isReadableEdit({ ...en, type: "edit", namespace: 0, title: "Ada Lovelace" })).toBe(true);
    expect(isReadableEdit({ type: "edit", namespace: 0, title: "Q86858495", wiki: "wikidatawiki", server_name: "www.wikidata.org" })).toBe(false);
    expect(isReadableEdit({ ...en, type: "edit", namespace: 0, title: "Q42" })).toBe(false);
    expect(isReadableEdit({ type: "edit", namespace: 0, title: "Faust", wiki: "dewikisource", server_name: "de.wikisource.org" })).toBe(false);
    expect(isReadableEdit({ ...en, type: "edit", namespace: 1, title: "Talk:Ada Lovelace" })).toBe(false);
    expect(isReadableEdit({ ...en, type: "log", namespace: 0, title: "Ada Lovelace" })).toBe(false);
    expect(wikiLabel("en.wikipedia.org")).toBe("EN");
  });

  it("folds trades into one close per minute and keeps the last hour", () => {
    const history = parseKlines([
      [0, "1", "1", "1", "100", "0"],
      [60000, "1", "1", "1", "101", "0"],
      ["bad"],
    ]);
    expect(history).toEqual([
      { minute: 0, price: 100 },
      { minute: 1, price: 101 },
    ]);
    expect(mergeTrade(history, 61000, 102)).toEqual([
      { minute: 0, price: 100 },
      { minute: 1, price: 102 },
    ]);
    expect(mergeTrade(history, 120000, 103)).toHaveLength(3);
    expect(mergeTrade(history, 120000, 103, 2)).toEqual([
      { minute: 1, price: 101 },
      { minute: 2, price: 103 },
    ]);
    // A late trade from an older minute does not rewrite history.
    expect(mergeTrade(history, 1000, 1)).toBe(history);
  });

  it("names the ocean under the station instead of mislabelling the North Pacific", () => {
    expect(issRegion(30, -150)).toBe("Over the Pacific");
    expect(issRegion(30, -40)).toBe("Over the Atlantic");
    expect(issRegion(50, 10)).toBe("Over Europe");
  });

  it("closes the trade socket when the board unmounts", () => {
    const sockets: Array<{ close: ReturnType<typeof vi.fn> }> = [];
    vi.stubGlobal(
      "WebSocket",
      vi.fn(function FakeSocket(this: { close: ReturnType<typeof vi.fn> }) {
        this.close = vi.fn();
        sockets.push(this);
      }),
    );
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("[]")));
    const { unmount } = render(<CryptoHero />);
    expect(sockets).toHaveLength(1);
    unmount();
    expect(sockets[0].close).toHaveBeenCalled();
  });

  it("closes the Wikipedia stream while the tab is hidden and reopens it after", () => {
    const streams: Array<{ close: ReturnType<typeof vi.fn> }> = [];
    vi.stubGlobal(
      "EventSource",
      vi.fn(function FakeSource(this: { close: ReturnType<typeof vi.fn> }) {
        this.close = vi.fn();
        streams.push(this);
      }),
    );
    const hidden = vi.spyOn(document, "hidden", "get").mockReturnValue(false);
    const { unmount } = render(<WikiFeed />);
    expect(streams).toHaveLength(1);
    hidden.mockReturnValue(true);
    act(() => document.dispatchEvent(new Event("visibilitychange")));
    expect(streams[0].close).toHaveBeenCalled();
    hidden.mockReturnValue(false);
    act(() => document.dispatchEvent(new Event("visibilitychange")));
    expect(streams).toHaveLength(2);
    unmount();
    expect(streams[1].close).toHaveBeenCalled();
    hidden.mockRestore();
  });
});
