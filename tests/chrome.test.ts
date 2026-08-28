import { describe, expect, it } from "vitest";
import {
  injectWinnowOverlay,
  isHtmlContentType,
  winnowOfflineHtml,
} from "../src/server/chrome.ts";

describe("winnow chrome", () => {
  it("injects a cockpit overlay before </body>", () => {
    const html = "<html><body><h1>Winnow</h1></body></html>";
    const out = injectWinnowOverlay(html);
    expect(out).toContain("data-rasputin-overlay");
    expect(out).toContain('href="/_rasputin/"');
    expect(out.indexOf("rasputin-overlay")).toBeLessThan(out.indexOf("</body>"));
  });

  it("does not inject twice", () => {
    const once = injectWinnowOverlay("<html><body></body></html>");
    const twice = injectWinnowOverlay(once);
    expect(twice.match(/data-rasputin-overlay/g)?.length).toBe(1);
  });

  it("recognizes html content types", () => {
    expect(isHtmlContentType("text/html; charset=utf-8")).toBe(true);
    expect(isHtmlContentType("application/json")).toBe(false);
  });

  it("renders an explicit offline page", () => {
    const html = winnowOfflineHtml();
    expect(html).toContain("Winnow is down.");
    expect(html).toContain("/_rasputin/");
  });
});
