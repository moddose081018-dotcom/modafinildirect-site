#!/usr/bin/env node
// Validates the built artifact in dist/: nothing private leaked, every
// required file is present, every internal link resolves, every page carries
// the metadata a public page needs, and the heading hierarchy has no gaps.
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { headingHierarchyGaps } from './html-hygiene.js';
import { SITE } from './site.config.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const output = join(root, 'dist');
const errors = [];
const files = [];

function walk(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const absolute = join(directory, entry.name);
    if (entry.isDirectory()) walk(absolute);
    else files.push(relative(output, absolute).replaceAll('\\', '/'));
  }
}

if (!existsSync(output)) throw new Error('dist does not exist; run npm run build first');
walk(output);

const forbiddenRoots = /^(?:\.claude|\.github|functions|node_modules|notes|reports|tests|tools)(?:\/|$)/i;
const forbiddenExtensions = new Set(['.md', '.php', '.py', '.sh', '.yml', '.yaml']);
for (const file of files) {
  if (forbiddenRoots.test(file)) errors.push(`private path included: ${file}`);
  if (forbiddenExtensions.has(extname(file).toLowerCase())) errors.push(`source file included: ${file}`);
  if (statSync(join(output, file)).size > 25 * 1024 * 1024) errors.push(`file exceeds Cloudflare Pages 25 MiB limit: ${file}`);
}

for (const required of ['index.html', '404.html', '_headers', 'robots.txt', 'sitemap.xml', 'favicon.ico', '_build-manifest.json']) {
  if (!files.includes(required)) errors.push(`required artifact file is missing: ${required}`);
}

const htmlFiles = files.filter((file) => file.endsWith('.html'));
const routeFiles = new Set(htmlFiles);
const redirectSources = new Set();
if (files.includes('_redirects')) {
  for (const line of readFileSync(join(output, '_redirects'), 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    redirectSources.add(trimmed.split(/\s+/)[0]);
  }
}

function resolvesLocalPath(pathname) {
  const path = pathname.split(/[?#]/)[0];
  if (path === '/' || path === '') return routeFiles.has('index.html');
  const relativePath = path.replace(/^\//, '');
  if (routeFiles.has(relativePath)) return true;
  if (routeFiles.has(`${relativePath.replace(/\/$/, '')}/index.html`)) return true;
  if (files.includes(relativePath)) return true;
  return redirectSources.has(path) || redirectSources.has(`${path.replace(/\/$/, '')}/`);
}

const sitemap = readFileSync(join(output, 'sitemap.xml'), 'utf8');
const sitemapLocs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
for (const loc of sitemapLocs) {
  if (!loc.startsWith(`${SITE.origin}/`)) errors.push(`sitemap entry off-host: ${loc}`);
  else if (!resolvesLocalPath(loc.slice(SITE.origin.length))) errors.push(`sitemap entry does not resolve: ${loc}`);
}

for (const file of htmlFiles) {
  const html = readFileSync(join(output, file), 'utf8');
  const route = file === '404.html' ? '/404.html' : `/${file.replace(/index\.html$/, '')}`;
  const is404 = file === '404.html';

  if (!/<title>[^<]+<\/title>/i.test(html)) errors.push(`${route}: missing <title>`);
  if (!/<meta[^>]+name=["']description["'][^>]+content=["'][^"']+["']/i.test(html)) errors.push(`${route}: missing meta description`);
  if (!/<html[^>]+lang=/i.test(html)) errors.push(`${route}: missing lang attribute`);
  if (!/<meta[^>]+name=["']viewport["']/i.test(html)) errors.push(`${route}: missing viewport meta`);
  const h1s = (html.match(/<h1\b/gi) || []).length;
  if (h1s !== 1) errors.push(`${route}: expected exactly one <h1>, found ${h1s}`);
  if (!/<main\b/i.test(html)) errors.push(`${route}: missing <main> landmark`);

  if (!is404) {
    const canonical = html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i)?.[1];
    if (canonical !== `${SITE.origin}${route}`) errors.push(`${route}: canonical is ${canonical ?? 'missing'}`);
    const indexable = !/<meta[^>]+name=["']robots["'][^>]+noindex/i.test(html);
    const listed = sitemapLocs.includes(`${SITE.origin}${route}`);
    if (indexable && !listed) errors.push(`${route}: indexable but absent from sitemap`);
    if (!indexable && listed) errors.push(`${route}: noindex but listed in sitemap`);
  } else if (!/<meta[^>]+name=["']robots["'][^>]+noindex/i.test(html)) {
    errors.push('404.html must carry noindex');
  }

  const gaps = headingHierarchyGaps(html);
  if (gaps.length) errors.push(`${route}: heading hierarchy gaps ${gaps.join(', ')}`);

  for (const match of html.matchAll(/<(?:a|link|script|img|source)\b[^>]*?\b(?:href|src)=["']([^"']+)["']/gi)) {
    const target = match[1];
    if (/^(?:https?:)?\/\//i.test(target)) {
      if (target.includes('buymoda.net')) errors.push(`${route}: references buymoda.net (${target})`);
      continue;
    }
    if (/^(?:mailto:|tel:|#|data:|javascript:)/i.test(target)) continue;
    if (!resolvesLocalPath(target)) errors.push(`${route}: broken internal reference ${target}`);
  }
}

if (errors.length) {
  console.error(`validate-public-site: ${errors.length} problem(s)`);
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}
console.log(`validate-public-site: ${htmlFiles.length} HTML files, ${files.length} files total, no problems`);
