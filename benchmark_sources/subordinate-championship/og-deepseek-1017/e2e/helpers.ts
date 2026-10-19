import { expect, type Page } from "@playwright/test";

export async function createRoom(page: Page, name: string): Promise<string> {
  await page.goto("/");
  await page.fill("[data-testid=name-input]", name);
  await page.click("[data-testid=create-btn]");
  await expect(page.locator("#view-room")).toHaveClass(/active/);
  const code = (await page.locator("[data-testid=room-code]").textContent())?.trim() ?? "";
  expect(code.length).toBeGreaterThanOrEqual(2);
  return code;
}

export async function joinRoom(page: Page, name: string, code: string): Promise<void> {
  await page.goto("/");
  await page.fill("[data-testid=name-input]", name);
  await page.fill("[data-testid=code-input]", code);
  await page.click("[data-testid=join-btn]");
  await expect(page.locator("#view-room")).toHaveClass(/active/);
}

export async function phaseText(page: Page): Promise<string> {
  return ((await page.locator("[data-testid=phase]").textContent()) ?? "").trim();
}

/** 早押しボタンが表示されている（= この問題でまだ押せる）ページだけを返す。 */
export async function unlocked(pages: Page[]): Promise<Page[]> {
  const out: Page[] = [];
  for (const p of pages) {
    if (await p.locator("[data-testid=buzz-btn]").isVisible().catch(() => false)) out.push(p);
  }
  return out;
}
