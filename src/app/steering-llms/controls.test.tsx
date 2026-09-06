import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import catalog from "@/content/steering-directions.json";
import SteeringLab from "./page";

afterEach(cleanup);
it("separates evaluated layer choices from unvalidated custom contrasts", () => {
  render(<SteeringLab />);
  expect(screen.getByRole("slider", { name: "Temperature" })).toHaveValue(
    "0.7",
  );
  fireEvent.change(screen.getByRole("textbox", { name: "Steering prompt" }), {
    target: { value: "The traveler opened the door and" },
  });
  expect(screen.getByRole("button", { name: "After block 5" })).toBeDisabled();
  expect(
    screen.getByRole("button", {
      name: `After block ${catalog[0].variants[0].layer}`,
    }),
  ).toBeEnabled();
  fireEvent.click(
    screen.getByRole("button", { name: "Custom contrast pairs" }),
  );
  expect(screen.getByText("Direction discovery is difficult.")).toBeVisible();
  expect(screen.getByRole("button", { name: "After block 5" })).toBeEnabled();
  const positive = screen.getByRole("textbox", {
    name: "positive contrast examples",
  });
  expect(positive).not.toHaveAttribute("readonly");
  fireEvent.change(positive, { target: { value: "A different target" } });
  fireEvent.change(screen.getByRole("slider", { name: "Temperature" }), {
    target: { value: "0" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Tested directions" }));
  expect(screen.getByRole("slider", { name: "Temperature" })).toHaveValue(
    "0.7",
  );
  expect(screen.getByRole("textbox", { name: "Steering prompt" })).toHaveValue(
    "The traveler opened the door and",
  );
  expect(positive).toHaveAttribute("readonly");
  expect(positive).toHaveValue(catalog[0].positive.join("\n"));
  expect(screen.getByRole("button", { name: "After block 5" })).toBeDisabled();
});
