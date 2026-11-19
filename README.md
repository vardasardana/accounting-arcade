# The Accounting Arcade (trial)

A browser game (Phaser 3 + Vite) for MBA/BBA financial accounting: six levels, one company (Copperleaf Coffee Ltd).

- `npm install` then `npm run dev` to play locally; `npm run build` makes the static site in `dist/`.
- Deploy: upload the **contents of `dist/`** to any static host (GitHub Pages works from a sub-path; all paths are relative).
- Questions: edit the CSV/JSON files in `public/data/` (or `dist/data/` after building). Bad rows are skipped and listed on a "Question file check" screen. The instructor console (lock icon, PIN in `config.json`) can also load a file on one device for testing.
- Class leaderboard on a Google Sheet: see `apps_script/SETUP.md`.
- Tests (need `npm run preview` running on port 4173): `node tests/play.mjs` (full play-through and screenshots), `node tests/broken_csv.mjs`, `node tests/phone.mjs`.
