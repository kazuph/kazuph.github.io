import { Browser, BrowserContext, Page } from "@playwright/test";
import { MOBILE_VIEWPORT, PC_VIEWPORT } from "./helpers";

/** 4人分の独立したブラウザ（3つはPC幅、1つはスマホ幅）を用意する */
export async function makePlayers(
  browser: Browser,
  count = 4
): Promise<{ contexts: BrowserContext[]; pages: Page[] }> {
  const viewports = [PC_VIEWPORT, PC_VIEWPORT, PC_VIEWPORT, MOBILE_VIEWPORT];
  const contexts: BrowserContext[] = [];
  const pages: Page[] = [];
  for (let i = 0; i < count; i++) {
    const ctx = await browser.newContext({ viewport: viewports[i] });
    contexts.push(ctx);
    pages.push(await ctx.newPage());
  }
  return { contexts, pages };
}

export const NAMES = ["ホスト", "阿部", "バード", "ちーちゃん"];
