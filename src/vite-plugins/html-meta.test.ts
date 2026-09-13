import { describe, expect, it } from "vitest";
import { injectHtmlMeta } from "../../vite-plugins/html-meta";

const html = "<!doctype html><html><head><title>t</title></head><body><div></div></body></html>";

describe("injectHtmlMeta", () => {
  it("leaves the html untouched without options", () => {
    expect(injectHtmlMeta(html, { noindex: false, beaconToken: "" })).toBe(html);
  });

  it("adds the robots meta when noindex is set", () => {
    const out = injectHtmlMeta(html, { noindex: true, beaconToken: "" });
    expect(out).toContain('<meta name="robots" content="noindex">');
    expect(out.indexOf("robots")).toBeLessThan(out.indexOf("</head>"));
    expect(out).not.toContain("cloudflareinsights");
  });

  it("adds the Cloudflare beacon at the end of body when a token is given", () => {
    const out = injectHtmlMeta(html, { noindex: false, beaconToken: "abc123" });
    expect(out).toContain(
      '<script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon=\'{"token": "abc123"}\'></script>',
    );
    expect(out.indexOf("beacon.min.js")).toBeLessThan(out.indexOf("</body>"));
    expect(out).not.toContain("robots");
  });

  it("escapes a token that could break out of the attribute", () => {
    const out = injectHtmlMeta(html, { noindex: false, beaconToken: "a'b<c" });
    expect(out).not.toContain("a'b<c");
    expect(out).toContain("a&#39;b&lt;c");
  });
});
