# ShotRouter — Branding Guidelines

## Brand Overview
- Identity: professional, calm, compliance‑first utility; UI‑first with developer‑friendly CLI.
- Voice: clear, concise, trustworthy. Avoid hype; emphasize auditability and control.

## Color Palettes (Themes)
Use any of the three curated themes. Keep contrast ≥ 4.5:1 for body text.
- The Actuary’s Ledger: background `#1E2A3A`, text `#E0E0E0`, primary `#0D639C`, success `#2E8540`, AI voice `#B8860B`, error `#C70039`.
- Modern Analyst: background `#282C34`, text `#F8F8F2`, primary `#00A6A6`, secondary `#9B59B6`, highlight `#F1C40F`, error `#E67E22`.
- Seminar Slate: background `#3C3C3C`, text `#F3F3F3`, primary `#6A829B`, focus `#D4AC87`, error `#900C3F`.

## Tokens & Naming
Define tokens and avoid hardcoded colors.
- Colors: `--sr-bg`, `--sr-text`, `--sr-primary`, `--sr-accent`, `--sr-success`, `--sr-error`, `--sr-muted`.
- Spacing: `--sr-gap-1/2/3` (4/8/12px). Radius: `--sr-radius`.

## Web UI Implementation (SPA)
- Use `data-theme` on the `<html>` or app root and CSS variables. Example in `docs/brand/web/themes.css`.
- Persist choice in `localStorage` (e.g., `sr.theme`), default to Ledger.
- Apply tokens to core components: header, nav tabs, buttons, toasts, badges.

Example theme toggle (pseudo‑JS):
```
const setTheme = t => {
  document.documentElement.dataset.theme = t;
  localStorage.setItem('sr.theme', t);
};
setTheme(localStorage.getItem('sr.theme') || 'ledger');
```

## Textual (TUI) Implementation
- Use the provided `.tcss` with `.theme-ledger|analyst|seminar` classes. See `docs/brand/textual/shotrouter_themes.tcss`.
- Switch by adding/removing the theme class from the `App`.

Example (Python):
```
self.remove_class("theme-ledger", "theme-analyst", "theme-seminar")
self.add_class("theme-analyst")
```

## Logo & Assets
- Text/ASCII logo for terminals; SVG/PNG for web. Place in `docs/brand/assets/`.
- Use alt text “ShotRouter” and avoid raster scaling artifacts; prefer SVG on web.

## Accessibility
- Maintain contrast, focus outlines, and keyboard support. Offer all three themes plus a high‑contrast variant if needed.

## Legal Note (Non‑legal guidance)
- Individual colors aren’t protected; distinctive combinations in context may form trade dress. Avoid mimicking famous UIs. Consult counsel for enforcement.

