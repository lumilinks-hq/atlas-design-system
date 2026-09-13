import type { Plugin } from "vite";

export type HtmlMetaOptions = { noindex: boolean; beaconToken: string };

function escapeAttribute(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/'/g, "&#39;");
}

export function injectHtmlMeta(html: string, options: HtmlMetaOptions): string {
  let out = html;
  if (options.noindex) {
    out = out.replace("</head>", '<meta name="robots" content="noindex">\n</head>');
  }
  const token = options.beaconToken.trim();
  if (token) {
    const attr = escapeAttribute(JSON.stringify({ token }).replace('":"', '": "'));
    out = out.replace(
      "</body>",
      `<script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='${attr}'></script>\n</body>`,
    );
  }
  return out;
}

export function htmlMeta(options: HtmlMetaOptions): Plugin {
  return {
    name: "html-meta",
    transformIndexHtml: { order: "post", handler: (html) => injectHtmlMeta(html, options) },
  };
}
