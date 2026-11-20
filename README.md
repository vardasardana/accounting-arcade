# The Accounting Arcade (trial)

A browser game (Phaser 3 + Vite) for MBA/BBA financial accounting: six levels, one company (Copperleaf Coffee Ltd).

- `npm install` then `npm run dev` to play locally; `npm run build` makes the static site in `dist/`.
- Deploy: upload the **contents of `dist/`** to any static host (GitHub Pages works from a sub-path; all paths are relative).
- Questions: edit the CSV/JSON files in `public/data/` (or `dist/data/` after building). Bad rows are skipped and listed on a "Question file check" screen. The instructor console (lock icon, PIN in `config.json`) can also load a file on one device for testing.
- Class leaderboard on a Google Sheet: see `apps_script/SETUP.md`.
- Tests (need `npm run preview` running on port 4173): `node tests/play.mjs` (full play-through and screenshots), `node tests/broken_csv.mjs`, `node tests/phone.mjs`.

## Question files (`public/data/`)
- Level 1 Concept Catch: `level1_concepts.csv` (each case file, its one correct concept, and `conflicts_with` concepts that must never share the cart with it), `level1_baskets.csv`, `level1_waves.csv` (`RANDOM` = the basket set changes every two files).
- Level 5 Cash Flow Shooting Gallery: `level5_targets.csv`. `stage` A or B: `correct` is Operating, Investing or Financing; stage C (indirect method): Add back or Deduct.
- Level 6 Ratio Supermarket: `level6_shelf.csv` (products: line items and $ million amounts), `level6_ratios.csv` (numerator and denominator are shelf ids; the correct value is computed; three distractor values), `level6_slingshot.json` (Headline Slingshot: rounds of two rival companies with ratio cards, and headlines with the answer company, category and ratio; the validator rejects headlines that name a ratio or category, and needs the two companies' values on the tested ratio to differ by at least 1.5 times).

## Questions in Google Sheets and instructor links
- `QUESTIONS_FROM_SHEET: true` makes the game read question tabs (`Q_…`) from the Apps Script web app (`QUESTIONS_URL`, or `LEADERBOARD_URL` if empty) at start-up, with a `QUESTIONS_TIMEOUT_S` limit. Fallback order: Sheet → last Sheet copy saved on the device → built-in files. Each tab falls back on its own; bad rows are skipped and shown in the instructor console. See `apps_script/SETUP.md`.
- Per-run draws: `levels.2.per_wave`, `levels.3.per_wave`, `levels.4.side_questions`, `levels.5.targets`, `levels.6.ratios`, `levels.6.sling_rounds`, `levels.6.headlines_per_round`. Adding rows adds variety, not length.
- Instructor links: `?i=<Apps Script deployment id>` (scores and questions) and `?section=<code>` (own leaderboard). `make-link.html` builds the link and a QR code in the browser (bundled `vendor/qrcode.js`, MIT).
- Tests: `tests/mock_sheet.py` (mock web app; `PORT`, `TAG`), `tests/sheet_questions.mjs`, `tests/multi.mjs`, `MOCK=1 node tests/play.mjs`.

## Economy (`config.json`)
- Coins per answer: `scoring` (base, speed bonus, streak steps, cap) times `levels.N.coin_scale` (evens out long and short levels). Level bonus: `level_complete` + `per_star`.
- Shop: prices in `shop`, limits per visit in `shop.max_per_visit`.
- Perfect-run economy check: `PERFECT=1 BUY=none NOSHOTS=1 node tests/play.mjs` (prints coins at each shop visit).
