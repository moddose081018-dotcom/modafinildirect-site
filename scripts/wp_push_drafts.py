#!/usr/bin/env python3
"""Push the landing pages in pages/ to WordPress as DRAFTS via the REST API.

Never publishes. Re-running updates the existing draft with the same slug.

Env vars required:
  WP_URL            e.g. https://modafinildirect.com
  WP_USER           WordPress username
  WP_APP_PASSWORD   Application Password for that user

Usage:
  python3 scripts/wp_push_drafts.py            # push all pages
  python3 scripts/wp_push_drafts.py order-modafinil-uk   # push one
"""
import base64
import glob
import json
import os
import re
import sys
import urllib.error
import urllib.request

WP_URL = os.environ.get("WP_URL", "").rstrip("/")
WP_USER = os.environ.get("WP_USER", "")
WP_PASS = os.environ.get("WP_APP_PASSWORD", "")

if not (WP_URL and WP_USER and WP_PASS):
    sys.exit("Set WP_URL, WP_USER and WP_APP_PASSWORD in the environment.")

AUTH = "Basic " + base64.b64encode(f"{WP_USER}:{WP_PASS}".encode()).decode()
API = f"{WP_URL}/wp-json/wp/v2/pages"


def api(method, url, payload=None):
    data = json.dumps(payload).encode() if payload is not None else None
    req = urllib.request.Request(url, data=data, method=method)
    req.add_header("Authorization", AUTH)
    req.add_header("Content-Type", "application/json")
    req.add_header("Accept", "application/json")
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            return json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        sys.exit(f"{method} {url} -> {e.code}: {e.read().decode()[:500]}")


def parse(path):
    s = open(path, encoding="utf-8").read()
    title = re.search(r"<title>(.*?)</title>", s, re.S).group(1).strip()
    meta = re.search(r'<meta name="description" content="(.*?)"', s, re.S)
    meta = meta.group(1).strip() if meta else ""
    canon = re.search(r'<link rel="canonical" href="[^"]*?/([^/"]+)/?"', s)
    slug = canon.group(1) if canon else os.path.basename(path)[:-5]
    a = s.index('<article class="page-article">') + len('<article class="page-article">')
    b = s.index("</article>")
    body = s[a:b].strip()
    # The WordPress page title becomes the H1; strip the inline H1 to avoid duplicates.
    h1 = re.search(r"<h1>(.*?)</h1>", body, re.S).group(1).strip()
    body = re.sub(r"\s*<h1>.*?</h1>\s*", "\n", body, count=1, flags=re.S)
    return dict(slug=slug, title=h1, seo_title=title, meta=meta, body=body)


def find_existing(slug):
    res = api("GET", f"{API}?slug={slug}&status=draft,pending,private,publish,future")
    return res[0]["id"] if res else None


def push(path):
    p = parse(path)
    payload = {
        "title": p["title"],
        "slug": p["slug"],
        "status": "draft",
        "content": p["body"],
        "excerpt": p["meta"],
        # Yoast / RankMath pick these up if the plugin exposes them via REST.
        "meta": {
            "_yoast_wpseo_title": p["seo_title"],
            "_yoast_wpseo_metadesc": p["meta"],
            "rank_math_title": p["seo_title"],
            "rank_math_description": p["meta"],
        },
    }
    existing = find_existing(p["slug"])
    if existing:
        res = api("POST", f"{API}/{existing}", payload)
        action = "updated"
    else:
        res = api("POST", API, payload)
        action = "created"
    print(f"{action:8} draft #{res['id']:<6} /{p['slug']}/  {res['link']}")


def main():
    wanted = set(sys.argv[1:])
    files = sorted(glob.glob(os.path.join(os.path.dirname(__file__), "..", "pages", "*.html")))
    for f in files:
        name = os.path.basename(f)[:-5]
        if wanted and name not in wanted:
            continue
        push(f)


if __name__ == "__main__":
    main()
