# Your Live Gaming Platform — Setup Guide (Phase 0 + Countryle)

This is Phase 1 of your platform: the full real-time pipeline (TikTok Live connection,
Test Mode, host controls, scoreboard) plus your first game, **Countryle**. Everything
below assumes zero coding knowledge — just follow the clicks in order.

You will do this **once**. After that, playing live is just: open a link → tap the gear
icon → type your TikTok username → tap Connect → tap Start Round.

---

## Part A — Put the files on GitHub

1. Go to **github.com**, log in.
2. Click the **+** icon (top right) → **New repository**.
3. Name it something like `live-games-platform`. Keep it **Public** or **Private**, either works. Don't check "Add a README" (we already have one). Click **Create repository**.
4. On the new empty repo page, click **uploading an existing file**.
5. Drag in (or use "choose your files" to pick) **everything inside this project folder** — keep the folder structure: `backend/`, `frontend/`, `render.yaml`, `.gitignore`, `README.md`. GitHub's uploader accepts whole folders dragged in at once, and this works from a phone browser too.
6. Scroll down, click **Commit changes**.

You now have the full project on GitHub.

---

## Part B — Deploy it on Render

1. Go to **render.com**, log in.
2. Click **New +** → **Web Service**.
3. Choose **Build and deploy from a Git repository**, connect your GitHub account if asked, and pick the `live-games-platform` repo you just created.
4. Render should auto-detect the settings from `render.yaml`. If it asks you to fill them in manually, use:
   - **Root Directory**: `backend`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: Free
5. Click **Create Web Service**. Wait 2–5 minutes while it builds — you'll see logs scrolling. When it says **"Live"** at the top, you're done.
6. Copy the URL Render gives you (looks like `https://live-games-platform.onrender.com`). That's your platform's link.

**Note on the free plan:** Render's free tier "sleeps" a service after 15 minutes of no traffic, and takes ~30–60 seconds to wake up on the next visit. Open your link a minute or two before you plan to go live so it's already awake. If this becomes annoying, Render's cheapest paid tier keeps it always-on for a few dollars a month — not required to get started.

---

## Part C — Play it on your phone

1. On your Android phone, open your Render URL in **Chrome**.
2. Tap the small **⚙ tab** on the right edge of the screen — this opens your private Host Controls drawer (only visible to you, it's just part of the same page).
3. Type your **TikTok username** (the one you'll go live from) into the box and tap **Connect**. You do NOT need a password — this only reads your live's public chat and gifts, it doesn't log in as you.
4. To rehearse first: flip on **Test Mode** — this fills the board with fake simulated viewer guesses so you can see everything working before you're live.
5. Tap **Start Round** to begin a Countryle round.
6. When you're happy with it, turn Test Mode off, make sure Connect shows you're linked to your TikTok username, and go live using TikTok's **"Mobile Gaming" LIVE mode** — this broadcasts your phone screen, which is this page. Your Host Controls drawer stays closed by default so viewers just see the clean game board.

---

## Part D — Your friend using it

She does **not** need to touch any code. Two options:

**Option 1 — Simplest (only if you two won't stream at the same time):**
Give her your Render link. She opens it, taps the gear icon, types *her own* TikTok username, and connects. Since it's the same server, only one of you can be actively connected at once.

**Option 2 — Her own independent copy (so you can both stream separately, anytime):**
1. She creates her own free GitHub and Render accounts (same as you did).
2. On your GitHub repo page, she clicks **Fork** (top right) to copy it into her own account — no file editing needed.
3. She repeats **Part B** above, but connecting Render to *her* forked copy.
4. She now has her own link, and uses it exactly like Part C, with her own TikTok username typed into the same Host Controls drawer.

---

## What's in this Phase 1 build

- Real-time connection to TikTok LIVE chat & gifts (`backend/tiktokConnector.js`)
- Test Mode simulator so you can rehearse offline (`backend/testSimulator.js`)
- Countryle game: guess the country, get continent / bigger-or-smaller / distance & compass-direction feedback each guess, first correct answer wins the round (`backend/gameEngine/countryle.js`, `backend/gameEngine/countries.js` — 193 countries)
- Hint system (3 tiers, each hint slightly reduces that round's points)
- Difficulty levels (Easy / Standard / Expert — changes round length; the answer pool widens further in a later pass)
- Round leaderboard (top 10) + all-time leaderboard, small-number scoring
- Gift handling that never gives any one viewer an answer-advantage — just a shared on-screen moment
- Host-typed answer box, embedded right on the game screen (no second device needed)

## What's next
Once you've tried this and it feels right, tell me and I'll build **Phase 2 — the rest of the
geography games (Worldle, Globle, Capitale, Flagle, and the others)**, reusing this same
pipeline and country dataset, then Phase 3 (word games) and Phase 4 (number games) after that.
If anything about Countryle's feel, colors, or scoring should change first, tell me that too —
easier to adjust now before the same patterns get reused everywhere else.
