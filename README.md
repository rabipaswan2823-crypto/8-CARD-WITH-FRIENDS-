# 8 Card with Friends (v2 — Latest Rules + No-PC Phone Build Ready)

Complete **4-Player Live Card Game** with ALL latest custom rules, **Combo Turn (Multi-Action Board Play)**, **Instant Quick Play vs 3 Smart Bots**, **WebRTC Video Call Tiles**, **AES-256-GCM End-to-End Encryption**, and **No-PC Phone Build** support.

---

## All Included Rules (Latest v2)
1. **4 Players, 52 Cards, 8 Cards Each:** 1 Indicator Card reveals the **Wild Joker** (next rank up, 0 pts, usable in any Sequence/Set/Push).
2. **Empty Open Pile Start:** Turn 1 discards first and draws from Unopen Pile; Turn 2+ discards first and draws from Unopen Pile or previous Open Card.
3. **Round 1 Meld Lock:** First 4 turns lock melding and pushing (`0/4` to `4/4`).
4. **Combo Turn (Multi-Action Board Play — NEW):** From Round 2+, laying down a 3+ card Meld or Pushing onto any board meld activates **Combo Turn Active** (Discard & Draw locked). You can chain **multiple Sequences/Sets AND Push cards onto your own or other players' board melds in the SAME turn** to Mate (0 cards) or reduce points, then tap **End Turn (Done)**.
5. **Zero Hints + Strict +8 Penalty:** Invalid meld, duplicate push onto a Joker-occupied rank, or pushing beyond Ace Low/High immediately ends the round with **+8 points** to the offending player and **0** to others.
6. **1-Time Reshuffle (`Reshuffled 1/1`) & Auto Tie:** First Unopen Pile exhaustion reshuffles discards (except top card) once; second exhaustion ends the round in a **Tie (0 pts to all)**.
7. **50 / 100 / Custom (10–1000) Point Limit:** Lowest score wins when anyone reaches or crosses the limit.
8. **Instant Solo Play:** Tap **Quick Play vs 3 Smart Bots** to play immediately even without Firebase!

---

## Build on Phone Only (Zero Laptop/PC Needed!)

### Option A: Auto-Build Real `.apk` on GitHub Cloud (Free)
1. Create a free account on **github.com** using your phone browser and create a new repository (e.g. `8-card-with-friends`).
2. Upload all files from this folder into the repository (and paste your free Firebase config into `src/firebaseConfig.js` for 4-player online rooms).
3. Open the **Actions** tab in your GitHub repo -> click **Build Android APK (No PC Needed)** -> wait ~3 minutes.
4. Scroll to **Artifacts** and tap **8-Card-With-Friends-APK** to download `app-debug.apk` directly onto your phone and share on WhatsApp!

### Option B: 1-Tap Installable App via Vercel (Free, 5 Minutes)
1. Upload this project to GitHub.
2. Go to **vercel.com** on your phone, log in with GitHub, select your repository, and tap **Deploy**.
3. Open your live `https://...vercel.app` link in Chrome -> tap **3 dots -> Install App / Add to Home Screen**.
