# Osaka / Kyoto / Nara Event Calendar for GitHub Pages

Generated: 2026-07-07  
Trip window assumed: **October 9-21, 2026**. October 21 is marked as the departure day.

## What is included

- A static, mobile-first calendar in `index.html`.
- A day-first default view with previous/next day controls and a date dropdown.
- Compact dropdown filters for view, focus, city, and category.
- Advanced non-sticky filters for search text, hiding ongoing items, and hiding programme-TBA platforms.
- Category color coding across badges, event cards, grouped agendas, trip overview strips, and the color key.
- Source links on every event card.
- A downloadable `osaka-trip-events.ics` calendar file containing 104 importable events.
- `data/events.json` for auditing or editing the event data.
- Watchlist and omitted-item notes for sources that are useful but not fully dated for the trip window.

## Current data snapshot

- Events in app: **133**
- LGBTQ+ / Pride entries: **10**
- Programme-TBA entries: **20**
- Cities/areas represented: Kyoto, Nara, Osaka, Osaka / Kyoto, Sakai
- Categories represented: Arts Festival, Club / Jazz / Live, Concert, Exhibition / Museum, Experience / Tour, Family / Pop Culture, Food / Seasonal, Interactive / Mystery, LGBTQ+ / Pride, Music Festival, Pop Culture / Theme Park, Temple / Shrine, Theater / Dance, Theater / Performance, Traditional Festival

## Publish on GitHub Pages

1. Create a GitHub repository, for example `osaka-trip-events`.
2. Upload the contents of this folder, not the folder itself.
3. In GitHub, go to **Settings → Pages**.
4. Set the source to your main branch and root folder.
5. Open the published Pages URL once GitHub finishes deploying.

## Updating events

The live site reads `events.js`, which wraps the same data object for browser loading without a build step. The same data is mirrored in `data/events.json` for easy review.

To update data manually:

1. Edit `data/events.json`.
2. Rebuild `events.js` so it contains `window.CALENDAR_DATA = <same JSON>;`.
3. Regenerate `osaka-trip-events.ics` if calendar-import contents changed.

## Notes

This app is static. It does not call external APIs, does not track users, and does not require a build process. Programme-TBA entries are included for planning when they are useful local leads, but the UI lets you hide them quickly.
