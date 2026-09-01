import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const projectRoot = resolve(import.meta.dirname, "..");
const outputDir = resolve(projectRoot, "dist", "server");
const html = await readFile(resolve(projectRoot, "index.html"), "utf8");
const css = await readFile(resolve(projectRoot, "resume.css"), "utf8");
const favicon = await readFile(resolve(projectRoot, "favicon.svg"), "utf8");
const ogImage = await readFile(resolve(projectRoot, "og.jpg"));

const worker = `const html = ${JSON.stringify(html)};
const css = ${JSON.stringify(css)};
const favicon = ${JSON.stringify(favicon)};
const ogImageBase64 = ${JSON.stringify(Buffer.from(ogImage).toString("base64"))};

const securityHeaders = {
  "Content-Security-Policy": "default-src 'self'; style-src 'self'; img-src 'self' data:; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY"
};

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const isHead = request.method === "HEAD";
    if (request.method !== "GET" && !isHead) {
      return new Response(null, { status: 405, headers: { Allow: "GET, HEAD", ...securityHeaders } });
    }

    if (url.pathname === "/" || url.pathname === "/index.html") {
      const renderedHtml = html.replaceAll("https://jasonyen62.github.io/og.jpg", new URL("/og.jpg", request.url).href);
      return new Response(isHead ? null : renderedHtml, {
        headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-cache", ...securityHeaders }
      });
    }

    if (url.pathname === "/resume.css") {
      return new Response(isHead ? null : css, {
        headers: { "Content-Type": "text/css; charset=utf-8", "Cache-Control": "public, max-age=3600", ...securityHeaders }
      });
    }

    if (url.pathname === "/favicon.svg") {
      return new Response(isHead ? null : favicon, {
        headers: { "Content-Type": "image/svg+xml; charset=utf-8", "Cache-Control": "public, max-age=86400", ...securityHeaders }
      });
    }

    if (url.pathname === "/og.jpg") {
      const binary = Uint8Array.from(atob(ogImageBase64), (character) => character.charCodeAt(0));
      return new Response(isHead ? null : binary, {
        headers: { "Content-Type": "image/jpeg", "Cache-Control": "public, max-age=86400", ...securityHeaders }
      });
    }

    return new Response(isHead ? null : "Not Found", {
      status: 404,
      headers: { "Content-Type": "text/plain; charset=utf-8", ...securityHeaders }
    });
  }
};
`;

await mkdir(outputDir, { recursive: true });
await writeFile(resolve(outputDir, "index.js"), worker, "utf8");
console.log("Built dist/server/index.js");
