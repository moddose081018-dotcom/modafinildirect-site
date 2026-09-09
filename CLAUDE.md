# modafinildirect-site

Static Cloudflare Pages site for modafinildirect.com. Platform ported from
buymoda-site; see README.md for layout and DEPLOYMENT.md for how publishing
works.

Rules that hold for every change:

- One page per directory (`<route>/index.html`). The directory is the URL.
- Run `npm test` and `npm run check` before pushing. CI runs the same.
- Commit `functions/routes.generated.js` whenever the build changes it.
- Never reference buymoda.net from a page. The validator fails on it.
- No inline event handlers or inline scripts: the CSP forbids them.
- Editorial notes in HTML comments are stripped by the build, but do not
  rely on it. The preflight gate blocks the deploy if one leaks.
- No medical claims. Every page that touches modafinil use points the reader
  to a clinician or pharmacist.
