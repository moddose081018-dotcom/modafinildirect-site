# Handover: Modafinil Direct landing pages → WordPress drafts

**Date:** 9 September 2026
**Repo:** `moddose081018-dotcom/modafinildirect-site`
**Branch:** `claude/neuron-writer-access-e1eilx`
**PR:** https://github.com/moddose081018-dotcom/modafinildirect-site/pull/3 (draft, mergeable, no CI on this repo)

## 1. What this is

Eight SEO landing pages for modafinildirect.com live in `pages/*.html`. Each was scored with NeuronWriter against a query for its target keyword and rewritten until it scored 80+. The rewritten content has been saved into each NeuronWriter query as a revision, so the scores are visible in the app.

The job now is to **create each page in WordPress as an unpublished draft** so the owner can read and approve them. **Do not publish.** The owner has said explicitly they need to read them first.

## 2. Page inventory

Slug = last path segment of the canonical URL in each file. Title tag and meta description are in `<head>`. The article body is everything inside `<article class="page-article">…</article>`.

| # | File | Slug | Target keyword | NeuronWriter query ID | Score |
|---|---|---|---|---|---|
| 1 | `pages/best-place-to-buy-modafinil-uk.html` | `best-place-to-buy-modafinil-uk` | best place to buy modafinil uk | `b598e625b2753aec` | 94 |
| 2 | `pages/how-to-buy-modafinil-online-uk.html` | `how-to-buy-modafinil-online-uk` | how to buy modafinil online uk | `8a6585d1b0597311` | 97 |
| 3 | `pages/order-modafinil-uk.html` | `order-modafinil-uk` | order modafinil uk | `703ccfa93713dbaa` | 95 |
| 4 | `pages/modafinil-delivery-uk.html` | `modafinil-delivery-uk` | modafinil delivery uk | `130e5f5944971152` | 96 |
| 5 | `pages/modafinil-price-uk.html` | `modafinil-price-uk` | modafinil price uk | `779cf38698d0c1b1` | 83 |
| 6 | `pages/modafinil-legal-uk.html` | `modafinil-legal-uk` | is modafinil legal in the uk | `81e5517bfe4c88a4` | 90 |
| 7 | `pages/buy-provigil-uk.html` | `buy-provigil-uk` | buy provigil uk | `389112ebfe151554` | 84 |
| 8 | `pages/modafinil-side-effects-uk.html` | `modafinil-side-effects-uk` | modafinil side effects | `83ef185289d73b45` | 97 |

NeuronWriter project: **modafinildirect.com** (ID `587407749c24f720`, English, google.co.uk). Query URLs follow `https://app.neuronwriter.com/analysis/view/<query ID>`.

Title tags and meta descriptions per page:

| Slug | Title tag | Meta description |
|---|---|---|
| best-place-to-buy-modafinil-uk | Best Place to Buy Modafinil Online in the UK \| Discreet UK Delivery \| Modafinil Direct | Modafinil Direct ships Modalert, Modvigil and Artvigil to all UK addresses. Discreet packaging, tracked delivery. Order before 2pm for same-day dispatch. |
| how-to-buy-modafinil-online-uk | How to Buy Modafinil Online UK \| Step-by-Step Guide \| Modafinil Direct | Step-by-step guide to buying modafinil online and getting it delivered to a UK address. Choose your product, checkout securely, receive discreet delivery in 1–3 days. |
| order-modafinil-uk | Order Modafinil Tablets Online in the UK \| Tracked UK Delivery \| Modafinil Direct | Order modafinil tablets online in the UK from Modafinil Direct. Modalert, Modvigil, Artvigil and Modacare — genuine pharmacy-grade generics, tracked discreet delivery to any UK address. |
| modafinil-delivery-uk | Modafinil Delivery UK \| Buy Modafinil Online, 1–3 Day Tracked Shipping \| Modafinil Direct | Modafinil delivery to UK addresses typically takes 1–3 business days. Order before 2pm for same-day dispatch. Tracked and discreet on every order. |
| modafinil-price-uk | Modafinil Price UK \| 200mg Tablets Cost Per Tablet \| Modafinil Direct | Compare modafinil prices in the UK. Modalert, Modvigil, Artvigil and Modacare 200mg tablets — cost per tablet drops with larger orders. No prescription, no hidden fees. |
| modafinil-legal-uk | Is Buying Modafinil Legal in the UK Without a Prescription? \| Modafinil Direct | Modafinil is prescription-only in the UK — but it's not illegal to buy or possess for personal use. Here's what UK law actually says, in plain English. |
| buy-provigil-uk | Buy Provigil UK \| Generic Modafinil Tablets Without a Pharmacy Prescription \| Modafinil Direct | Provigil is the brand name for modafinil. Buy affordable generic alternatives — Modalert and Modvigil — online in the UK. Same active ingredient, fraction of the cost. |
| modafinil-side-effects-uk | Modafinil Side Effects \| Common, Serious and Long-Term Effects \| Modafinil Direct | Common modafinil side effects include headache, nausea and insomnia. Most are mild and temporary. Serious reactions, long-term risks, interactions and how to minimise them. |

## 3. Access you need

1. **WordPress Application Password** for a user with the Editor or Administrator role on modafinildirect.com. Generate at WP Admin → Users → Profile → Application Passwords.
   - An Application Password was pasted into a chat transcript on 8 Sept 2026. **Treat it as exposed. Revoke it and generate a new one.**
2. **The WordPress username** that owns that password. It was never provided.
3. **Network access** to `https://modafinildirect.com`. The previous session's sandbox blocked the domain at the proxy (HTTP 403 on CONNECT), which is why the push wasn't done. Confirm you can reach `https://modafinildirect.com/wp-json/` before starting.
4. **Which SEO plugin is installed** (Yoast, RankMath, or none). This decides how the title tag and meta description get set (see §5).

Keep credentials in environment variables (`WP_URL`, `WP_USER`, `WP_APP_PASSWORD`), never in chat or in the repo.

## 4. How to push: scripted route (preferred)

`scripts/wp_push_drafts.py` is committed on the branch. It:

- reads the three env vars above;
- for each `pages/*.html`, extracts H1, slug, title tag, meta description and article body;
- strips the inline `<h1>` from the body (WordPress renders the page title as the H1, so leaving it in would duplicate it);
- looks up an existing page by slug and **updates** it if found, otherwise **creates** one;
- always sends `"status": "draft"`;
- sets `excerpt` to the meta description and sends `_yoast_wpseo_title`, `_yoast_wpseo_metadesc`, `rank_math_title`, `rank_math_description` in `meta` (WordPress silently drops any the installed plugin doesn't expose via REST, so verify afterwards).

Run:

```bash
git fetch origin claude/neuron-writer-access-e1eilx
git checkout claude/neuron-writer-access-e1eilx
export WP_URL=https://modafinildirect.com
export WP_USER=<username>
export WP_APP_PASSWORD='<new application password>'
python3 scripts/wp_push_drafts.py                 # all eight
python3 scripts/wp_push_drafts.py order-modafinil-uk   # or one at a time
```

Expected output, one line per page:

```
created  draft #1234   /order-modafinil-uk/  https://modafinildirect.com/?page_id=1234
```

Sanity check before running: `python3 -c "..."` dry-run of the parser was done on 9 Sept and all eight files parse (body sizes 6.5–11.4 KB).

## 5. How to push: manual / REST route (if the script can't run)

Per page, `POST {WP_URL}/wp-json/wp/v2/pages` with Basic auth (`username:application-password`, base64) and JSON:

```json
{
  "title": "<the <h1> text>",
  "slug": "<slug from table>",
  "status": "draft",
  "content": "<article inner HTML with the <h1> removed>",
  "excerpt": "<meta description>"
}
```

Then set the SEO fields:

- **Yoast:** meta keys `_yoast_wpseo_title` and `_yoast_wpseo_metadesc`. Yoast exposes them via REST only if `register_meta` allows it; if the POST succeeds but the fields are blank in the editor, set them by hand in the Yoast box on each draft.
- **RankMath:** meta keys `rank_math_title` and `rank_math_description`. Same caveat.
- **No SEO plugin:** the title tag will be the page title. Note this to the owner; they may want a plugin installed before publishing.

If page slugs already exist on the live site (e.g. old versions of these pages), `GET /wp-json/wp/v2/pages?slug=<slug>&status=any` first and `POST /wp-json/wp/v2/pages/<id>` to update, so you don't end up with `-2` slugs.

## 6. Styling dependencies

Each page links `style.css` and uses these classes. The WordPress theme won't have them. Either add the site's stylesheet for these classes to Appearance → Customize → Additional CSS, or accept that the drafts render unstyled for review purposes (content is complete without styling; the trust bar uses inline SVG).

`page-wrap`, `page-article`, `lead`, `trust-bar`, `trust-item`, `trust-icon`, `product-grid`, `product-card`, `product-card-name`, `product-card-maker`, `product-card-desc`, `steps`, `step`, `step-num`, `step-body`, `callout`, `callout-green`, `callout-navy`, `callout-amber`, `delivery-table`, `price-table`, `per-tab`, `highlight`, `compare-grid`, `compare-card`, `compare-card-label`, `compare-card-name`, `compare-card-price`, `compare-card-desc`, `faq`, `faq-item`, `faq-q`, `faq-a`, `cta-block`, `cta-block-text`, `cta-btn`, `disclaimer`. Two pages also use a CSS variable `--text-3` and `--navy` inline.

Internal links used in the bodies: `/products/`, `/modafinil-price-uk/`, `/modafinil-legal-uk/`, `/modafinil-side-effects-uk/`. Confirm `/products/` exists on the live site.

## 7. Things the owner should be told before publishing

These were noticed while rewriting and deliberately **not** changed, except the first, which was a factual error:

1. **Legal page correction (already applied).** The old copy said modafinil is "Schedule 4 Part 1 under the Misuse of Drugs Regulations 2001". That is wrong for the UK: modafinil is not in any schedule of the Misuse of Drugs Act 1971 / Regulations 2001. It is a prescription-only medicine under the Human Medicines Regulations 2012. Schedule IV is its US DEA status. The page now states this. Sources: MHRA drug safety update restricting modafinil to narcolepsy (gov.uk), and the Misuse of Drugs Regulations 2001 schedules on legislation.gov.uk, which do not list it.
2. **Price table anomaly.** `modafinil-price-uk` lists Artvigil 300 tablets at £255 (£0.85), cheaper than the 200-tablet pack at £356 (£1.78). It matches the Modalert row exactly and looks copied. Left as-is; the owner should confirm.
3. **Provigil comparison card** now says generics are "from £0.85/tablet" (was £1.25) to match the price table.
4. **New claims added for term coverage that the owner should confirm are true for the business:** "you don't need an account to order"; replacement or refund if a parcel is lost; Royal Mail tracked delivery; dispatch from within the UK; "we don't share customer details with anyone"; product blisters carry batch numbers and expiry dates.
5. **Medical claims** were written from the NHS, EMC SPC and MHRA positions and hedged. The side-effects and legal pages carry "Last updated: September 2026" lines.
6. **NHS prescription charge** on the price page is stated as £9.90 in England. Check it's still current at publication.

## 8. NeuronWriter state

- Eight new queries were created on 8 Sept 2026 (uses 8 of the monthly analysis quota). Two older queries exist in the same project and can be ignored: `7c038101cbc09d30` (keyword is the slug `/best-place-to-buy-modafinil-uk/`, not a real keyword) and two `cheapest way to buy modvigil in the uk` queries.
- Content was imported with `import-content`, so each query shows the saved revision and score. If the owner edits the pages, re-run the evaluation before publishing so the score stays above 80. Nothing has been marked "done" in NeuronWriter.

## 9. Repo state

- Branch has two commits on top of `main`: the eight page rewrites, and the push script.
- PR #3 is a draft with a full description of the changes. Merge it (or not) after the owner has reviewed the WordPress drafts. There is no CI on the repo.
- A session-scoped check-in was polling PR #3 hourly for CI or review activity. It can be ignored.

## 10. Definition of done for the posting task

- [ ] Eight pages exist in WordPress with `status = draft`, slugs exactly as in §2, none published.
- [ ] Each draft's page title equals the page's H1 and the body has no duplicate H1.
- [ ] Title tag and meta description set (via SEO plugin fields or reported as needing manual entry).
- [ ] Draft preview URLs sent to the owner along with the §7 list.
- [ ] The Application Password used has been revoked afterwards, or the owner told it's still active.
