# modafinildirect-site

Static site for modafinildirect.com, deployed to Cloudflare Pages. The
platform is a port of buymoda-site with the WordPress-migration machinery
removed: one page per directory, a Node build into `dist/`, a validation
gate, a preflight gate, and a GitHub Actions workflow that deploys the exact
tested artifact.

## Layout

| path | purpose |
|---|---|
| `index.html`, `<route>/index.html` | page sources; the directory is the URL |
| `assets/` | stylesheet, script, fonts (served immutable, digest-versioned by the build) |
| `404.html`, `_headers`, `robots.txt`, `favicon.ico` | copied to the artifact root |
| `functions/_middleware.js` | Pages middleware: hard 404 for unknown routes |
| `functions/routes.generated.js` | route set, written by the build; commit it |
| `tools/` | build, validate, preflight gate, smoke test, site config |
| `tests/` | contract tests (`npm test`) |

Site identity (name, host) lives in `tools/site.config.js`.

## Commands

```
npm ci
npm test          # contract tests
npm run build     # build dist/ and regenerate functions/routes.generated.js
npm run check     # build + validate artifact + preflight gate
```

`npm run check` is what CI runs. It fails on missing metadata, broken
internal links, canonical mismatches, sitemap drift, heading gaps, leaked
editorial comments, placeholder copy, unqualified external links and
invalid JSON-LD.

## Adding a page

1. Create `<route>/index.html`. Copy the head, header and footer from an
   existing page so navigation and metadata stay consistent.
2. Set `<title>`, the meta description and the canonical to
   `https://modafinildirect.com/<route>/`.
3. Run `npm run check`, then commit the page and the regenerated
   `functions/routes.generated.js`.

## Deployment

See `DEPLOYMENT.md`. Deploy jobs are gated on the
`CLOUDFLARE_DEPLOY_ENABLED` repository variable; until it is `true`, a green
workflow run is a green build, not a deployment.
