import json
import re
import ssl
import time
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "data" / "live-feeds.json"

UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/120.0 Safari/537.36"
)

CTX = ssl.create_default_context()


def fetch_text(url, accept="*/*", timeout=30):
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": UA,
            "Accept": accept,
            "Accept-Language": "en-US,en;q=0.9",
            "Cache-Control": "no-cache",
        },
    )

    with urllib.request.urlopen(req, timeout=timeout, context=CTX) as response:
        raw = response.read()
        charset = response.headers.get_content_charset() or "utf-8"
        return raw.decode(charset, errors="replace")


def ok(items):
    return {
        "status": "ok" if items else "empty",
        "items": items,
        "error": None if items else "No items parsed.",
    }


def fail(exc):
    return {
        "status": "error",
        "items": [],
        "error": str(exc)[:500],
    }


class LinkTextParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.links = []
        self._href = None
        self._text = []

    def handle_starttag(self, tag, attrs):
        if tag.lower() == "a":
            attrs = dict(attrs)
            self._href = attrs.get("href")
            self._text = []

    def handle_data(self, data):
        if self._href:
            self._text.append(data)

    def handle_endtag(self, tag):
        if tag.lower() == "a" and self._href:
            text = " ".join(self._text).strip()
            self.links.append((self._href, text))
            self._href = None
            self._text = []


def get_fofa():
    html = fetch_text("https://fofa.info/", accept="text/html")
    parser = LinkTextParser()
    parser.feed(html)

    items = []
    seen = set()

    for href, text in parser.links:
        if "/result?qbase64=" not in href:
            continue

        title = re.sub(r"\s+", " ", text).strip()

        if not title or len(title) > 90 or title in seen:
            continue

        seen.add(title)

        items.append(
            {
                "title": title,
                "metric": "FOFA",
                "url": urllib.parse.urljoin("https://fofa.info/", href),
            }
        )

        if len(items) >= 10:
            break

    return ok(items)


def get_urlhaus():
    text = fetch_text(
        "https://urlhaus-api.abuse.ch/v1/payloads/recent/",
        accept="application/json",
    )

    data = json.loads(text)
    payloads = data.get("payloads", [])

    items = []

    for payload in payloads[:10]:
        tags = payload.get("tags") or []
        title = (
            payload.get("file_name")
            or payload.get("signature")
            or payload.get("sha256_hash")
            or payload.get("file_type")
            or "Recent payload"
        )

        items.append(
            {
                "title": title,
                "tag": tags[0] if tags else payload.get("file_type", "payload"),
                "firstseen": (payload.get("firstseen") or "recent").split(" ")[0],
                "url": payload.get("urlhaus_reference")
                or "https://urlhaus.abuse.ch/browse/",
            }
        )

    return ok(items)


def get_reddit():
    text = fetch_text(
        "https://www.reddit.com/r/cybersecurity/hot.json?limit=10",
        accept="application/json",
    )

    data = json.loads(text)
    items = []

    for child in data.get("data", {}).get("children", []):
        post = child.get("data", {})

        if post.get("stickied"):
            continue

        items.append(
            {
                "title": post.get("title", "Reddit post"),
                "metric": str(post.get("ups", 0)),
                "url": "https://www.reddit.com" + post.get("permalink", ""),
                "platform": "Reddit",
            }
        )

        if len(items) >= 5:
            break

    return ok(items)


def get_trends24():
    html = fetch_text("https://trends24.in/united-states/", accept="text/html")

    matches = re.findall(
        r'<a[^>]+href="([^"]+)"[^>]*>(.*?)</a>',
        html,
        flags=re.I | re.S,
    )

    items = []
    seen = set()

    for href, title in matches:
        title = re.sub(r"<.*?>", "", title)
        title = re.sub(r"\s+", " ", title).strip()

        if not title or title in seen or len(title) > 80:
            continue

        if not title.startswith("#") and len(items) < 3:
            continue

        seen.add(title)

        items.append(
            {
                "title": title,
                "metric": "Trend",
                "url": urllib.parse.urljoin("https://trends24.in/", href),
                "platform": "X/Twitter",
            }
        )

        if len(items) >= 5:
            break

    return ok(items)


def get_google_trends():
    xml = fetch_text(
        "https://trends.google.com/trending/rss?geo=US",
        accept="application/rss+xml,application/xml,text/xml",
    )

    root = ET.fromstring(xml)
    items = []

    for item in root.findall(".//item")[:10]:
        title = item.findtext("title") or "Google trend"
        link = item.findtext("link") or "https://trends.google.com/trending"
        traffic = "Hot"

        for child in item:
            if child.tag.endswith("approx_traffic"):
                traffic = (child.text or "Hot").replace("+", "")

        items.append(
            {
                "title": title,
                "traffic": traffic,
                "url": link,
            }
        )

    return ok(items)


def main():
    collectors = {
        "fofa": get_fofa,
        "urlhaus": get_urlhaus,
        "reddit": get_reddit,
        "trends24": get_trends24,
        "googleTrends": get_google_trends,
    }

    sources = {}

    for name, collector in collectors.items():
        try:
            print(f"[+] Fetching {name}")
            sources[name] = collector()
        except Exception as exc:
            print(f"[!] {name} failed: {exc}")
            sources[name] = fail(exc)

        time.sleep(1)

    payload = {
        "updatedAt": datetime.now(timezone.utc).isoformat(),
        "sources": sources,
    }

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")

    print(json.dumps(payload, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
