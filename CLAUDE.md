# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A single-page personal Hebrew (RTL) landing site for Ohad Shpindel. Vanilla HTML/CSS/JS,
**zero dependencies, no build step, no package.json**. Deployed as a Cloudflare Worker
serving static assets. `public/` is the only directory that ships.

`README.md` is in Hebrew and is the authoritative guide for *editing content* and for the
arcade layer's behavior. Read it before touching `content.js` or `arcade.js`.

## Commands

```bash
# Local dev — plain static server (fastest loop)
cd public && python3 -m http.server 8099        # → http://localhost:8099

# Local dev — with Cloudflare `_headers` (CSP, cache) applied
npx wrangler pages dev public                   # → http://localhost:8788

# Deploy
npx wrangler deploy                             # first time: npx wrangler login
```

No linter, no test framework. Verification is manual — see the "בדיקות" section at the
end of `README.md` for the checklist (tab switching, deep links, back button, unknown
hash, form validation, reduced-motion).

In Cloudflare's git-connected build settings, the deploy command must be
`npx wrangler deploy`, **not** `wrangler pages deploy` — the injected build token is
scoped to Workers, and Pages deploys fail with `Authentication error [code: 10000]`.

## Architecture

### Module pattern: globals, not ES modules

Every JS file is a classic script (no `type="module"`) wrapping an IIFE that assigns to a
single global const: `Render`, `Contact`, `Motion`, `Photos`, `Arcade`. `content.js`
exposes the plain object `SITE_CONTENT`. **Load order in `index.html` is the dependency
graph** — `content.js` first, `router.js` last, because `router.js` is the boot entry
point and calls everything else's `init()`.

There is no bundler, so adding a file means adding a `<script>` tag in the right position.

### Content is data; nothing else needs editing

`public/assets/js/content.js` (`SITE_CONTENT`) holds all copy, nav tabs, projects,
support/payment options, and arcade config. `render.js` turns it into DOM. Changing site
text should never require touching HTML, CSS, or other JS.

Two conventions `render.js` enforces on content values:
- A string starting with `TODO_` is treated as **unset** (`has()` / `isTodo()`), so
  unfilled fields render as nothing rather than broken links. The site is intentionally
  functional before content is filled in.
- Paragraph strings support `\n` → `<br>` and markdown-style `[text](url)` links. All
  content is HTML-escaped *first*, then those two transforms add the only tags. Keep new
  rich-text features on that side of the escape.

### Routing: hash tabs over static panes

`index.html` is a shell containing four empty `<section class="view" id="view-*">` panes
plus header/footer placeholders. `render.js` fills them once at boot; `router.js` then
only toggles visibility.

- Routes are derived from `SITE_CONTENT.nav` — `const ROUTES = SITE_CONTENT.nav.map(n => n.id)`.
  Adding a tab means adding a nav entry, a `view-<id>` section, and a render function.
- Hash shape is `#<route>` or `#projects/<id>`. Unknown hashes fall back to the first route.
- Uses the View Transitions API where available, with a CSS fallback.
- `hashchange` also calls `Arcade.onRouteChange()`, because peeking characters are
  anchored to elements in the outgoing view.

### The arcade layer (`arcade.js` / `arcade.css`)

~2200 lines, by far the largest file: pixel-grid sprites (no image files) with physics,
a hammer tool that shatters both text and characters, and a cat that pathfinds to real
DOM elements and jumps onto them. Density and on/off come from `SITE_CONTENT.arcade`;
user toggle persists in `localStorage` (`arcade:on`).

Two constraints to preserve:
- Under `prefers-reduced-motion` the layer is not created at all — no canvas, no buttons,
  no animation loop. Same for `motion.js`, which skips attaching listeners entirely.
- The cat's platform list is refreshed on a ~0.4s timer, not per frame. Calling
  `getBoundingClientRect` on dozens of elements at 60fps forced layout recalculation.

### Fonts: the `unicode-range` trap

The site uses Tel Aviv Eclectic no.2 as two files (Hebrew, Latin). **Each file's cmap
falsely claims coverage of the *other* script and maps it to empty glyphs** — so without
the non-overlapping `unicode-range` declarations in `base.css`, the browser never falls
back and half the text renders as zero-width-but-space-consuming blanks. This looks like
a layout bug, not a missing font. Both faces are `font-weight: 400` (single static
weight); declaring `100 900` would disable synthetic bold and flatten every heading.

Any change to font declarations must be verified in **both** scripts.

### RTL

Done structurally via CSS logical properties (`margin-inline-start`, etc.), never
`left`/`right`. New CSS should follow this — direction correctness then comes for free.

### CSS layering

`tokens.css` (colors, spacing, timing — change here) → `base.css` (reset, fonts, RTL,
reduced-motion) → `components.css` (nav, buttons, cards, form) → `views.css` (per-tab
layout) → `arcade.css`.

### Contact form

`contact.js` posts to web3forms (`SITE_CONTENT.contact.web3formsKey`). When the key is
absent or `TODO_`, the form explicitly states it isn't connected rather than silently
failing. `api.web3forms.com` is allowlisted in `_headers` under `connect-src` and
`form-action` — the CSP is strict `default-src 'self'`, so any new external endpoint
needs a `_headers` change too.

### Separate pages

`public/privacy-policy.html` is standalone (its own markup, `tokens.css` +
`privacy-policy.js`) and is not part of the SPA router.

### Downloadable reports

`public/assets/files/reports/*.html` are self-contained artifacts users download; their
chart code, images and fonts are all **inlined** in the HTML, so the file keeps working
after a parent saves it to their desktop. Each report is exported from the app and
replaced whole — edit the `.html`, never a copy of its script. (There used to be sibling
`*.js` copies of the inline script for readability; nothing loaded them and they went
stale the first time the reports were re-exported, so they were removed.)

## Caching

`_headers` deliberately sets `max-age=0, must-revalidate` on JS/CSS/`index.html`: with no
build step there are no content hashes in filenames, so any longer TTL would serve stale
code after a deploy. Fonts are `immutable`; images get a week (they can be replaced under
the same filename).
