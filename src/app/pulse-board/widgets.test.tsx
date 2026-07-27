import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { PULSE_WIDGETS, ShortcutsModal, WIDGET_ORDER } from "./widgets";

describe("Pulse Board widgets", () => {
  it("does not present generated numbers as live internet telemetry", () => {
    expect(WIDGET_ORDER).not.toContain("internet-pulse");
    expect(PULSE_WIDGETS.map((widget) => widget.id)).not.toContain("internet-pulse");
  });

  it("exposes shortcuts as a labelled modal and restores focus", async () => {
    const onClose = vi.fn();
    const opener = document.createElement("button");
    document.body.append(opener);
    opener.focus();
    const { rerender } = render(<ShortcutsModal isOpen onClose={onClose} />);

    expect(screen.getByRole("dialog", { name: "Keyboard Shortcuts" }))
      .toHaveAttribute("aria-modal", "true");
    expect(screen.getByRole("button", { name: "Close keyboard shortcuts" }))
      .toHaveFocus();

    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledOnce();
    rerender(<ShortcutsModal isOpen={false} onClose={onClose} />);
    await waitFor(() => expect(opener).toHaveFocus());
    opener.remove();
  });
});
