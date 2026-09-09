import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { ensureSkipLink, headingHierarchyGaps, normalizeCanonical, normalizeHeadingHierarchy } from '../tools/html-hygiene.js';
import { SITE } from '../tools/site.config.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

test('heading hierarchy repair removes upward level jumps', () => {
  const repaired = normalizeHeadingHierarchy('<main><h1>A</h1><h3>B</h3><h5>C</h5><h2>D</h2></main>');
  assert.equal(repaired, '<main><h1>A</h1><h2>B</h2><h3>C</h3><h2>D</h2></main>');
  assert.deepEqual(headingHierarchyGaps(repaired), []);
});

test('canonical is forced to the production origin and de-duplicated', () => {
  const html = '<head><link rel="canonical" href="https://staging.example/x/"><link rel="canonical" href="/x/"></head>';
  const out = normalizeCanonical(html, `${SITE.origin}/x/`);
  assert.equal((out.match(/rel="canonical"/g) || []).length, 1);
  assert.match(out, new RegExp(`href="${SITE.origin}/x/"`));
});

test('skip link is added once and targets main', () => {
  const out = ensureSkipLink('<body><main id="main"></main></body>');
  assert.match(out, /<a href="#main" class="skip-link">/);
  assert.equal(ensureSkipLink(out), out);
});

test('static edge policy is strict and excludes subdomains from HSTS', () => {
  const headers = readFileSync(join(root, '_headers'), 'utf8');
  assert.match(headers, /Strict-Transport-Security: max-age=15552000/);
  assert.doesNotMatch(headers, /includeSubDomains|preload/);
  assert.match(headers, /base-uri 'none'; form-action 'self'/);
  assert.match(headers, /\/assets\/\*\n  Cache-Control: public, max-age=31536000, immutable/);
});

test('robots.txt has exactly one wildcard group and points at the sitemap', () => {
  const robots = readFileSync(join(root, 'robots.txt'), 'utf8');
  assert.equal((robots.match(/^User-agent: \*$/gm) || []).length, 1);
  assert.match(robots, new RegExp(`^Sitemap: ${SITE.origin}/sitemap.xml$`, 'm'));
});

test('site config names the production host', () => {
  assert.equal(SITE.origin, `https://${SITE.host}`);
  assert.ok(existsSync(join(root, 'index.html')));
});

test('no source page references buymoda.net', () => {
  for (const page of ['index.html', 'about/index.html', 'contact/index.html', 'faq/index.html', 'shipping/index.html', 'privacy-policy/index.html', 'terms-of-service/index.html', '404.html']) {
    const html = readFileSync(join(root, page), 'utf8');
    assert.doesNotMatch(html, /buymoda/i, `${page} must not mention buymoda`);
  }
});
