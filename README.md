# Osaka / Kyoto / Nara Event Calendar for GitHub Pages

Generated: 2026-07-07  
Trip window assumed: **October 9-21, 2026**. October 21 is marked as the departure day.

## What is included

- A static, mobile-first calendar in `index.html`.
- A new **Single day** tab with previous/next controls, a dropdown for each trip date, a horizontal day shortcut strip, and a focused daily event stack.
- Filters for city, category, search text, LGBTQ+ / gay events only, free events, ongoing items, and programme-TBA platforms.
- Color-coded categories shown in the category filters, the color key, event badges, event-card borders, per-day category groups, and full-trip category strips.
- Source links on every event card.
- A downloadable `osaka-trip-events.ics` calendar file.
- `data/events.json` for auditing or editing the event data.
- Watchlist and omitted-item notes for sources that were relevant but did not have current October 2026 listings.

## Publish on GitHub Pages

1. Create a GitHub repository, for example `osaka-trip-events`.
2. Upload every file in this folder to the repository root.
3. In GitHub, go to **Settings -> Pages**.
4. Set **Build and deployment** to **Deploy from a branch**.
5. Choose the `main` branch and `/ (root)` folder.
6. Save. GitHub will publish the site at the Pages URL shown in that settings page.

## Local preview

From this folder, run:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000/`.

## Updating events

The live site reads `events.js`. The same data is also exported in `data/events.json` for easy review. To update an event manually, edit `events.js` and keep the object structure intact.

Recommended final checks closer to the trip:

- Rainbow Festa official news for parade route, stage lineup, and afterparties.
- Visit Gay Osaka, Tsunagary Cafe, and EXPLOSION for LGBTQ+ community and nightlife updates.
- Kyodo Osaka, eplus, Billboard Live Osaka, and venue pages for ticket availability.
- Nara City Tourism for temple/shrine timing changes.

## Data caution

This calendar intentionally excludes unconfirmed or stale entries. For example, USJ Halloween specifics and Nara Deer Antler Cutting were not placed in the dated calendar because current official 2026 trip-window details were not found during verification.
