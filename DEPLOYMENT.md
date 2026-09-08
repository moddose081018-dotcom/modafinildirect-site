# Deployment

Pushes to `main` run `.github/workflows/cloudflare-pages.yml`:

1. `build` runs `npm test` and `npm run check`, then uploads `dist/` as an
   artifact. This job always runs.
2. `deploy-staging` deploys that exact artifact to the `modafinildirect-staging`
   Pages project and smoke-tests it.
3. `deploy-production` deploys the same artifact to `modafinildirect-prod`
   and smoke-tests `https://modafinildirect.com`.

Jobs 2 and 3 run only when the repository variable
`CLOUDFLARE_DEPLOY_ENABLED` is `true`. This mirrors buymoda-site, where the
gate produced two false "the page is live" reports before anyone noticed
that a green run had deployed nothing. Do not read a green tick as a
deployment until the variable is set.

## One-time setup

In the Cloudflare dashboard, create two Pages projects:
`modafinildirect-staging` and `modafinildirect-prod`, and attach the
`modafinildirect.com` custom domain to the production project.

In the GitHub repository settings:

- Secret `CLOUDFLARE_API_TOKEN` with Pages edit permission.
- Variable `CLOUDFLARE_ACCOUNT_ID`.
- Variable `CLOUDFLARE_DEPLOY_ENABLED` set to `true` when ready.
- Environments `staging` and `production` (add a required reviewer to
  `production` if you want a manual approval step).

## Verifying a deployment

The smoke test polls `/_build-manifest.json` until the origin serves the
commit that was built, then asserts the homepage, canonical, CSP header,
robots, sitemap and a hard 404 for an unknown route. Run it by hand with:

```
node tools/smoke-test.js https://modafinildirect.com production <commit-sha>
```
