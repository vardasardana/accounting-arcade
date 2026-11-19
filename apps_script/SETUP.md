# Class leaderboard on a free Google Sheet (about 10 minutes)

The game works without this: scores are then kept only on each device.
Do these steps once, and every student's finished run also appears on one shared class board.

## 1. Make the sheet
1. Go to sheets.google.com and create a blank spreadsheet. Name it, for example, **Accounting Arcade Scores**.
2. In the menu choose **Extensions → Apps Script**. A code editor opens in a new tab.

## 2. Paste the script
1. Delete whatever is in `Code.gs` in the editor.
2. Open `apps_script/Code.gs` from the game folder, copy all of it, and paste it in.
3. Click the **Save** (disk) icon.

## 3. Publish it as a web app
1. Click **Deploy → New deployment**.
2. Click the gear next to "Select type" and choose **Web app**.
3. Set **Execute as: Me** and **Who has access: Anyone**. (Students do not need a Google account; the script can only add rows and read the top scores.)
4. Click **Deploy**. Google asks you to authorise: choose your account → **Advanced → Go to (project name) → Allow**. This is your own script asking to edit your own sheet.
5. Copy the **Web app URL** (it ends in `/exec`).

## 4. Tell the game about it
1. Open `data/config.json` in the deployed game folder (in the repository: `public/data/config.json`).
2. Paste the URL between the quotes: `"LEADERBOARD_URL": "https://script.google.com/macros/s/…/exec",`
3. Set the class code for your section, e.g. `"class_code": "MBA-A-2026"`. (You can also change the class code on one device from the instructor console.)
4. Save, and publish the game again (re-upload or push to GitHub Pages).

## 5. Check it
1. Play one short run in class mode and reach the final results screen. It should say **"Saved to the class leaderboard"**.
2. A new row appears in the **Scores** tab of your sheet. The game's Leaderboard → Class tab shows the top 20.

## Good to know
- Stored per run: time, class code, first name/nickname, role, avatar number, total coins, stars, accuracy, best streak, time taken, speed and accuracy per topic. No email, no student ID (student ID is off by default in `config.json`).
- To reset a class board, delete the rows in the sheet (keep the header row).
- If you change the script later, use **Deploy → Manage deployments → Edit → Version: New version** so the URL stays the same.
- Practice runs are never sent to the sheet; only full class runs are.
