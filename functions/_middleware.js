import { ROUTES } from './routes.generated.js';

// modafinildirect.com Pages middleware: hard 404 for unknown HTML paths.
//
// Cloudflare Pages falls back to serving /index.html with HTTP 200 for
// unmatched routes (SPA behaviour). On a content site that turns every typo,
// probe and stale link into a soft-404 duplicate of the homepage. A root
// 404.html fixes some shapes but not extension-bearing paths (/wp-login.php)
// or some slash-less paths, so the generated route set is authoritative.
//
// ROUTES is written by tools/build-public-site.js. Regenerate; do not hand-edit.
const VALID = new Set(ROUTES);

const ASSET_PREFIXES = ['/assets/', '/cdn-cgi/'];
const ASSET_FILES = new Set(['/favicon.ico', '/robots.txt', '/sitemap.xml', '/_build-manifest.json']);

export async function onRequest(context) {
  const url = new URL(context.request.url);
  const path = url.pathname;

  if (ASSET_FILES.has(path) || ASSET_PREFIXES.some((prefix) => path.startsWith(prefix))) {
    return context.next();
  }

  // Canonicalise /route to /route/ with a 301 so one URL serves each page.
  if (!path.endsWith('/') && VALID.has(`${path}/`)) {
    url.pathname = `${path}/`;
    return Response.redirect(url.toString(), 301);
  }

  if (VALID.has(path)) return context.next();

  const notFound = await context.env.ASSETS.fetch(new URL('/404.html', url.origin));
  return new Response(notFound.body, {
    status: 404,
    headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' },
  });
}
