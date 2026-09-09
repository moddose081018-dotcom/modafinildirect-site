// Generic HTML hygiene helpers shared by the build and the tests.
// Ported from buymoda-site and stripped of its WordPress-migration cases.

export function normalizeCanonical(html, expected) {
  let found = false;
  const normalized = html.replace(/<link\b[^>]*>/gi, (tag) => {
    if (!/\brel=["']canonical["']/i.test(tag)) return tag;
    if (found) return '';
    found = true;
    if (/\bhref=["'][^"']*["']/i.test(tag)) return tag.replace(/\bhref=(["'])[^"']*\1/i, `href="${expected}"`);
    return tag.replace(/\s*\/?\s*>$/, ` href="${expected}" />`);
  });
  if (found) return normalized;
  return normalized.replace(/<\/head>/i, `<link rel="canonical" href="${expected}" />\n</head>`);
}

export function ensureSkipLink(html) {
  let prepared = html;
  const main = prepared.match(/<main\b[^>]*>/i);
  if (!main) return prepared;
  let target = main[0].match(/\bid=["']([^"']+)["']/i)?.[1];
  if (!target) {
    target = 'main';
    prepared = prepared.replace(main[0], main[0].replace(/>$/, ' id="main">'));
  }
  if (/\bclass=["'][^"']*\bskip-link\b/i.test(prepared)) return prepared;
  const skip = `<a href="#${target}" class="skip-link">Skip to main content</a>`;
  return prepared.replace(/<body([^>]*)>/i, `<body$1>${skip}`);
}

function transformUnprotected(html, transform) {
  const protectedBlock = /(<!--[\s\S]*?-->|<script\b[\s\S]*?<\/script>|<style\b[\s\S]*?<\/style>|<template\b[\s\S]*?<\/template>)/gi;
  const pieces = html.split(protectedBlock);
  return pieces.map((piece, index) => (index % 2 ? piece : transform(piece))).join('');
}

export function headingLevels(html) {
  const levels = [];
  transformUnprotected(html, (piece) => {
    for (const match of piece.matchAll(/<h([1-6])\b[^>]*>/gi)) levels.push(Number(match[1]));
    return piece;
  });
  return levels;
}

export function normalizeHeadingHierarchy(html) {
  let previousLevel = 0;
  const openStack = [];
  return transformUnprotected(html, (piece) => piece.replace(/<(\/?)h([1-6])(\b[^>]*)>/gi, (tag, closing, rawLevel, tail) => {
    if (closing) {
      const level = openStack.pop() ?? Number(rawLevel);
      return `</h${level}${tail}>`;
    }
    let level = Number(rawLevel);
    if (previousLevel && level > previousLevel + 1) level = previousLevel + 1;
    previousLevel = level;
    openStack.push(level);
    return `<h${level}${tail}>`;
  }));
}

export function headingHierarchyGaps(html) {
  const levels = headingLevels(html);
  const gaps = [];
  for (let index = 1; index < levels.length; index += 1) {
    if (levels[index] > levels[index - 1] + 1) gaps.push(`${levels[index - 1]}→${levels[index]}`);
  }
  return gaps;
}
