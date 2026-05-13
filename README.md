# OSINT Toolkit - Advanced Search Engine

A client-side OSINT dashboard and dork generator built with Vanilla HTML, Tailwind CSS, and JavaScript.

## Important Runtime Note

The live dashboard uses native browser `fetch()` only. Some sources can still block direct browser scraping through CORS, Cloudflare, bot checks, ad blockers, or local file-origin restrictions.

Do not open the project using `file:///`. Start a local server:

```bash
cd F:\Projects\OSINT
python -m http.server 8080
```

Then open:

```text
http://127.0.0.1:8080/index.html
```

If your browser blocks a source, the affected dashboard row will safely show `Blocked`, `Error`, or `Partial` instead of freezing.

## Fixed Issues

- Added timeout-based fetch handling with `AbortController`.
- Added safer dashboard error messages.
- Added XML parser validation for Google Trends RSS.
- Added namespace-safe extraction for `ht:approx_traffic`.
- Removed fake/random Twitter metric values.
- Added safer HTML escaping before dashboard rendering.
- Added UTF-8 safe Base64 encoding for FOFA query links.
- Updated script cache-busting versions to `v=2.1`.

## Features

- Bug bounty dork generator
- Shodan query generator
- FOFA query generator
- People search profiler
- Email exposure dorks
- Reverse image search launcher
- Client-side local activity logging
- Live dashboard rows for FOFA, URLHaus, Reddit/Trends24, and Google Trends RSS where direct browser fetch is allowed

## Author

Developed by Str1k3r0p.

## Disclaimer

This project is intended for ethical hacking, OSINT, bug bounty hunting, and educational purposes only. Always ensure you have authorization before testing targets.
