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
- Level 6 Ratio Supermarket: `level6_shelf.csv` (products: line items and $ million amounts), `level6_ratios.csv` (numerator and denominator are shelf ids; the correct value is computed; three distractor values), `level6_verdicts.csv` (Analyst's Verdict: Healthy, Too low or Too high).

## Economy (`config.json`)
- Coins per answer: `scoring` (base, speed bonus, streak steps, cap) times `levels.N.coin_scale` (evens out long and short levels). Level bonus: `level_complete` + `per_star`.
- Shop: prices in `shop`, limits per visit in `shop.max_per_visit`.
- Perfect-run economy check: `PERFECT=1 BUY=none NOSHOTS=1 node tests/play.mjs` (prints coins at each shop visit).
