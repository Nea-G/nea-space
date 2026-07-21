# Nea's Life Planner

A personal dashboard with a calendar, gym log, school tracker, habit streaks, and to-do lists.

## Running locally

This is a build-step-free React app (React, ReactDOM, and Babel are loaded from a CDN in `index.html`).
Because the browser needs to fetch `app.js` over HTTP (not `file://`), serve the folder with any static
file server, for example:

```bash
npx serve .
```

Then open the printed `http://localhost:...` URL.

## Deploying

This is a static site (`index.html`, `styles.css`, `app.js`) — no build step. On Vercel, import this
GitHub repo and choose the "Other" framework preset (or leave it on auto-detect); no build command is
required.

## Data

All calendar events, gym logs, courses, habits, and to-dos are stored in the browser's `localStorage`
(key `life-planner-data-v1`), so your data stays on whatever device/browser you use the app in.
