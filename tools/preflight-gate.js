#!/usr/bin/env node
/**
 * Deterministic pre-deploy gate. Ported from buymoda-site, where every rule
 * exists because the defect actually shipped. A judgement review can be
 * talked around; this cannot. Runs in CI before production is promoted.
 *
 * Usage: node tools/preflight-gate.js [--dir dist]
 * Exit 0 = clear to deploy. Exit 1 = blocked.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const dirArg = argv.indexOf('--dir');
const dist = resolve(root, dirArg === -1 ? 'dist' : argv[dirArg + 1]);

if (!existsSync(dist)) {
  console.error(`preflight: ${relative(root, dist)} does not exist; run npm run build first`);
  process.exit(1);
}

const pages = [];
(function walk(d) {
  for (const entry of readdirSync(d)) {
    const p = join(d, entry);
    if (statSync(p).isDirectory()) walk(p);
    else if (p.endsWith('.html')) pages.push(p);
  }
})(dist);

const violations = [];
const fail = (rule, file, detail) => violations.push({ rule, file: relative(dist, file) || '/', detail });

for (const file of pages) {
  const html = readFileSync(file, 'utf8');

  // 1. Editorial notes and internal markers must never reach the CDN.
  for (const block of html.match(/<!--[\s\S]*?-->/g) ?? []) {
    if (/\bSHANE\b|INPUT REQUIRED|\bTODO\b|DRAFT NOTE|META TITLE|META DESC|SCHEMA NOTE/i.test(block)) {
      fail('editorial-note-leak', file, block.replace(/\s+/g, ' ').slice(0, 90));
    }
  }

  // 2. Placeholder copy left in a shipped page.
  for (const m of html.matchAll(/\[(?:PLACEHOLDER|TBD|INSERT[^\]]*)\]|lorem ipsum/gi)) {
    fail('placeholder-copy', file, m[0]);
  }

  // 3. Machine-truncated anchor text.
  for (const m of html.matchAll(/<a\b[^>]*>([\s\S]{0,200}?)<\/a>/g)) {
    const label = m[1].replace(/<[^>]+>/g, '').trim();
    if (/(?:\.\.\.|…)$/.test(label)) fail('truncated-anchor', file, label.slice(0, 80));
  }

  // 4. External links must be qualified so they pass no equity by accident.
  for (const m of html.matchAll(/<a\b([^>]*)\bhref=["']https?:\/\/([^"'/]+)[^"']*["']([^>]*)>/gi)) {
    const host = m[2].toLowerCase();
    if (host.endsWith('modafinildirect.com')) continue;
    const attrs = `${m[1]} ${m[3]}`;
    if (!/\brel=["'][^"']*\bnoopener\b/i.test(attrs)) fail('external-link-unqualified', file, host);
  }

  // 5. Structured data must parse. A broken JSON-LD block silently drops
  //    every rich result on the page.
  for (const m of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      JSON.parse(m[1]);
    } catch (error) {
      fail('invalid-json-ld', file, error.message.slice(0, 80));
    }
  }

  // 6. No inline event handlers: the CSP forbids them and they fail silently.
  for (const m of html.matchAll(/\son(?:click|load|error|submit|change|input)=["']/gi)) {
    fail('inline-event-handler', file, m[0]);
  }
}

if (violations.length) {
  console.error(`preflight: BLOCKED with ${violations.length} violation(s)`);
  for (const v of violations) console.error(`  [${v.rule}] ${v.file}: ${v.detail}`);
  process.exit(1);
}
console.log(`preflight: ${pages.length} pages clear`);
