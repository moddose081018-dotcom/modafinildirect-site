#!/usr/bin/env node
// Asserts what a deployed origin actually serves. Usage:
//   node tools/smoke-test.js https://host [production|preview] [expected-commit]
import assert from 'node:assert/strict';
import { SITE } from './site.config.js';

const base = new URL(process.argv[2] || '');
const environment = process.argv[3] || 'production';
const preview = environment === 'preview';
const expectedCommit = process.argv[4] || process.env.SITE_COMMIT_SHA || '';

async function request(path, options = {}) {
  let lastError;
  for (let attempt = 1; attempt <= 12; attempt += 1) {
    try {
      const response = await fetch(new URL(path, base), {
        redirect: 'manual',
        ...options,
        headers: { 'user-agent': 'Mozilla/5.0 (compatible; ModafinilDirectDeploymentCheck/1.0)', 'cache-control': 'no-cache', ...options.headers },
      });
      if (response.status !== 522 && response.status !== 503) return response;
      lastError = new Error(`${path} returned ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }
  throw lastError;
}

// Cloudflare Pages does not serve a new deployment at the project alias the
// instant wrangler exits, so wait until the manifest carries the revision.
if (expectedCommit) {
  const deadline = Date.now() + 180_000;
  let served = '';
  while (Date.now() < deadline) {
    const manifest = await request('/_build-manifest.json');
    if (manifest.status === 200) {
      served = (await manifest.json()).commit;
      if (served === expectedCommit) break;
    }
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }
  assert.equal(served, expectedCommit, `origin never served commit ${expectedCommit}`);
}

const home = await request('/');
assert.equal(home.status, 200, 'homepage must be 200');
const homeHtml = await home.text();
assert.match(homeHtml, new RegExp(`rel="canonical" href="${SITE.origin}/"`), 'homepage canonical');
assert.match(homeHtml, /<h1\b/, 'homepage has an h1');
assert.match(home.headers.get('content-security-policy') || '', /default-src 'self'/, 'CSP header served');

const missing = await request('/this-route-does-not-exist-9f2c/');
assert.equal(missing.status, 404, 'unknown routes must be hard 404s');

const robots = await request('/robots.txt');
assert.equal(robots.status, 200);
assert.match(await robots.text(), preview ? /User-agent/ : new RegExp(`Sitemap: ${SITE.origin}/sitemap.xml`));

const sitemap = await request('/sitemap.xml');
assert.equal(sitemap.status, 200);
assert.match(await sitemap.text(), /<urlset/);

console.log(`smoke-test: ${base.origin} (${environment}) passed`);
