import { expect, test } from "@playwright/test";

test("sampling can be stepped, replayed in a batch, and branched", async ({
  page,
}) => {
  await page.goto("/rusen-gram/");
  const single = page.getByRole("button", {
    name: "Sample 1 token",
    exact: true,
  });
  const position = page.getByRole("status", { name: "Sampling position" });
  const path = page.getByLabel("Generated sampling path");
  await expect(single).toBeEnabled();
  for (let i = 1; i <= 10; i++) {
    await single.click();
    await expect(position).toHaveText(`Position ${i} / ${i}`);
    await expect(single).toBeEnabled();
  }
  const stepped = await path.getByRole("button").allTextContents();
  await page.getByRole("button", { name: "Restart", exact: true }).click();
  await page.getByLabel("Batch size").selectOption("10");
  await page
    .getByRole("button", { name: "Sample 10 tokens", exact: true })
    .click();
  await expect(position).toHaveText("Position 10 / 10");
  await expect(path.getByRole("button")).toHaveText(stepped);
  await path.getByRole("button").nth(2).click();
  await expect(position).toHaveText("Position 3 / 10");
  await expect(page.getByLabel("Current context")).toContainText(
    "Context at position 3",
  );
  const choice = page.getByRole("button", { name: /^Choose token:/ }).first();
  const token = await choice.textContent();
  await choice.click();
  await expect(position).toHaveText("Position 4 / 4");
  await expect(path.getByRole("button").nth(3)).toHaveText(token!.trim());
  await expect(
    page.getByText("Manually chosen:", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("textbox", { name: "Context", exact: true })
    .fill("the queen");
  await expect(position).toHaveText("Position 0 / 0");
  await expect(page.getByLabel("Current context")).toContainText("the queen");
});
