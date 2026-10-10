# YRB's World — Command Centre

A personal operating system for building wealth: tasks, goals, businesses, a trading journal with backtesting, net worth tracking and habits. It has a glass interface, light and dark gradient themes, and installs on iPhone as an app.

**Live:** [yrb1.github.io/To-Do-app](https://yrb1.github.io/To-Do-app/)

## What's inside

| Area | Highlights |
| --- | --- |
| **Dashboard** | Net worth hero, freedom-number progress, today's focus, next 7 days (including Google events), focus timer, goal/business/habit/trading snapshots, productivity chart |
| **Tasks** | List and board views, natural-language quick add (`Call supplier tomorrow 3pm !high #Agency`), priorities, repeats, reminders, checklists, link to a business or goal |
| **Calendar** | Month grid of tasks plus live **Google Calendar** events, push tasks to Google, send to **iPhone Reminders**, export `.ics` |
| **Goals** | Number or milestone goals, progress rings, on-track/behind pace, linked tasks |
| **Businesses** | Portfolio revenue/profit, per-business page with revenue history, tasks, goals and notes |
| **Trading Journal** | Notion-style trade pages (account, strategy, pair, start/end, session, bias, trade type, timeframe, confluences, mistakes, screenshots), auto-updating account balances, prop-firm target/drawdown tracking, editable pick-lists, table and gallery views, deep analytics, FX Replay backtesting, playbook, CSV import/export |
| **Coach** | End-goal progress with ETA, built-in suggestions with one-tap tasks, optional Claude coaching with your own API key |
| **Music** | Apple Music / Spotify / YouTube player that keeps playing across pages |
| **Wealth** | Assets and liabilities, net worth history, allocation, income streams, freedom ratio, cash runway |
| **Habits** | Daily check-ins, streaks, 30-day consistency |
| **Profile** | Profile photo, light/dark/black/auto mode, 12 colourways, glass strength, integrations, preferences, backup/restore |

## Install on iPhone

1. Open the live link in **Safari**.
2. Tap **Share → Add to Home Screen**.
3. Launch YRB's World from the Home Screen. It runs full-screen and works offline.

## Integrations

Set these up under **Profile → Integrations**. Each one has step-by-step instructions in the app.

- **Google Calendar.** Paste an OAuth Client ID from Google Cloud (free, takes about 5 minutes) to see your events and push tasks. Without setup, *Send to → Google Calendar* still opens a pre-filled Google event.
- **iPhone Reminders.** Apple has no web API for Reminders, so YRB's World hands tasks to a small Apple Shortcut (*Add to Reminders*) that you build once.
- **Claude coach.** Paste a Claude API key from platform.claude.com to get personal coaching based on your data. The key stays on your device.
- **FX Replay.** Launch sessions, link each backtest session to its FX Replay URL, and import the CSV export.

## Your data

Everything is stored locally on each device in `localStorage`, with screenshots in IndexedDB. Nothing is sent to a server. To move data between devices, use **Profile → Data → Download backup / Restore backup**. Tasks from the previous version of this app are migrated automatically.

## Keyboard shortcuts

`N` new task · `T` log trade · `Ctrl/⌘ K` quick add · `/` search tasks · `1–8` switch pages · `Esc` close

## Tech

Plain HTML, CSS and JavaScript with no build step and no dependencies. It is a PWA (manifest plus service worker) and deploys to GitHub Pages as-is.

```
index.html            app shell
css/app.css           design system (glass, themes, colourways)
js/core.js            helpers, store, icons, UI kit, charts, router
js/integrations.js    Google Calendar, Reminders, .ics, notifications, images, backup, CSV
js/views/*.js         one file per page
sw.js                 offline cache (bump VERSION when deploying)
```
